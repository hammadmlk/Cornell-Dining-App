<?php
# Proxy.php
#
# This file is used to send cross domain requests. It is useful when testing and developing on desktop browsers
#

if (!isset($_GET['url'])) die();
$url = urldecode($_GET['url']);
$targetServer = $_GET['targetServer'];
// var_dump($_GET);
$debug = false;

if($debug){
	// TODO:// 
}else{
  $url = $targetServer.$url;
	$setParam = false;
	foreach($_GET as $x=>$x_value)
  {
  	if($x !== "targetServer" && $x !== "url"){
  		if(!$setParam){
  			$setParam = true;
  			$url = $url.'?';
  		}else{
  			$url = $url.'&';
  		}
  		$url = $url. $x."=".$x_value;
  	}
  }
  
  $url = 'http://'.$url; // Avoid accessing the file system

  // to simulate networking delay
  // sleep(rand(1,3));

  echo file_get_contents($url);
}
