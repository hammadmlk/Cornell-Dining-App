$.mobile.page.prototype.options.domCache = true;

var cd = {};
cd.splashTimeSpan = 3000;
cd.TIME_OUT_INTERVAL = 50;
cd.verbose = false;
cd.home = {
  init: false
};
cd.diner = {
  currentDinerId: null, // id of the diner that is about to be shown or showing
  cacheMap : []
};
cd.connect = {
  init: false
};
cd.fav;
//It seems click event is supported different on Android, and on iOS.
//Only tap is recognized by iOS devices.
cd.touchEvent = (navigator.userAgent.indexOf("iPhone")!== -1)?'tap':'click';

$(function() {
  document.addEventListener("deviceready", onDeviceReady, false);

  function onDeviceReady() {
    navigator.geolocation.getCurrentPosition(onSuccess, onError);
  }

  function onSuccess(position) {
    if (cd.verbose) console.log("location is ", position);
    cd.position = position;
    cd.latitude = cd.position.coords.latitude;
    cd.longitude = cd.position.coords.longitude;
  }

  function onError(error) {
    console.log(error);
  }

});

function getCurrentGMapLatLng(){
  return new google.maps.LatLng(cd.latitude, cd.longitude);
}

//return distance between two points in miles
function calcDistance(la1,lo1,la2,lo2){
  return google.maps.geometry.spherical.computeDistanceBetween(
    new google.maps.LatLng(la1,lo1), new google.maps.LatLng(la2, lo2)
    ) * 0.000621371;
}

function calcDistanceToMe(dest_la, dest_lo){
  return calcDistance(cd.latitude, cd.longitude, dest_la, dest_lo).toFixed(2);
}

function addLoadingMask($obj){
  if(cd.verbose) console.log('addLoadingMask' , $obj);
  $mask = $obj.children('.mask');
  if($mask.length === 0){
    $mask = ($(document.createElement('div'))).prependTo($obj);
  }
  $mask.addClass("loading mask");
  $obj.children().not('.mask').addClass('opac');
  styleMask($obj, $mask);
}

function styleMask($obj, $mask){
  if(cd.verbose) console.log('styleMask' , $obj);
  if($obj.width() === 0){
    //$obj not rendered yet
    setTimeout( function(){
      styleMask($obj, $mask)
    }, cd.TIME_OUT_INTERVAL);
    return;
  }
  setTimeout(function(){
    var maskHeight = 0;
    if(($obj.height() +$obj.offset().top > window.innerHeight) || !$obj.height()){
      maskHeight = window.innerHeight - $obj.offset().top;
      // console.log('1st', "innerheight : " + window.innerHeight, "top : "+$obj.offset().top, $obj);
    }else{
      maskHeight =$obj.height();
    } 
    // console.log("mask height", maskHeight);
    $mask.css('height', maskHeight);
    $mask.fadeIn();
  }, 300);
}

function removeLoadingMask($obj){
  $obj.children('.mask').removeClass('loading');
  $obj.children().removeClass('opac');
  $obj.children('.mask').hide();
}

function getNearByLocation(usingCache) {
  addLoadingMask($('#nearme .list-container'));

  if (!cd.position) {
    setTimeout(getNearByLocation, cd.TIME_OUT_INTERVAL);
    return;
  }
  if (usingCache) {
    setNearByData();
    return;
  }
  sendRequest({
    "uri": "get_nearby.json",
    "method": "GET",
    "data": {
      longitude: cd.longitude,
      latitude: cd.latitude
    }
  }, function(ret) {
    $.each(ret, function(index,diner){
      diner.diner_location.latitude = parseFloat(diner.diner_location.latitude, 10);
      diner.diner_location.longitude = parseFloat(diner.diner_location.longitude, 10);
      diner._diner_distance = calcDistanceToMe(diner.diner_location.latitude, diner.diner_location.longitude);
      diner._diner_time = ((diner.current_meal === "open")?"":diner.current_meal+" ") + "closes at " + diner.close_at;
      diner._diner_time = (diner._diner_time).charAt(0).toUpperCase() + diner._diner_time.substr(1);
      // console.log(index,diner)}
    });
    cd.nearbyDiners = ret;
    setNearByData();
    removeLoadingMask($('#nearme .list-container'));
  });
}

function setNearByData() {
  $('#nearme .list-container [ux\\:data^="data{diner"]').setData({
    diner: cd.nearbyDiners
  });
}

function getAllDiners(usingCache) {
  $('#all').addClass('loading');
  if (!cd.position) {
    setTimeout(getAllDiners, cd.TIME_OUT_INTERVAL);
    return;
  }
  if (usingCache) {
    setAllDinersData();
    return;
  }

  sendRequest({
    "uri": "get_all_diners.json",
    "method": "GET",
    "data": {
      longitude: cd.longitude,
      latitude: cd.latitude
    }
  }, function(ret) {
    cd.dinerList= [];
    $.each(ret, function(index,area){
      $.each(area.diners, function(i, diner){
        cd.dinerList.push({
          name : diner.diner_name,
          id : diner.diner_id});
        diner._diner_distance = calcDistanceToMe(diner.diner_location.latitude, diner.diner_location.longitude);
        if(diner.close_at === ""){
          diner._diner_time = "Closed";
        }else{
          diner._diner_time = ((diner.current_meal === "open")?"":diner.current_meal+" ") + "closes at " + diner.close_at;
        }
        diner._diner_time = (diner._diner_time).charAt(0).toUpperCase() + diner._diner_time.substr(1);
      });
    });
    cd.allDiners = ret;
    setAllDinersData();
    $('#all').removeClass('loading');
  });
}

//return "close in"+ hours:mins:secs or "open in" +hours:mins:secs, depending on the open status
function calcTime(diner){
  var currentTime = new Date();
  if(diner.isOpen){
    return "open at "+diner.close_at.substring(11);
  }else{
    return "close at "+diner.close_at.substring(11);
  }
}

function setAllDinersData() {
  $('#all [ux\\:data^="data{area"]').setData({
    area: cd.allDiners
  });
}

function searchFood(keyWord){
  cd.keyWord = keyWord;
  var keyWordArr = keyWord.split(' '),
  keyWordStr = keyWordArr.join('*');
  sendRequest({
    "uri": "search.json",
    "method": "GET",
    "data": {
      key_word: keyWordStr,
      longitude: cd.longitude,
      latitude: cd.latitude
    }
  }, function(ret, res) {
    if(cd.keyWord === keyWord){
      $.each(ret, function(i, diner){
        diner._diner_distance = calcDistanceToMe(diner.diner_location.latitude, diner.diner_location.longitude);

        $.each(keyWordArr, function(index, keyWord){
          var item = diner._item||diner.item;
          diner._item = item.replace(new RegExp("("+keyWord+")","gi"),"<span class='keyword'>$1</span>");
        });

      });
      cd.result = ret;
    }
  });
  addLoadingMask($('#result .list-container'));
  $.mobile.changePage("result.html", {
    transition: "slide"
  });
}

//fav food ftn
var KEY_FAV_FOOD_ARRAY = "favfood";
Storage.prototype.setSet = function(key, set) {
  if(! set instanceof Set) throw set+ " is not a Set." ;
  console.log("setSet : " + JSON.stringify(set.data));
  this.setItem(key, JSON.stringify(set.data));
  return set;
};
Storage.prototype.getSet = function(key) {
  return (this.getItem(key) == null)? this.setSet(key, new Set()): new Set(JSON.parse(this.getItem(key)));
};

function replaceWhiteSpace (str) {
  return str.replace(/(\s)+/g,"%20");
}


// fav food interface
function getFavFood(){
  return localStorage.getSet(KEY_FAV_FOOD_ARRAY);
}
function _getFavFoodArr(){
  return localStorage.getSet(KEY_FAV_FOOD_ARRAY).keys();
}
function getFavFoodArr(){
  return (cd.fav)?cd.fav.keys():_getFavFoodArr();
}
function formatedFavFoodArr(){
  var KEY = "favorite_food";
  var queryArray = getFavFoodArr();
  // $.each(queryArray, function(i, item){
  //   queryArray[i] = (KEY + "=" + item);
  // });
  var queryStr = replaceWhiteSpace(queryArray.join("*"));
  return queryStr;
}


function addFavFood(food){
  //TODO : optimization
  cd.fav = (cd.fav)?cd.fav:getFavFood();
  if(!cd.fav.has(food)){
    cd.fav.add(food, true);
    localStorage.setSet(KEY_FAV_FOOD_ARRAY, cd.fav);
  }
  console.log('addFavFood : cd.fav = ', cd.fav.data);
}
function removeFavFood(food){ 
  cd.fav = (cd.fav)?cd.fav:getFavFood();
  if(cd.fav.has(food)){
    cd.fav.remove(food);
    localStorage.setSet(KEY_FAV_FOOD_ARRAY, cd.fav);
  }else{
    throw "Fav Food : " + food +" is not in the array.";
  }
  console.log('removeFavFood : cd.fav = ', cd.fav.data);
}

//bind event for page splash
$(document).on('pageinit', '#splash', function() {
  if (cd.verbose) console.log("page splash inited");
  setTimeout(function() {
    $.mobile.changePage("home.html", {
      transition: "slideup"
    });
  }, cd.splashTimeSpan);
});

//init listall page
// TODO: have a look at this.. i may have used this wrongly
$(document).on('pageinit', '#listall', function() {
	var useCache = false; // ??????   <<-- i guess this should not be like this
	getAllDiners(useCache);
});


//init page home
$(document).on('pageinit', '#home', function() {
  var useCache = false;
  if (cd.home.init) {
    //use cache
    useCache = true;
    getNearByLocation(useCache);
    //getAllDiners(useCache);
    return;
  }
  cd.home.init = true;
  if (cd.verbose) console.log("home page inited");

  //prepare pages to transit to
  $.mobile.loadPage( "diner.html", { showLoadMsg: false } );
  $.mobile.loadPage( "menu.html", { showLoadMsg: false } );
  $.mobile.loadPage( "result.html", { showLoadMsg: false } );
  $.mobile.loadPage( "fav.html", { showLoadMsg: false } );
  $.mobile.loadPage( "listall.html", { showLoadMsg: false } );	
  
  //load data
  getNearByLocation(useCache);
  getAllDiners(useCache);

  function _setMapHeight(map){
    var top = $("#home #map-container").position().top;
    if(top > window.innerHeight){
      top = $("#home .list-container").position().top
    }
    $('#map-canvas').css('height', window.innerHeight - top -parseInt($('#map-container').css('marginBottom'), 10));
    if(map) google.maps.event.trigger(map, 'resize');
  }

  function initMap() {
    setTimeout(function() {
      console.log("map initialized");
      //TODO: Cached or hard-wired data in case network fail
      $('#map-container').show();
      _setMapHeight();
      var mapOptions = {
        center: new google.maps.LatLng(cd.latitude, cd.longitude),
        zoom: 17,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true
      };
      var map = new google.maps.Map(document.getElementById("map-canvas"),
        mapOptions);
      map.bounds = new google.maps.LatLngBounds();
      
      // Create DIVs to hold the customized control
      var homeControlDiv = document.createElement('div');
      var homeControl = new HomeControl(homeControlDiv, map);

      homeControlDiv.index = 1;
      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(homeControlDiv);

      var fsControlDiv = document.createElement('div');
      var fsControl = new FullScreenControl(fsControlDiv, map);

      fsControlDiv.index = 1;
      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(fsControlDiv);

      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(cd.latitude, cd.longitude),
        title: 'Current Location',
        map: map,
        icon: 'img/iter1/google-maps-pin-blue-th.png'
      });
      map.bounds.extend(new google.maps.LatLng(cd.latitude, cd.longitude));

      var diners = [];
      var i = 0;
      for (; i < cd.nearbyDiners.length; i++) {
        var diner = cd.nearbyDiners[i];
        // console.log(diner, diner.diner_location);
        diners.push({
          name: diner.diner_name,
          longitude: diner.diner_location.longitude,
          latitude: diner.diner_location.latitude,
          zIndex: i,
          desc: diner.diner_desc
        });
      }
      setMarkers(map, diners);
      cd.map = map;
    }, cd.TIME_OUT_INTERVAL);
  }
  var mapInited = false;

  /**
   * Data for the markers consisting of a name, a LatLng and a zIndex for
   * the order in which these markers should display on top of each
   * other.
   */

   var infoWindows = [];
   var infoWindow;

   function setMarkers(map, locations) {
    // Add markers to the map
    for (var i = 0; i < locations.length; i++) {
      var diner = locations[i];
      var myLatLng = new google.maps.LatLng(diner.latitude, diner.longitude);
      var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: diner.name,
        zIndex: diner.zIndex
      });
      map.bounds.extend(myLatLng);
      marker.infoWindow = getInfoWindow(diner);
      infoWindows.push(marker.infoWindow);
      google.maps.event.addListener(marker, 'click', function() {
        for (var i = 0; i < infoWindows.length; i++) {
          infoWindows[i].close();
        }
        this.infoWindow.open(map, this);
      });
      console.log(diner.latitude, diner.longitude);
    }
    map.fitBounds(map.bounds);
  }

  function getInfoWindow(diner) {
    var contentString = '<div class="map-diner" id="content">' +
    '<h1 id="firstHeading" class="firstHeading black map-dinner-name">' + diner.name + '</h1>' +
    '<div id="bodyContent">' +
    '<p>' + diner.desc + '</p>' +
    '<p class="black">Open details</p>'
    '</div>' +
    '</div>';
    var maxWidth = $('#map-canvas').width() - 80;
    // console.log(maxWidth);
    var infowindow = new google.maps.InfoWindow({
      content: contentString,
      maxWidth: maxWidth
    });
    return infowindow;
  }

  /**
   * The HomeControl adds a control to the map that simply
   * returns the user to current location. This constructor takes
   * the control DIV as an argument.
   * @constructor
   */
  function HomeControl(controlDiv, map) {
    // Set CSS styles for the DIV containing the control
    controlDiv.classList.add('map-btn-div');

    // Set CSS for the control border
    var controlUI = document.createElement('div');
    controlUI.classList.add('map-btn-ui');
    controlUI.title = 'Click to set the map to current location';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.classList.add('map-btn-text');
    controlText.innerHTML = 'Home';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: center the map to current location
    google.maps.event.addDomListener(controlUI, 'click', function() {
      map.setCenter(getCurrentGMapLatLng())
    });
  }

  /**
   * The FullScreenControl adds a control to the map that 
   * full screens the map. This constructor takes
   * the control DIV as an argument.
   * @constructor
   */
  function FullScreenControl(controlDiv, map) {
    // Set CSS styles for the DIV containing the control
    controlDiv.classList.add('map-btn-div');

    // Set CSS for the control border
    var controlUI = document.createElement('div');
    controlUI.classList.add('map-btn-ui');
    controlUI.title = 'Full-screen the map';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.classList.add('map-btn-text');
    controlText.innerHTML = 'Full-Screen';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: center the map to current location
    google.maps.event.addDomListener(controlUI, 'click', function() {
      $("#map-container").toggleClass("fullscreen");
      _setMapHeight(map);
    });
  }

  //bind events
  // this direct to a diner hall page
  $('body').on(cd.touchEvent, '.dinner', function() {
    event.preventDefault();
    //goes to a specific diner page at diner.html
    //see setDinerData function for binding the rest of data
    
    dinerName = $(this).find('h2').text();
    dinerName = dinerName ? dinerName : "Diner";
    $('[data-role=page]#diner .ui-title').text(dinerName);
    $('[data-role=page]#menu .ui-title').text(dinerName);

    addLoadingMask($('[data-role="page"]#diner div[data-role="content"]'));

    var dinerId = $(this).data("diner-id");
    cd.diner.currentDinerId = dinerId;
    if (!cd.diner.cacheMap[dinerId]){
      sendRequest({
        "uri": "get_info.json",
        "method": "GET",
        "data": {
          diner_id : dinerId
        }
      }, function(ret) {
        var pNumber = ret.Contact.phone_number;
        ret.Contact._href="tel:"+pNumber;
        ret.Contact._phone_number= "("+pNumber.substring(0,3)+") "+pNumber.substring(3,6) + "-" + pNumber.substring(6); 
        ret._images = [];
        $.each(ret.images, function(i, url){
          ret._images.push({"_url":url});
        });

        cd.diner.cacheMap[dinerId] = ret;
      });
    }
    
    $.mobile.changePage("diner.html", {
      transition: "slide"
    });

  });

$('body').on(cd.touchEvent, '.map-diner', function() {
  event.preventDefault();
  dinerName = $(this).find('.map-dinner-name').text();
  dinnerDesc = $(this).find('#bodyContent').text();
  $.mobile.changePage("diner.html", {
    transition: "slide"
  });
});

$('body').on('focus', '#search-bar', function() {
  $('#search-bar').addClass('focus');
});

$('body').on('blur', '#search-bar', function() {
  $('#search-bar').removeClass('focus');
});

$('body').on(cd.touchEvent, '#listall-icon', function() {
  $.mobile.changePage("listall.html", {
    transition: "slide"
  });
}); // end init homepage

$('body').on(cd.touchEvent, '#nearme-icon', function() {
  $(this).siblings().removeClass('active');
  $(this).addClass('active');
  $("#all").fadeOut(400, function() {
    $("#nearme").fadeIn();
  });
});

$('body').on(cd.touchEvent, '#connect-icon', function() {
  $.mobile.changePage("connect.html", {
    transition: "slide"
  });
});

//fav food entrance
$('body').on(cd.touchEvent, '#fav-icon', function() {
  addLoadingMask($('#fav-page .list-container'));  
  sendRequest({
    "uri": "get_favorite.json",
    "method": "GET",
    "data": {
      "favorite_food": formatedFavFoodArr()
    }
  }, function(ret) {
    $("#fav-page .prompt").hide();
    var favArr = [], prev = null, favMap={};
    $.each(ret, function(index, food){
      if(!favMap[food.fav_food]){
        favMap[food.fav_food] = [food]
      }else{
        favMap[food.fav_food].push(food);
      }
    });
    $.each(favMap, function(index, food){
        favArr.push({
          _food_name : index,
          _served_at : food
        })
    });

    $('#fav-page [ux\\:data^="data{fav"]').setData({
      fav: favArr
    });

    removeLoadingMask($('#fav-page .list-container'));
  });

  $.mobile.changePage("fav.html", {
    transition: "slide"
  });

});

$('body').on(cd.touchEvent, '#showmore-btn', function() {
  $(this).fadeOut();
  $('#more-dinner').slideDown();
});

$('body').on(cd.touchEvent, '#switch-btn', function() {
  //
  var mapBtn = $(this).find('#map-btn');
  var listBtn = $(this).find('#list-btn');
  if (mapBtn.hasClass("active-btn")) {
      //to list
      listBtn.removeClass("inactive-btn").addClass("active-btn");
      mapBtn.removeClass("active-btn").addClass("inactive-btn");
      $('#nearme .list-container').fadeIn();
      $('#map-container').fadeOut();
    } else {
      //to map
      mapBtn.removeClass("inactive-btn").addClass("active-btn");
      listBtn.removeClass("active-btn").addClass("inactive-btn");
      $('#nearme .list-container').fadeOut();
      $('#map-container').fadeIn();
      if (!mapInited) {
        initMap();
      }
    }
  });

$('body').on(cd.touchEvent, '.food-item', function() {
  event.preventDefault();
  var icon = $(this).siblings(".icon-fav");
  var foodName = this.innerHTML;
  if(icon.toggleClass("unfav").hasClass("unfav")){
    console.log("Dislike", foodName);
    removeFavFood(foodName);
  }else{
    console.log("Likes", foodName);
    addFavFood(foodName);
  }
});

$('body').on(cd.touchEvent, '.campus-section-header-container', function() {
  if (cd.verbose) console.log('campus section header taped');
  event.preventDefault();
  var contractor = $(this).find(".contractor");
  contractor.toggleClass('contracted');
  if (contractor.hasClass('contracted')) {
    $(this).siblings('.campus-panel').slideUp();
  } else {
    $(this).siblings('.campus-panel').slideDown();
  }
});

$('body').on('submit', '#search-bar', function(event){
  searchFood($(this).find('input').val()); 
  event.preventDefault();
  return false;
});

//diner menu
$('body').on(cd.touchEvent, '#diner .show-menu', function() {
  var menu = $(this).data("menu");
  if(!menu) return false;
  $.each(menu.menu_item, function(j, station){
    station._foods =[];
    $.each(station.items, function(k, food){
      station._foods.push({"_name":food});
    })
  });

  $('#menu [ux\\:data^="data{menu"]').setData({
    menu: menu.menu_item
  });

  var favFoodSet = getFavFoodArr();
  $.each(favFoodSet, function(i, favFood){
    $.each($('.food-item'), function(j, item){
      if(item.innerHTML=== favFood){
        $(item).siblings('div.icon-fav').removeClass('unfav');
      }
    });
  });

  $.mobile.changePage($(this).attr("href"), {
    transition: "slide"
  });
  return false;
});
});

//
$(document).on('pageshow', '#home', function(event, data) {
  if(data.prevPage[0].id === "fav-page"){
    $('[data-role="page"]#fav-page').remove();
    $.mobile.loadPage( "fav.html", { showLoadMsg: false } );
  }else if(data.prevPage[0].id === "result"){
    $('[data-role="page"]#result').remove();
  }
});


//bind events for page diner
$(document).on('pageshow', '#diner', function(event, data) {
  if(data.prevPage[0].id === "menu") return;
  // if (cd.diner.init) return;
  // cd.diner.init = true;

  if (cd.verbose) console.log("page diner shown");

  // deconstruct hours/menu owl carousel 
  if ($("#hoursAndMenuSlider").data('owl-init')){
    $("#hoursAndMenuSlider .slide").unwrap().unwrap().unwrap();
    $("#hoursAndMenuSlider").data('owl-init', false);
    $("#hoursAndMenuSlider").data('owlCarousel', null);
    console.log("Removing hours and menu slider...", $("#hoursAndMenuSlider"));
  }

  if ($("#slider").data('owl-init')){
    $("#slider .item").unwrap().unwrap().unwrap();
    $("#slider").data('owl-init', false);
    $("#slider").data('owlCarousel', null);
  }


  var initDinerSliders = function(){
    var updateDate = function(){
      var d = moment().add('days', this.currentItem).format('ddd, MMM D');
      $("#date").text(d);
      $(".section.head .btn").removeClass('disabled');
      if (this.currentItem === this.maximumItem){
        $( "#nextDate" ).addClass('disabled');
      }else if(this.currentItem === 0){
        $( "#prevDate" ).addClass('disabled');
      }
    };

    //display empty cell to correct slider
    $("#hoursAndMenuSlider .section").show();

    $("#slider").owlCarousel({
      // itemsScaleUp:true,
      pagination :false,
      autoHeight : true,
      autoPlay: 5000
    });

    $("#hoursAndMenuSlider").owlCarousel({
      singleItem : true,
      pagination :false,
      autoHeight : true,
      afterMove: updateDate,
      rewindNav : false,
      afterInit: updateDate
    });

    //get carousel instance data and store it in variable owl
    var owl = $("#hoursAndMenuSlider").data('owlCarousel');
    $( "#nextDate" ).click(function() {
      owl.next();
    });
    $( "#prevDate" ).click(function() {
      owl.prev();
    });
  }

  setDinerData(initDinerSliders);
  
  // if (cd.diner.init) return;
  // cd.diner.init = true;
});
function setDinerData(cb){
  if(!cd.diner.cacheMap[cd.diner.currentDinerId]){
    setTimeout(function(){
      setDinerData(cb);
    }, cd.TIME_OUT_INTERVAL);
    return; 
  }
  // console.log('set diner data', cd.diner.cacheMap[cd.diner.currentDinerId]);
  $('#diner [ux\\:data^="data{diner"]').setData({
    diner: cd.diner.cacheMap[cd.diner.currentDinerId]
  });
  cb();
  removeLoadingMask($('[data-role="page"]#diner div[data-role="content"]'));
}

//bind events for page connect
$(document).on('pageinit', '#connect', function() {
  if (cd.connect.init) return;
  cd.connect.init = true;
  $('form#connect').validate({
    rules: {
      netid: {
        required: true
      },
      message: {
        required: true
      }
    },
    submitHandler: function(form) {
      if (cd.verbose) console.log("validate after");
      sendRequest({
        "uri": "comment.json",
        "method": "POST",
        "data": {
          netID: replaceWhiteSpace(form["netid"].value),
          commentContent: replaceWhiteSpace(form["message"].value),
          hallID: replaceWhiteSpace(form["facility"].value)
        }
      }, function(ret, res) {
        $("#popupDialog").popup();
        $("#popupDialog").popup("open");
        console.log(form);
        $(form).find("input, select, textarea").val("");
        $(form).find(".ui-select .ui-btn-text").text("Select a Diner");
      }, function(ret, res){
        console.log("Failed to comment");
      });
      return false;
    }
  });

  $('#select-facility [ux\\:data^="data{options"]').setData({
    options: cd.dinerList
  });

});

//search data
function setSearchResult(){
  if(!cd.result) {
    setTimeout(setSearchResult, cd.TIME_OUT_INTERVAL);
    return;
  }
  if(cd.result.length !== 0){
    $('.prompt').hide();
    $('#result [ux\\:data^="data{diner"]').setData({
      diner: cd.result
    });
  }else{
    $('#result h2').hide();
    $('#result .prompt').show();
  }
  // delete cd.result;
  console.log("removing");
  removeLoadingMask($('#result .list-container'));
}

$(document).on('pageshow', '#result', function() {
  console.log("showing result page");
  $('#result .keyword').text(cd.keyWord);
  addLoadingMask($('#result .list-container'));
  setSearchResult();
});


//bind events for page connect
$(document).on('pageshow', '#menu', function() {
  console.log("showing menu");

});

//set fav data
function setFavData(){
  if(!cd.result) {
    setTimeout(setFavData, cd.TIME_OUT_INTERVAL);
    return;
  }
  if(cd.result.length !== 0){
    $('#result [ux\\:data^="data{diner"]').setData({
      diner: cd.result
    });
  }else{
    $('#result h2').hide();
    $('#result .prompt').show();
  }
  // delete cd.result;
  console.log("removing");
  removeLoadingMask($('#result .list-container'));
}

$(document).on('pageshow', '#fav-page', function() {
  console.log("showing fav page");
  // $('#result .keyword').text(cd.keyWord);
  addLoadingMask($('#result .list-container'));
  setFavData();
});



