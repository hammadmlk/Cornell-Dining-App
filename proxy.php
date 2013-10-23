<?php
// Fil Name: proxy.php
if (!isset($_GET['url'])) die();
$url = urldecode($_GET['url']);
$targetServer = $_GET['targetServer'];
$debug = false;

if($debug){
//TODO...
$pattern = '/.*\/([^.]*)./';  // gets   /abcd/ 
if(preg_match($pattern, $url, $requested)){
  // var_dump($requested);
}

return;

echo '[
    {
        "campus_name": "North Campus",
        "diners": [
            {
                "diner_id": 0,
                "diner_name": "Bear Necessities",
                "diner_desc": "- A convenience store & grill in Robert Purcell",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44787,
                    "latitude": -76.47404
                },
                "diner_distance": 0.3
            },
            {
                "diner_id": 1,
                "diner_name": "Carol\'s café",
                "diner_desc": "- A café in Balch Hall",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44757,
                    "latitude": -76.47204
                },
                "diner_distance": 0.4
            },
            {
                "diner_id": 2,
                "diner_name": "North Star Dining Room",
                "diner_desc": "- All Your Care To Eat dining room in Appel Commons",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44689,
                    "latitude": -76.47524
                },
                "diner_distance": 0.5
            }
        ]
    },
    {
        "campus_name": "West Campus",
        "diners": [
            {
                "diner_id": 0,
                "diner_name": "Bear Necessities",
                "diner_desc": "- A convenience store & grill in Robert Purcell",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44787,
                    "latitude": -76.47404
                },
                "diner_distance": 0.3
            }
        ]
    },
    {
        "campus_name": "East Campus",
        "diners": [
            {
                "diner_id": 0,
                "diner_name": "Bear Necessities",
                "diner_desc": "- A convenience store & grill in Robert Purcell",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44787,
                    "latitude": -76.47404
                },
                "diner_distance": 0.3
            },
            {
                "diner_id": 1,
                "diner_name": "Carol\'s café",
                "diner_desc": "- A café in Balch Hall",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44757,
                    "latitude": -76.47204
                },
                "diner_distance": 0.4
            },
            {
                "diner_id": 2,
                "diner_name": "North Star Dining Room",
                "diner_desc": "- All Your Care To Eat dining room in Appel Commons",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44689,
                    "latitude": -76.47524
                },
                "diner_distance": 0.5
            }
        ]
    },
    {
        "campus_name": "South Campus",
        "diners": [
            {
                "diner_id": 0,
                "diner_name": "Bear Necessities",
                "diner_desc": "- A convenience store & grill in Robert Purcell",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44787,
                    "latitude": -76.47404
                },
                "diner_distance": 0.3
            },
            {
                "diner_id": 1,
                "diner_name": "Carol\'s café",
                "diner_desc": "- A café in Balch Hall",
                "close_at": "2013-10-14T14:00:00",
                "is_open": 1,
                "diner_location": {
                    "longitude": 42.44757,
                    "latitude": -76.47204
                },
                "diner_distance": 0.4
            }
        ]
    }
]';

}else{
  $url = $targetServer.$url;
  $url = 'http://' . str_replace('http://', '', $url); // Avoid accessing the file system
  echo preg_replace("/\/.*\ / ", "", file_get_contents($url));
}
