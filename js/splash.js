var cd = {};
cd.splashTimeSpan = 2000;

$(function(){
  document.addEventListener("deviceready", onDeviceReady, false);
})

function onDeviceReady() {
  navigator.geolocation.getCurrentPosition(onSuccess, onError);     
}

function onSuccess(position) {
  // your callback here 
  console.log("location is ", position);
  cd.position = position;
  cd.latitude = cd.position.coords.latitude;
  cd.longitude = cd.position.coords.longitude;
}

function onError(error) { 
  // your callback here
  console.log(error);
}

function getNearByLocation(){
  if(!cd.position){
    setTimeout(getNearByLocation, 100);
    return;
  }
  sendRequest({
    "uri":"get_nearby.json",
    "method" : "GET",
    "data" : {
      longitude: cd.longitude,
      latitude: cd.latitude
    }
  }, function(ret){
    cd.diners = ret;
    console.log(cd.diners);
    $('#nearme .list-container [ux\\:data^="data{diner"]').setData({
      diner: cd.diners
    });
  });
}

function getAllDiners(){
  sendRequest({
    "uri":"get_all_diners.json",
    "method" : "GET",
  }, function(ret){
    $('#all [ux\\:data^="data{area"]').setData({
      area: ret
    });
  });
}

$(document).on('pageinit','#splash',function(){ 
  setTimeout(function(){
    $.mobile.changePage("home.html", {
     transition:"slideup"
   });
  }, cd.splashTimeSpan);
  $('body').on('tap', '.dinner', function(){
    event.preventDefault();
    dinnerName = $(this).find('h2').text();
    dinnerDesc = $(this).find('.dinner-desc').text();
    $.mobile.changePage("diner.html", {
     transition: "slide"
   });
  });
  $('body').on('tap', '.map-diner', function(){
    event.preventDefault();
    dinnerName = $(this).find('.map-dinner-name').text();
    dinnerDesc = $(this).find('#bodyContent').text();
    $.mobile.changePage("diner.html", {
     transition: "slide"
   });
  });

  $('body').on('tap', '#search-bar', function(){
    alert("Search function not implemented yet.");
  });

  $('body').on('tap', '#listall-icon', function(){
    $(this).siblings().removeClass('active');
    $(this).addClass('active');
    $("#nearme").fadeOut(400, function(){
      $("#all").fadeIn(); 
    });
  });

  $('body').on('tap', '#nearme-icon', function(){
    $(this).siblings().removeClass('active');
    $(this).addClass('active');
    $("#all").fadeOut(400, function(){
      $("#nearme").fadeIn();
    });
  });

  $('body').on('tap', '#connect-icon', function(){
    $.mobile.changePage("connect.html", {
     transition: "slide"
   });
  });

  $('body').on('tap', '#fullscreen-btn', function(){
    alert("Full screen the map.");
  });


  $('body').on('tap', '#showmore-btn', function(){
    $(this).fadeOut();
    $('#more-dinner').slideDown();
  });
  
  function initialize() {
    setTimeout(function(){
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

      var diners =[];
      var i =0;
      for(;i< cd.diners.length; i++){
        var diner = cd.diners[i];
        console.log(diner, diner.diner_location);
        diners.push({
          name : diner.diner_name, 
          longitude : diner.diner_location.longitude,
          latitude : diner.diner_location.latitude,
          zIndex : i,
          desc : diner.diner_desc
        });
      }
      setMarkers(map, diners);
      cd.map = map;
    },50);
}
var mapInited = false;

/**
 * Data for the markers consisting of a name, a LatLng and a zIndex for
 * the order in which these markers should display on top of each
 * other.
 */

 var infoWindows =[];
 var infoWindow;
 function setMarkers(map, locations) {
  // Add markers to the map
  for (var i = 0; i < locations.length; i++) {
    var diner = locations[i];
    var myLatLng = new google.maps.LatLng(diner.longitude, diner.latitude);
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
  }
  map.fitBounds(map.bounds);
}

function getInfoWindow(diner){
  var contentString = '<div class="map-diner" id="content">'+
  '<h1 id="firstHeading" class="firstHeading bigred map-dinner-name">'+diner.name+'</h1>'+
  '<div id="bodyContent">'+
  '<p>'+diner.desc+'</p>'+
  '<p class="bigred">Open details</p>'
  '</div>'+
  '</div>';
  var maxWidth = $('#map-canvas').width() -80;
  // console.log(maxWidth);
  var infowindow = new google.maps.InfoWindow({
    content: contentString,
    maxWidth: maxWidth
  });
  return infowindow;
}



$('body').on('tap', '#switch-btn', function(){
  var mapBtn = $(this).find('#map-btn');
  var listBtn = $(this).find('#list-btn');
  if (mapBtn.hasClass("bigred")){
        //to list
        listBtn.removeClass("black").addClass("bigred");
        mapBtn.removeClass("bigred").addClass("black");
        $('#nearme .list-container').fadeIn();
        $('#map-container').fadeOut();
      }else{
        //to map
        mapBtn.removeClass("black").addClass("bigred");
        listBtn.removeClass("bigred").addClass("black");  
        $('#nearme .list-container').fadeOut();
        $('#map-container').fadeIn();
        if(!mapInited){
          initialize();
        }
      }
    });

$('body').on('tap', '.menu-item', function(){
  event.preventDefault();
  menuItem = $(this).text();
  $.mobile.changePage("nutrition.html", {
   transition: "slide"
 });
});


$('body').on('tap', '.campus-section-header', function(){
  event.preventDefault();
  var contractor = $(this).find(".contractor");
  contractor.toggleClass('contracted');
  if(contractor.hasClass('contracted')){
    $(this).siblings('.campus-panel').slideUp();
  }else{
    $(this).siblings('.campus-panel').slideDown();
  }
});

});

$(document).on('pageinit', '#home', function(){
  console.log("home page inited");
  getNearByLocation();
  getAllDiners();
});

$(document).on('pageinit', '#diner', function(){
	dinnerName = dinnerName ? dinnerName:"Dinner";
  $('.ui-title').text(dinnerName);
  $('.desc').text(dinnerDesc);    
});

$(document).on('pageinit', '#nutrition', function(){
  $('h2.item').text(menuItem);    
});


$(document).on('pageinit', '#connect', function(){
  $('form').validate({
    rules: {
      netid: {
        required: true
      },
      message: {
        required: true
      }
    },
    submitHandler : function(form) {
      // form.submit();
      console.log("validate after");
      $( "#popupDialog" ).popup();
      $( "#popupDialog" ).popup("open");
      return false;
    }
  });
});