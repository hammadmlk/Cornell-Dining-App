$.mobile.page.prototype.options.domCache = true;

var cd = {};
cd.splashTimeSpan = 4000;
cd.TIME_OUT_INTERVAL = 50;
cd.verbose = true;
cd.home = {
  init: false
};
cd.diner = {
  currentDinerId: null, // id of the diner that is about to be shown or showing
  cacheMap : []
};
cd.nutrition = {
  init: false
};
cd.connect = {
  init: false
};

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
  console.log('addLoadingMask' , $obj);
  $mask = $obj.children('.mask');
  if($mask.length === 0){
    $mask = ($(document.createElement('div'))).prependTo($obj);
  }
  $mask.addClass("loading mask");
  $obj.children().not('.mask').addClass('opac');
  styleMask($obj, $mask);
}

function styleMask($obj, $mask){
  console.log('styleMask' , $obj);
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
        diner._diner_time = calcTime(diner);
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
  sendRequest({
    "uri": "search.json",
    "method": "GET",
    "data": {
      key_word: keyWord,
      longitude: cd.longitude,
      latitude: cd.latitude
    }
  }, function(ret, res) {
    if(cd.keyWord === keyWord){
      $.each(ret, function(i, diner){
        diner._diner_distance = calcDistanceToMe(diner.diner_location.latitude, diner.diner_location.longitude);
      });
      cd.result = ret;
    }
  });
  addLoadingMask($('#result .list-container'));
  $.mobile.changePage("result.html", {
    transition: "slide"
  });
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

//init page home
$(document).on('pageinit', '#home', function() {
  var useCache = false;
  if (cd.home.init) {
    //use cache
    useCache = true;
    getNearByLocation(useCache);
    getAllDiners(useCache);
    return;
  }
  cd.home.init = true;
  if (cd.verbose) console.log("home page inited");

  //prepare pages to transit to
  $.mobile.loadPage( "diner.html", { showLoadMsg: false } );
  $.mobile.loadPage( "menu.html", { showLoadMsg: false } );
  $.mobile.loadPage( "result.html", { showLoadMsg: false } );

  //load data
  getNearByLocation(useCache);
  getAllDiners(useCache);

  function initMap() {
    setTimeout(function() {
      console.log("map initialized");
      //TODO: Cached or hard-wired data in case network fail
      $('#map-container').show();
      var mapOptions = {
        center: new google.maps.LatLng(cd.latitude, cd.longitude),
        zoom: 17,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      var map = new google.maps.Map(document.getElementById("map-canvas"),
        mapOptions);
      map.bounds = new google.maps.LatLngBounds();

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

  //bind events
  // this direct to a diner hall page
  $('body').on('tap', '.dinner', function() {
    event.preventDefault();
    //goes to a specific diner page at diner.html
    
    //see function setDinerData
    
    dinnerName = $(this).find('h2').text();
    dinnerDesc = $(this).find('.dinner-desc').text();
    
    dinnerName = dinnerName ? dinnerName : "Dinner";

    $('[data-role=page]#diner .ui-title').text(dinnerName);
    // $('[data-role=page]#diner .desc').text(dinnerDesc);
    // 
    addLoadingMask($('[data-role="page"]#diner div[data-role="content"]'));

    var dinerId = $(this).attr("data-diner-id");
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
        ret._menu = {};
        $.each(ret.menu, function(index, menu){
          menu.meal = menu.meal.trim();
          ret._menu[menu.meal] = menu.menu_item;
        });
        cd.diner.cacheMap[dinerId] = ret;
      });
    }
    
    $.mobile.changePage("diner.html", {
      transition: "slide"
    });

  });

$('body').on('tap', '.map-diner', function() {
  event.preventDefault();
  dinnerName = $(this).find('.map-dinner-name').text();
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

$('body').on('tap', '#listall-icon', function() {
  $(this).siblings().removeClass('active');
  $(this).addClass('active');
  $("#nearme").fadeOut(400, function() {
    $("#all").fadeIn();
  });
});

$('body').on('tap', '#nearme-icon', function() {
  $(this).siblings().removeClass('active');
  $(this).addClass('active');
  $("#all").fadeOut(400, function() {
    $("#nearme").fadeIn();
  });
});

$('body').on('tap', '#connect-icon', function() {
  $.mobile.changePage("connect.html", {
    transition: "slide"
  });
});

$('body').on('tap', '#fullscreen-btn', function() {
  alert("Full screen the map.");
});

$('body').on('tap', '#showmore-btn', function() {
  $(this).fadeOut();
  $('#more-dinner').slideDown();
});

$('body').on('tap', '#switch-btn', function() {
  //
  var mapBtn = $(this).find('#map-btn');
  var listBtn = $(this).find('#list-btn');
  if (mapBtn.hasClass("active-btn")) {
      //to list
      listBtn.removeClass("bigred").addClass("active-btn");
      mapBtn.removeClass("active-btn").addClass("bigred");
      $('#nearme .list-container').fadeIn();
      $('#map-container').fadeOut();
    } else {
      //to map
      mapBtn.removeClass("bigred").addClass("active-btn");
      listBtn.removeClass("active-btn").addClass("bigred");
      $('#nearme .list-container').fadeOut();
      $('#map-container').fadeIn();
      if (!mapInited) {
        initMap();
      }
    }
  });

$('body').on('tap', '.menu-diner', function() {
  event.preventDefault();
  menudiner = $(this).text();
  $.mobile.changePage("nutrition.html", {
    transition: "slide"
  });
});

$('body').on('tap', '.campus-section-header', function() {
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
$('body').on('tap', '.menu', function() {
  cd.diner.currentMenu = $(this).find('.highlight').text().trim();
  console.log(cd.diner.currentMenu);
  // debugger;
  $('#menu div[data-role="header"] h1').text(cd.diner.currentMenu);
  $('#menu .menu-header').text("Today's " + cd.diner.currentMenu +" Menu");
  $('#menu [ux\\:data^="data{menu"]').setData({
    menu: cd.diner.cacheMap[cd.diner.currentDinerId]._menu[cd.diner.currentMenu]
  });
});
});

//bind events for page diner
$(document).on('pageshow', '#diner', function() {
  // if (cd.diner.init) return;
  // cd.diner.init = true;
	
  console.log("HAMMAD")		; 
  $("#slider").owlCarousel({		 
	  //autoPlay: 3000, //Set AutoPlay to 3 seconds
	  pagination: false,
	  //items : 4,
	  //itemsDesktop : [1199,3],
	  //itemsDesktopSmall : [979,3]
  });

  if (cd.verbose) console.log("page diner shown");
  setDinerData();
  // dinnerName = dinnerName ? dinnerName : "Dinner";
  // $('.ui-title').text(dinnerName);
  // $('.desc').text(dinnerDesc);
  // 
  // if (cd.diner.init) return;
  // cd.diner.init = true;
});
function setDinerData(){
  if(!cd.diner.cacheMap[cd.diner.currentDinerId]){
    setTimeout(setDinerData, cd.TIME_OUT_INTERVAL);
    return; 
  }
  console.log('set diner data', cd.diner.cacheMap[cd.diner.currentDinerId]);
  $('#diner [ux\\:data^="data{diner"]').setData({
    diner: cd.diner.cacheMap[cd.diner.currentDinerId]
  });
  removeLoadingMask($('[data-role="page"]#diner div[data-role="content"]'));
}


//bind events for page nutrition
$(document).on('pageinit', '#nutrition', function() {
  if (cd.nutrition.init) return;
  cd.nutrition.init = true;
  if (cd.verbose) console.log("page nutrition inited");
  $('h2.diner').text(menudiner);
});

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
          netID: form["netid"].value,
          commentContent: form["message"].value,
          hallID: form["facility"].value
}
      }, function(ret, res) {
        $("#popupDialog").popup();
        $("#popupDialog").popup("open");
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