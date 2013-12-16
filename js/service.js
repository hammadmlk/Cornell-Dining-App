// FILE TO TALK TO SERVER.
/////////////////////////

// res: resource          - stores information about request header, uri, etc.
// cb: callback           - called when request succeds
// bcb: back-up callback  - called when request fails
function sendRequest(res, cb, bcb) {
  var TARGET_SERVER = "sf-sas-skoda01.serverfarm.cornell.edu/";
  var ROOT_DIR = location.href.substr(0,location.href.lastIndexOf('/')+1);
  //service root points to proxy php, which is a intermediary for cross domain requests 
  var SERVICE_ROOT = ROOT_DIR +"/proxy.php?targetServer=" + TARGET_SERVER + "&url=";

  if ((/file/).test(window.location.protocol)) {
    //when installed on phones, we no longer need the proxy php
    SERVICE_ROOT = "http://sf-sas-skoda01.serverfarm.cornell.edu/"
  }

  console.log('[service.rest] sendRequest', res);
  /*
   * Add another variable to res. res.headers
   * if res.headers is null or undefined, set it to empty object
   */
  if (!res.headers) {
    res.headers = {};
  }

  var ret = $.ajax({
    url: SERVICE_ROOT + res.uri,
    // type: res.method,
    async: true,
    // contentType: 'application/json',
    data: res.data,
    dataType: 'json',
  });
  return ret.pipe(function(o) {
    console.log('[service.rest] request complete', res, o);
    cb(o, res);
  }).fail(function(o) {
    console.error('[service.rest] request error', res, arguments);
    bcb(o, res);
  });
}
