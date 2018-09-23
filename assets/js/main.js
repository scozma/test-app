var loadtimeRef = $('#loadtimeValue');
var devicesListRef = $('#devices-list');
var devicesListNoRef = $('#devices-number');
var statusBoxRef = $('#status-box');
var loadtimeVal = null;
var retriesCount = 0;
var loadtimeFormat;
var fileNo = 1;
var oldDevicesObj;
var newDevicesObj;

/**
 * Getting the data from the API and setting the Devices and Status lists
 */
function getData() {
	if(newDevicesObj) {		//	If this is not the first call (newDevicesObj exists), duplicate the devices array
		oldDevicesObj = JSON.parse(JSON.stringify(newDevicesObj));
	}
	$.ajax({
	    url: backendUrl + fileNo + '.json',	
	    // url: 'assets/php/getData.php?fileNo=' + fileNo,		//	Uncomment this line and comment the one above in order to avoit CORS issues
	    type: 'GET',
	    success: function (resp) {
	    	var resp = typeof resp === 'string' ? JSON.parse(resp) : resp;

	        loadtimeVal = resp.loadtime*1000;
	        setLoadTime(loadtimeVal);		//	Setting the 'loadtime' value
	        
	        newDevicesObj = resp.devices;	//	Store new object in the global variable
	        if(!oldDevicesObj) {		//	First call
				setDevices(resp.devices, resp.categories);
			} else {					//	Rest of the calls
				checkDeviceUpdates(oldDevicesObj, newDevicesObj, resp.categories);
			}
	        
	        fileNo = fileNo === 5 ? 1 : fileNo + 1;	//	If 'fileNo' is 5, start again with the first file 
			setTimeout(getData, connectInterval);	//	request the data every 'connectInterval' value
	        
	    },
	    error: function (err) {
	    	if(err) {	//	Retry to get the data
	    		if(retriesCount < retriesNo) {
					retriesCount++;
					setTimeout(getData, retriesInterval);
                	return;
	    		}
	    	}
	    }
	});
}

/**
 * Checking for device updates and updating the DOM
 */
function checkDeviceUpdates(oldDevices, newDevices, categories) {

	//	Get new items and deleted items
	var newDevicesIds = {}
	$.each(oldDevices, function(index, value) {
		newDevicesIds[value.id] = value;
	});

	var oldDevicesIds = {}
	$.each(newDevices, function(index, value) {
		oldDevicesIds[value.id] = value;
	});

	var addedItems = newDevices.filter(function(obj) {
	    return !(obj.id in newDevicesIds);
	});
	var deletedItems = oldDevices.filter(function(obj) {
	    return !(obj.id in oldDevicesIds);
	});

	//	Get updated items
	var sameItems = newDevices.filter(function(obj) {
	    return (obj.id in newDevicesIds);
	});
	
	//	Go through the 'sameItems' and check the modified values against 'oldDevices'
	var updatedItems = [];
	$.each(sameItems, function(index, value) {
		
		var valueId = value.id;		//	Current device ID
		var sameOldDevice = oldDevices.filter(function(x) {
			return x.id === valueId;
		})[0];
		
		var updatedObj = {};
		$.each(value, function(key, val) {	//	Device
			
			if(sameOldDevice[key] !== val) {	//	Compare the current device with the device with the same id from 'oldDevices'
				updatedObj[key] = val;
			}
		});

		if(!$.isEmptyObject(updatedObj)) {		//	If the object is not empty, add it to the 'updatedItems' array
			updatedObj.id = valueId;			//	Add the Device ID
			updatedItems.push(updatedObj);
		}
		
	});

	updateStatusBox(addedItems, deletedItems, updatedItems);
	updateDevicesList(addedItems, deletedItems, categories, newDevices, oldDevices, sameItems);
}

/**
 * Updating the status box
 */
function updateStatusBox(addedItems, deletedItems, updatedItems) {
	var statusBoxOutput = '';
	$.each(addedItems, function(index, value) {
		statusBoxOutput += '<div class="device-added-item">Device#' + value.id + ' was added.</div>';
	});

	$.each(deletedItems, function(index, value) {
		statusBoxOutput += '<div class="device-removed-item">Device#' + value.id + ' was removed.</div>';
	});
	
	$.each(updatedItems, function(index, value) {
		statusBoxOutput += '<div class="device-updated-item">Device#' + value.id + ' was updated.</div>';
		$.each(value, function(key, val) {
			if(key !== 'id') {
				statusBoxOutput += '<div>New ' + key + ' = ' + val + '</div>';
			}
			
		});
	});

	statusBoxRef.html(statusBoxOutput);
}

/**
 * Updating the devices list
 */
function updateDevicesList(addedItems, deletedItems, categories, newDevices, oldDevices, sameItems) {
	if(!$.isEmptyObject(deletedItems)) {
		$.each(deletedItems, function(index, value) {
			$('#' + value.id).remove();
		});
	}

	if(!$.isEmptyObject(addedItems)) {
		var deviceList = createHTML(addedItems, categories);
		devicesListNoRef.html('<h3>Devices: <span class="devices-no">'  + newDevices.length + '</span></h3>');
		devicesListRef.append(deviceList);
	}

	if(!$.isEmptyObject(sameItems)) {
		$.each(sameItems, function(index, value) {
			//	Update the 'category' and 'status'
			if(checkIfItemWasChanged(value, oldDevices, 'category')) {
				var categName = getCategoryName(value.category, categories);
				$('#' + value.id + ' #category-name').html(categName);

				var deviceStatus = getDeviceStatus(value);
				if(typeof deviceStatus !== 'object') {
					$('#' + value.id + ' #device-status').html(deviceStatus);
				} else {
					$('#' + value.id + ' #device-status').html(printObjectValues(deviceStatus));
				}
			}
			//	Update the 'name'
			if(checkIfItemWasChanged(value, oldDevices, 'name')) {
				$('#' + value.id + ' #device-name').html(value.name);
			}
		});
	}
}

/**
 * Checking if the param 'item' was canged
 * @returns {boolean}
 */
function checkIfItemWasChanged(updatedItem, oldDevices, item) {
	var oldDevice = oldDevices.filter(function(obj) {
	    return (obj.id === updatedItem.id);
	});
	return updatedItem['item'] !== oldDevice[0]['item'];
	// if(item === 'category') {
	// 	return updatedItem.category !== oldDevice[0].category;
	// } else {
	// 	return updatedItem.name !== oldDevice[0].name;
	// }
}

/**
 * Generating the date in the speacified param 'format'
 * @returns {string}
 */
function getCustomDate(date, format) {
	var formattedDate;
	var curr_date = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
	var curr_month = date.getMonth() < 9 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1; //Months are zero based
	var curr_year = date.getFullYear();

	switch(format) {
		case 'YYYY-MM-DD':
			formattedDate = curr_year + "-" + curr_month + "-" + curr_date;
		break;
		case 'DD/MM/YYYY':
			formattedDate = curr_date + "/" + curr_month + "/" + curr_year;
		break;
		case 'shortDate':
			formattedDate = date.toDateString();
		break;
		case 'fullDate':
			formattedDate = date;
		break;
	}
	return formattedDate;
}

/**
 * Setting the 'loadtime' depending on the global 'loadtimeFormat' or 'loadtimeDefaultFormat'
 */
function setLoadTime(loadtime) {
    var newDate = new Date(loadtime);
    var dateFormat = loadtimeFormat || loadtimeDefaultFormat;
    var formattedDate = getCustomDate(newDate, dateFormat);
    loadtimeRef.html(formattedDate);
}

/**
 * Building the 'loadtime' select
 */
function buildLoadTimeSelect() {
	var selectOptions = '';
	$.each(loadtimeOptions, function(index, value) {
		selectOptions += '<option>' + value + '</option>';
	})
	$('#loadtime-select').html(selectOptions);
}

/**
 * Updating the date format depending on the selected format value
 */
function onSelectChange(item) {
	loadtimeFormat = item.value;
	if(loadtimeVal) {
		var newDate = new Date(loadtimeVal);
		var formattedDate = getCustomDate(newDate, loadtimeFormat);
		loadtimeRef.html(formattedDate);
	}
}

/**
 * Generating the devices list
 */
function setDevices(devices, categories) {
	var deviceList = createHTML(devices, categories);
	devicesListNoRef.html('<h3>Devices: <span class="devices-no">'  + devices.length + '</span></h3>');
	devicesListRef.html(deviceList);
}

/**
 * Generating the HTML for the devices list
 * @returns {string}
 */
function createHTML(devices, categories) {
	var deviceList = '';
	$.each(devices, function(index, value) {
		var categName = getCategoryName(value.category, categories);
		var deviceStatus = getDeviceStatus(value);

		deviceList += '<div id="' + value.id + '">' +
		'<div><span class="device-item-label">Category name:</span> <span id="category-name">' + categName + '</span></div>' +
		'<div><span class="device-item-label">Device name:</span> <span id="device-name">' + value.name + '</span></div>';
		
		if(typeof deviceStatus !== 'object') {
			deviceList += '<div><span class="device-item-label">Device status:</span> <span id="device-status">' + deviceStatus + '</span></div>';
		} else {
			deviceList += '<div><span class="device-item-label">Device status:</span> <span id="device-status">' + printObjectValues(deviceStatus) + '</span></div>';
		}
		
		deviceList += '<hr />' +
		'</div>';
	});
	return deviceList;
}

/**
 * Getting the category name depending on the 'categId' param
 * @returns {string}
 */
function getCategoryName(categId, categories) {
	var categName;
	$.each(categories, function(index, value) {
		if(value.id == categId) {
			categName = value.name;
		}
	});
	return categName;
}

/**
 * Getting the device status depending on the device category
 * @returns {string|array}
 */
function getDeviceStatus(device) {
	var deviceStatus;
	switch(device.category) {
		case 2:
			deviceStatus = device.level;
		break;
		case 3:
			if(device.status === '1') {
				deviceStatus = 'ON';
			} else if(device.status === '0') {
				deviceStatus = 'OFF';
			}
		break;
		case 4:
			if(device.armed === '1') {
				deviceStatus = 'ARMED';
			} else if(device.armed === '0') {
				deviceStatus = 'DISARMED';
			}
		break;
		default:
			var deviceStatus = [];	//	Create 'deviceStatus' as Array
			$.each(device, function(key, value) {
				var deviceStatusObj = {};
				if(excludedStatuses.indexOf(key) === -1) {
					deviceStatusObj[key] = value;
					deviceStatus.push(deviceStatusObj);
				}
				return deviceStatus;
			});
	}
	return deviceStatus;
}

/**
 * Getting the status object values
 * @returns {string}
 */
function printObjectValues(obj) {
	var result = '';
	var lastObjItem = obj.length - 1;
	if(lastObjItem >= 0) {
		for(o in obj) {
			$.each(obj[o], function(key, val) {
				result += key + ' - ' + val;
				if(lastObjItem != o) {	//	Add the comma only if the element is not last
					result += ', ';
				}
			});
		}
	} else {
		result = '-';
	}
	return result;
}

/**
 * Initiating the app
 */
function init() {
	getData();
	buildLoadTimeSelect();
}

init();