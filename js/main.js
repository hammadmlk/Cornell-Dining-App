$.mobile.page.prototype.options.domCache = true;

var cd = {};
cd.SplashScreenTimeSpan = 3000;         //Time splash screen lasts
cd.TIME_OUT_INTERVAL = 50;              //Interval for checking whether data is returned 
cd.GEO_TIME_OUT_INTERVAL = 5000;        //Interval for updating geolocation, note that this update does not directly affect any other data yet, but updated location will be looked at when updating data
cd.prevLocation = cd.defaultLocation = {
  latitude : 42.27219,
  longitude:-76.28418
};
cd.verbose = false;                      //Set to true to enable debugging information
cd.home = {
  init: false
};
cd.diner = {
  currentDinerId: null,                  // id of the diner that is about to be shown or showing
  cacheMap : []                          // keeps a local copy of data for every diner that is requested for
};
cd.connect = {
  init: false
};
cd.fav;

cd.isIOS = (navigator.userAgent.indexOf("iPhone")!== -1);

//Click event is supported different on Android, and on iOS.
//Only tap is recognized by iOS devices.
//Google map uses only 'click' on every platform
cd.touchEvent = cd.isIOS?'tap':'click';

//Strings should be listed in dictionary, and be used as variable 
cd.dictionary ={
  fullScreenBtnTxt   : "Full-Screen",                         //text for sizing button when the map is normal size
  smallScreenBtnTxt  : "Smaller",                             //text for sizing button when the map is full-screened
  goToCurrentBtnTxt  : "Home",                                //text for centering the map to current location
  favFooDNotFoundTxt : "Not served anywhere in this month :(",//prompt when no favorite food is found
  closedEatery       : "Closed all day"
}

$(function() {
  document.addEventListener("deviceready", onDeviceReady, false);

  function onDeviceReady() {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {timeout: cd.GEO_TIME_OUT_INTERVAL});

    document.addEventListener("pause", onPause, false);
    document.addEventListener("resume", onResume, false);
  }

  function onSuccess(position) {
    if (cd.verbose) console.log("Get Geolocation successful, the location is ", position);
    cd.prevLocation = position.coords;
    cd.position = position.coords;
    cd.latitude = cd.position.latitude;
    cd.longitude = cd.position.longitude;

    // setTimeout(function(){
    //   navigator.geolocation.getCurrentPosition(onSuccess, onError, {timeout: cd.GEO_TIME_OUT_INTERVAL});
    // }, cd.GEO_TIME_OUT_INTERVAL);
  }

  function onError(error) {
    if (cd.verbose) console.log("Get Geolocation failed", error);
    cd.position = cd.prevLocation;
    cd.latitude = cd.position.latitude;
    cd.longitude = cd.position.longitude;    

    // setTimeout(function(){
    //   navigator.geolocation.getCurrentPosition(onSuccess, onError, {timeout: cd.GEO_TIME_OUT_INTERVAL});
    // }, cd.GEO_TIME_OUT_INTERVAL);
  }



  function onPause(){
    console.log("on Pasue");
    if(cd.MapitTimer){
      clearTimeout(cd.MapitTimer);
    }
  }

  function onResume(){
    console.log("on Resume");
  }

});

function getCurrentGMapLatLng(){
  return new google.maps.LatLng(cd.latitude, cd.longitude);
}

//return distance between two points in MILES
function calcDistance(la1,lo1,la2,lo2){
  return google.maps.geometry.spherical.computeDistanceBetween(
    new google.maps.LatLng(la1,lo1), new google.maps.LatLng(la2, lo2)
    ) * 0.000621371;
}

function calcDistanceToMe(dest_la, dest_lo){
  return calcDistance(cd.latitude, cd.longitude, dest_la, dest_lo).toFixed(2);
}

// Add a loading mask on passed in jquery object $obj
// Should be used to indicate the progress when loading async data
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

// Auxillary function of addLoadingMask
// Used to compute styling for the mask
function styleMask($obj, $mask){
  if($obj.width() === 0){
    //$obj not rendered yet
    setTimeout( function(){
      styleMask($obj, $mask)
    }, cd.TIME_OUT_INTERVAL);
    return;
  }
  setTimeout(function(){
    var maskHeight = 0;
    if(($obj.height() +$obj.offset().top > window.innerHeight)
    //if only a part of the $obj is visible in the current window
      || !$obj.height()
    //or if the obj has no content or is hidden
      ){
      //compute the height based on the difference between window height and top position of the obj
      maskHeight = window.innerHeight - $obj.offset().top;
    }else{
      //$obj is totally visible in the current window, set the mask of height of $obj will be enough to cover the entire obj
      maskHeight =$obj.height();
    } 
    $mask.css('height', maskHeight);
    $mask.fadeIn();
  }, 300);
}

// Remove the loading mask off the jquery object $obj
function removeLoadingMask($obj){
  $obj.children('.mask').removeClass('loading');
  $obj.children().removeClass('opac');
  $obj.children('.mask').hide();
}

function getNearByLocation() {
  addLoadingMask($('#nearme .list-container'));

  if (!cd.position) {
    setTimeout(getNearByLocation, cd.TIME_OUT_INTERVAL);
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
    if(cd.nearbyDiners.length === 0) $('#home').find(".ux-no-open-prompt").fadeIn();
    removeLoadingMask($('#nearme .list-container'));
  });
}

function setNearByData() {
  $('#nearme .list-container [ux\\:data^="data{diner"]').setData({
    diner: cd.nearbyDiners
  });
}

function getAllDiners(usingCache) {
  addLoadingMask($('#all'));
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
    removeLoadingMask($('#all'));
  });
}

function _getAllDinersArr(){
  var ret = [];
  $.each(cd.allDiners, function(index, section){
    $.each(section.diners, function(i, diner){
      ret.push(diner);
    })
  });
  return ret;
}

function setAllDinersData() {
  $('#all [ux\\:data^="data{area"]').setData({
    area: cd.allDiners
  });

  $('#home .ux-suggestions [ux\\:data^="data{diner"]').setData({
    diner: _getAllDinersArr()
  });
}

function searchFood(keyWord){
  cd.keyWord = keyWord;
  var rawKeyWordArr = keyWord.split(' '),
  keyWordArr = [];

  $.each(rawKeyWordArr, function(i, key){
    if(key!=="") keyWordArr.push(key);
  });

  var keyWordStr = keyWordArr.join('*');
  sendRequest({
    "uri": "search.json",
    "method": "GET",
    "data": {
      key_word: keyWordStr,
      longitude: cd.longitude,
      latitude: cd.latitude
    }
  }, function(ret, res) {
    var keyWordTagStart = "<span class='keyword'>",
     keyWordTagEnd = "</span>",
     keyWordTagStartPH = "%!", // placeholders used in 1st pass for highlighting key words 
     keyWordTagEndPH = "%@"

    if(cd.keyWord === keyWord){
      $.each(ret, function(i, diner){
        diner._diner_distance = calcDistanceToMe(diner.diner_location.latitude, diner.diner_location.longitude);
        diner._item = $("<p>"+diner.item+"</p>").text();
        $.each(keyWordArr, function(index, keyWord){
          var item = diner._item||diner.item;
           // diner._item = item.replace(new RegExp("([^<]*)?("+keyWord+")([^>]*)?","gi"),"$1<span class='keyword'>$2</span>$3");
          diner._item = item.replace(new RegExp("("+keyWord+")", "gi"), keyWordTagStartPH + "$1" + keyWordTagEndPH);
        });
        diner._item = diner._item.replace(new RegExp(keyWordTagStartPH,"g"), keyWordTagStart).replace(new RegExp(keyWordTagEndPH,"g"), keyWordTagEnd);

      });
      cd.result = ret;
    }else{
      console.error(cd.keyWord, keyWord);
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
  this.setItem(key, JSON.stringify(set.data));
  return set;
};

//Always return a set
//Even when no set currently matches the key, a new set will be created and returned.
Storage.prototype.getSet = function(key) {
  return (this.getItem(key) == null)? this.setSet(key, new Set()): new Set(JSON.parse(this.getItem(key)));
};

function replaceWhiteSpace (str) {
  return str.replace(/(\s)+/g,"%20");
}

//Due to chaotic data format stored in server, this function has to be used to 
//traslate '%A0', the escaped char for '&nbsp;', into %26nbsp.
// '&' needs to be escaped as the entire string will be passed in GET request as a single param, where params are joint with '&'
// %26 will be translated back on server-side, and the whole string, such as 'Beans & Greens&nbsp;&nbsp;' is used to perform a query in database
function replaceEscapedHTMLSpace (str) {
  return str.replace(/%A0/g,"%26nbsp;");
}

// Translates local stored food name to the format used by server
// "Beans & Greens  " -> Beans & Greens&nbsp;&nbsp;
// TODO : remote server should clean and format the data properly,
//        either all specail chars are translated, or none of them is.
//        e.g. "Beans & Greens&nbsp;&nbsp;" should be either
//        "Beans & Greens  ", or "Beans&nbsp;&amp;&nbsp;Greens&nbsp;&nbsp;"
function restoreFavFoodFormat(localName){
  return unescape(escape(localName).replace(/%A0/g,"&nbsp;"));
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
  $.each(queryArray, function(i, item){
    queryArray[i] = replaceEscapedHTMLSpace(escape(queryArray[i]));
  });
  var queryStr = (queryArray.join("*"));
  return queryStr;
}

function addFavFood(food){
  cd.fav = (cd.fav)?cd.fav:getFavFood();
  if(!cd.fav.has(food)){
    cd.fav.add(food, true);
    localStorage.setSet(KEY_FAV_FOOD_ARRAY, cd.fav);
  }
  if(cd.verbose)console.log('addFavFood '+ food+'. After additon, cd.fav = ', cd.fav.data);
}
function removeFavFood(food){ 
  cd.fav = (cd.fav)?cd.fav:getFavFood();
  if(cd.fav.has(food)){
    cd.fav.remove(food);
    localStorage.setSet(KEY_FAV_FOOD_ARRAY, cd.fav);
  }else{
    throw "Fav Food : " + food +" is not in the array.";
  }
  if(cd.verbose)console.log('removeFavFood '+food +'. After removal, cd.fav = ', cd.fav.data);
}

//bind event for page SplashScreen
$(document).on('pageinit', '#SplashScreen', function() {
  if (cd.verbose) console.log("page SplashScreen inited");
  setTimeout(function() {
    $.mobile.changePage("home.html", {
      transition: "slideup"
    });
  }, cd.SplashScreenTimeSpan);
});

//init listall page
// TODO: have a look at this.. i may have used this wrongly
$(document).on('pageinit', '#listall', function() {
	var useCache = false; // ??????   <<-- i guess this should not be like this
	getAllDiners(useCache);
});

var favArr = [], favMap={};

//init page home
$(document).on('pageinit', '#home', function() {
  if (cd.verbose) console.log("home page inited");

  //prepare pages to transit to
  $.mobile.loadPage( "diner.html", { showLoadMsg: false } );
  $.mobile.loadPage( "menu.html", { showLoadMsg: false } );
  $.mobile.loadPage( "result.html", { showLoadMsg: false } );
  $.mobile.loadPage( "fav.html", { showLoadMsg: false } );
  $.mobile.loadPage( "listall.html", { showLoadMsg: false } );	
  
  $('#home').find(".ux-no-open-prompt").hide();
  //load data
  getNearByLocation();

  // Calculate and set the height of Google Map
  // Used when initing the map and toggling full-screen
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
      if(cd.verbose) console.log("map initialized");
      //TODO: Cached or hard-wired data in case network fail
      $('#map-container').show();
      _setMapHeight();
      var mapOptions = {
        center: new google.maps.LatLng(cd.latitude, cd.longitude),
        zoom: 17,                                                     //initial zoom value, may be changed when later extending map's bound
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

      //add a marker for current location
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(cd.latitude, cd.longitude),
        title: 'Current Location',
        map: map,
        icon: 'img/google-maps-pin-blue-th.png'
      });
      map.bounds.extend(new google.maps.LatLng(cd.latitude, cd.longitude));

      //Format data, and add a marker for each open nearby diner
      //TODO : Add validation of whether the data is ready
      //       Now if the data's not ready when initing the map, 
      //       the data for nearby won't be set after data is returned
      var diners = [];
      var i = 0;
      for (; i < cd.nearbyDiners.length; i++) {
        var diner = cd.nearbyDiners[i];
        diners.push({
          name: diner.diner_name,
          id : diner.diner_id,
          longitude: diner.diner_location.longitude,
          latitude: diner.diner_location.latitude,
          zIndex: i,
          desc: diner.diner_desc
        });
      }

      setMarkers(map, diners);
      cd.map = map;
      mapInited = true;
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

      //bind event for every diner's marker
      //Only one info window is kept open
      google.maps.event.addListener(marker, 'click', function() {
        for (var i = 0; i < infoWindows.length; i++) {
          infoWindows[i].close();
        }
        this.infoWindow.open(map, this);
      });
    }
    map.fitBounds(map.bounds);
  }

  function getInfoWindow(diner) {
    var contentString = '<div class="map-diner ux-diner" data-diner-id="'+ diner.id +'">'+
    '<h1 class="ux-diner-name">' + diner.name + '</h1>' +
    '<div id="bodyContent">' +
    '<p class="diner-desc">' + diner.desc + '</p>' +
    '<p>Open details</p>'
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
    controlText.innerHTML = cd.dictionary.goToCurrentBtnTxt;
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
    controlUI.title = cd.dictionary.fullScreenBtnTxt;
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.classList.add('map-btn-text');
    controlText.innerHTML = cd.dictionary.fullScreenBtnTxt;
    controlUI.appendChild(controlText);

    // Setup the click event listeners: center the map to current location
    google.maps.event.addDomListener(controlUI, 'click', function() {
      if($("#map-container").toggleClass("fullscreen").hasClass("fullscreen")){
        $(this).attr('title', cd.dictionary.smallScreenBtnTxt).find(".map-btn-text").text(cd.dictionary.smallScreenBtnTxt);
      }else{
        $(this).attr('title', cd.dictionary.fullScreenBtnTxt).find(".map-btn-text").text(cd.dictionary.fullScreenBtnTxt);
      }
      _setMapHeight(map);
    });
  }

  //bind events
  // this direct to a diner hall page
  $('body').on(cd.touchEvent, '.ux-diner', function() {
    event.preventDefault();
    //goes to a specific diner page at diner.html
    //see setDinerData function for binding the rest of data
    
    dinerName = $(this).find('.ux-diner-name').text();
    dinerName = dinerName ? dinerName : "Diner";
    $('[data-role=page]#diner .pageTitle').text(dinerName);
    $('[data-role=page]#menu .pageTitle').text(dinerName);

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
        
        var saddr = cd.latitude+","+cd.longitude,
        daddr = ret.latitude+","+ret.longitude;
        ret._mapitHref = (cd.isIOS)?("maps:saddr="+saddr+"&daddr="+daddr):("geo:"+saddr+"?q="+daddr);
        ret._backupMapitHref = "http://maps.apple.com/?saddr="+saddr+"&daddr="+ daddr;

        $.each(ret.images, function(i, url){
          ret._images.push({"_url":url});
        });
        $.each(ret.seven_day_info, function(i, day){

            if(day.info.length === 0){
              day.info.push({
                    "end": "",
                    "event_type": cd.dictionary.closedEatery,
                    "is_limited": 0,
                    "start": "",
                    "_hide" : true
              })
            }else{
            }
        });

        cd.diner.cacheMap[dinerId] = ret;
      });
    }
    
    $.mobile.changePage("diner.html", {
      transition: "slide"
    });

  });

//Makes the search box visible when search button is clicked and focuses it.
$('body').on(cd.touchEvent, '.ux-search-btn', function() {
    $searchForm = $(this).closest("[data-role='page']").find('form[role="search"]').show();
    $searchForm.find('input').focus();
    $searchForm.siblings(".ux-suggestions").show();
});
// hides the search bar again when focus removed.
var needToHideForm = true;
$('body').on('blur', 'input[data-type="search"]', function(e,e2) {
  if(needToHideForm){
    $(this).closest('form').hide().siblings(".ux-suggestions").hide();
  }else{
    needToHideForm = true;
  }
});
$('body').on('mousedown',function(e){
  if(e.target.classList.contains("ui-icon-delete") ||
   e.target.id==="search-btn" ||
    $(e.target).parents(".ux-suggestions").length !== 0 ){
    needToHideForm = false;
  }else{
    needToHideForm = true;
  }
})


$('body').on(cd.touchEvent, '#listall-icon', function() {
  $.mobile.changePage("listall.html", {
    transition: "slide"
  });
}); 

$('body').on(cd.touchEvent, '.ux-connect-icon', function() {
  $.mobile.changePage("connect.html", {
    transition: "slide"
  });
});

//favorite food entrance
$('body').on(cd.touchEvent, '#fav-icon', function() {
  $(".ux-no-fav-prompt").hide();
  addLoadingMask($('#fav-page .ux-starredFood-container'));  
  sendRequest({
    "uri": "get_favorite.json",
    "method": "GET",
    "data": {
      "favorite_food": formatedFavFoodArr()
    }
  }, function(ret) {
    $("#fav-page .prompt").hide();
    // var favArr = [], favMap={};
    favArr = [], favMap={};
    //init favMap
    $.each(getFavFoodArr(), function (index, favFood) {
      favMap[restoreFavFoodFormat(favFood)] = [];
    });
    //fill in favMap
    $.each(ret, function(index, food){
      if(!favMap[food.fav_food]){
        favMap[food.fav_food] = [food]
      }else{
        favMap[food.fav_food].push(food);
      }
    });
    //format favMap in to what to be set into HTML
    $.each(favMap, function(index, food){
      if(food.length === 0) food = cd.dictionary.favFooDNotFoundTxt;
      favArr.push({
        _food_name : index,
        _served_at : food
      })
    });


    $('#fav-page [ux\\:data^="data{fav"]').setData({
      fav: favArr
    });
    if(favArr.length === 0 ){
      $(".ux-no-fav-prompt").show();
    }
    removeLoadingMask($('#fav-page .ux-starredFood-container'));
  });

  $.mobile.changePage("fav.html", {
    transition: "slide"
  });

});

$('body').on(cd.touchEvent, '#switch-btn', function() {
  var mapBtn = $(this).find('#map-btn');
  var listBtn = $(this).find('#list-btn');
  if (mapBtn.hasClass("active-btn")) {
      //to list
      listBtn.removeClass("inactive-btn").addClass("active-btn");
      mapBtn.removeClass("active-btn").addClass("inactive-btn");
      $('#map-container').fadeOut({
        duration : 300, 
        complete:function(){
          $('#nearme .list-container').fadeIn();
        }
      });
    } else {
      //to map
      mapBtn.removeClass("inactive-btn").addClass("active-btn");
      listBtn.removeClass("active-btn").addClass("inactive-btn");
      $('#nearme .list-container').fadeOut({
        duration : 300, 
        complete:function(){
          $('#map-container').fadeIn();
          if (!mapInited) {
            initMap();
          }
        }
      });
      
    }
  });

//Add and Remove favorite food function on Menu page
$('body').on(cd.touchEvent, '.ux-food-name', function() {
  event.preventDefault();
  var icon = $(this).siblings(".icon-fav");
  var foodName = $(this).text();
  if(icon.toggleClass("unfav").hasClass("unfav")){
    if(cd.verbose) console.log("Dislike", foodName);
    removeFavFood(foodName);
  }else{
    if(cd.verbose) console.log("Likes", foodName);
    addFavFood(foodName);
  }
});

//Remove favorite food function on Fav page
$('body').on(cd.touchEvent, '.ux-remove-fav-food', function() {
  var foodName = $(this).siblings(".ux-food-name").text();
  if(cd.verbose) console.log("removing", foodName);
  $(this).parent().parent().fadeOut();
  removeFavFood(foodName);
});

$('body').on(cd.touchEvent, '.ux-mapit', function() {
  var backupMapitHref = $(this).attr('ux-backup-mapit-href');
  if(cd.verbose) console.log("mapit", backupMapitHref);
  if(cd.isIOS) return;
  
  //fall back for non-iOS platforms
  cd.MapitTimer = setTimeout(function(){
    window.open(backupMapitHref, "_blank");
  }, 800);
  return true;
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

$('form[role="search"]').off('submit').hide().children("div").removeClass("ui-btn-corner-all");

$('body').on('submit', 'form', function(event){
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
    $.each($('.ux-food-name'), function(j, item){
      if(item.innerText=== favFood){
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
    $.mobile.loadPage( "result.html", { showLoadMsg: false } );
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
$(document).on('pageinit', '#connectScreen', function() {
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
        //reset form
        $(form).find("input[type='text'], textarea").val("");
        $(form).find(".ux-default-select-value").prop('selected', true);
      }, function(ret, res){
        console.log("Failed to comment");
        alert("Failed to upload the feedback. Please try again later");
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
  removeLoadingMask($('#result .list-container'));
}

$(document).on('pageshow', '#result', function() {
  console.log("showing result page");
  $('#result .keyword').text(cd.keyWord);
  addLoadingMask($('#result .list-container'));
  setSearchResult();
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
  removeLoadingMask($('#result .list-container'));
}

$(document).on('pageshow', '#fav-page', function() {
  console.log("showing fav page");
  // $('#result .keyword').text(cd.keyWord);
  addLoadingMask($('#result .list-container'));
  setFavData();
});