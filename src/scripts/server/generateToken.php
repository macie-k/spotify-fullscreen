<?php
    header('Access-Control-Allow-Origin: *');

    // ini_set('display_errors', 1);
    // ini_set('display_startup_errors', 1);
    // error_reporting(E_ALL);

    $filename = './saved_token.json';
    $file = json_decode(file_get_contents($filename));

    $current_datetime = new DateTime();
    $current_datetime = $current_datetime->getTimestamp();

    if($file == false || $file == null) {
        // if token not found, request new one
        echo getNewTokenAndSave()->access_token;
    } else {
        // if token found, read it and check the validity
        $saved_datetime = $file->datetime;
        $interval = $saved_datetime - $current_datetime;
        
        if($interval < 3600) {
            echo $file->access_token;
        } else {
            echo getNewTokenAndSave();
        }
    }

    function getNewTokenAndSave() {
        global $current_datetime, $filename;

        $response = getToken();
        $response->datetime = $current_datetime;
        $str_response = json_encode($response);

        file_put_contents($filename, $str_response);
        return $response;
    }

    function getToken() {
        // https://developer.spotify.com/dashboard/applications
        $client_id = 'your_client_id';
        $client_secret = 'your_client_secret';
        
        $auth = base64_encode($client_id.':'.$client_secret);
    
        $url = 'https://accounts.spotify.com/api/token';
        $data = array('grant_type' => 'client_credentials');
        $options = array(
            'http' => array(
                'header'  => array(
                    "Content-type: application/x-www-form-urlencoded",
                    "Authorization: Basic $auth"
                ),
                'method'  => 'POST',
                'content' => http_build_query($data)
            )
        );
    
        $context  = stream_context_create($options);
        $result = file_get_contents($url, false, $context);
    
        return json_decode($result);
    }
?>		