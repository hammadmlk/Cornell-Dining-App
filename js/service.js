function sendRequest(res, cb) {
  var TARGET_SERVER = "sf-sas-skoda01.serverfarm.cornell.edu/"
  var ROOT_DIR = "cd"; //could be localhost/www , depending on your apache config
  var SERVICE_ROOT = "http://"+ ROOT_DIR +"/proxy.php?targetServer=" + TARGET_SERVER + "&url=";

  if ((/file/).test(window.location.protocol)) {
    SERVICE_ROOT = "http:/sf-sas-skoda01.serverfarm.cornell.edu/"
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
  }).fail(function() {
    console.error('[service.rest] request error', res, arguments);
  });
}