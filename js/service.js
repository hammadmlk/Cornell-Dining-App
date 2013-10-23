  function sendRequest(res, cb) {
    var TARGET_SERVER = "ec2-54-200-173-73.us-west-2.compute.amazonaws.com:5000/";
    var SERVICE_ROOT = "http://cd/proxy.php?targetServer="+TARGET_SERVER+"&url=";

    if ( (/file/).test(window.location.protocol)) {
      SERVICE_ROOT = "http://ec2-54-200-173-73.us-west-2.compute.amazonaws.com:5000/"
    }

    console.log('[service.rest] sendRequest', res);
    /*
     * Add another variable to res. res.headers
     * if res.headers is null or undefined, set it to empty object
     */
    if(!res.headers){
        res.headers={};
    }
    
    var ret = $.ajax({
      url: SERVICE_ROOT + res.uri,
      // type: res.method,
      async: true,
      contentType: 'application/json',
      data: res.data,
      dataType: 'json',
    });
    return ret.pipe(function(o) {
      console.log('[service.rest] request complete', res , o );
      cb(o);
    }).fail(function() {
      console.error('[service.rest] request error', res, arguments);
    });
  }