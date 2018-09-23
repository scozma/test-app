# Test app

Test application

### File structure

The **assets/js** directory contains:
- a **config.js** file with all the configurable elements
- a **main.js** file containing the main JS code

### Backend calls

The API response comes from 5 different files in order to simulate a different response each time we call the backend.
In order to provide a method to bypass same-domain policy restriction from browsers, we delegated the call to the API to a PHP file.
There are two endpoints:
- one which has a .htaccess rule to allow requests from another domain and which can be tested without needing to run PHP on our machine (http://sorincozma.co.uk/backend/sampleData[i].json)
- one which doesn't have the above mentioned rule and which can be used to test the application without PHP, so the requests can be done from the browser (http://sorincozma.co.uk/backend2/sampleData[i].json)

In order to get different results from the API, we are calling 5 different files/endpoints at a time interval which is specified into the  **config.js** file.