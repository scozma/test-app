<?php

	$fileNo = $_GET["fileNo"];

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, 'http://sorincozma.co.uk/backend2/sampleData' . $fileNo . '.json');
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$result = curl_exec($ch);
	curl_close($ch);

	print_r($result);
?>