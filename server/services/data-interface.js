var admin = require("firebase-admin");
var utils = require('./utils');
var md5 = require('md5');

var isProduction = process.env.NODE_ENV === 'production';

if ( isProduction ) {
	admin.initializeApp({
		credential: admin.credential.applicationDefault()
	});
} else {
	var serviceAccount = require("../config/serviceAccountKey.json");

	admin.initializeApp({
	  credential: admin.credential.cert(serviceAccount)
	});
}

var db = admin.firestore();

// should be set on console and save to db
var valuesValids = {
	"Tem1": [0, 100],
	"Tem2": [0, 100],
	"Tem3": [0, 100],
	"Tem4": [0, 100],
	"Hum1": [0, 100],
	"Hum2": [0, 100],
	"Hum3": [0, 100],
	"Hum4": [0, 100],
	"Vol1": [0, 100],
	"Vol2": [0, 100],
	"Vol3": [0, 100],
	"Vol4": [0, 100],
	"Weight": [0, 100]
};

var filterValidValues = function(obj){
	var res = {};
	Object.keys(obj).forEach(function(key){
		var validSet;
		if ( validSet = valuesValids[key] ){
			var val = obj[key];
			if ( val < validSet[0] || val > validSet[1] ) res[key] = null;
		}
	});
	return res;
};

var usersCollect = db.collection('users');
var cellsCollect = db.collection('cells');

var cellExistMap = {};

exports.validUser = function(email, password){
	var userRef = usersCollect.doc(email);
	return new Promise((resolve, reject) => {
		userRef.get()
			.then(doc => {
				var data;
				if ( doc.exists && (data = doc.data()) && data.pass === md5(password) ) {
					var resdata = {
						id: doc.id,
						superuser: data.superuser,
						name: data.name,
						cells: (data.cells || []).map(docRef => docRef.id)
					};
					resolve(resdata);
				}
				reject("Email or Password is not valid.");
			});
	});
};

exports.addData = function(cellId, dataObj){
	var cellRef = cellsCollect.doc(cellId);
	
	// default
	var next = Promise.resolve();
	if ( typeof cellExistMap[cellId] == 'undefined' ) {
		next = cellRef.get().then(doc => { cellExistMap[cellId] = !!doc.exists; });
	} 

	return new Promise((resolve, reject) => {
		next.then(function(){
			if ( cellExistMap[cellId] ) {
				// get current time
				dataObj.created_at = (new Date()).getTime();
				cellRef.collection("data").add(dataObj).then(() => { resolve() });
			} else reject("cell is not exist");
		});
	});
};

exports.getCellData = function(cellId, datestart, dateend){
	var cellDataRef = cellsCollect.doc(cellId).collection("data");
	var endDate, startDate;

    // parse end
    if (dateend && utils.isIsoDate(dateend)) {
        endDate = new Date(dateend);
    } else {
        endDate = new Date();   // now
    }

    // parse start
    if (datestart && utils.isIsoDate(datestart)){
        startDate = new Date(datestart);
    } else {
        startDate = new Date(endDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    }

	var dataQuery = cellDataRef
		.where('Time', '>=', utils.toFridayFormat(startDate))
		.where('Time', '<=', utils.toFridayFormat(endDate))
		.orderBy('Time');

	return new Promise((resolve, reject) => {
		dataQuery.get()
			.then(querySnapshot => {
				var results = [];
				querySnapshot.forEach(doc => {
					var data = doc.data();
					var converted = Object.assign(
						{ "Time_convert": utils.fridayFormatToISOString(data["Time"]) }, 
						data,
						filterValidValues(data)
					);
					results.push(converted);
				});
				resolve(results);
			});
	});
};

exports.addCellLog = function(ownerId, cellId, logObj){
	var cellRef = cellsCollect.doc(cellId);
	var ownerRef = usersCollect.doc(ownerId);
	
	// default
	var next = Promise.resolve();
	if ( typeof cellExistMap[cellId] == 'undefined' ) {
		next = cellRef.get().then(doc => { cellExistMap[cellId] = !!doc.exists; });
	} 

	return new Promise((resolve, reject) => {
		next.then(function(){
			if ( cellExistMap[cellId] ) {
				// get current time
				logObj.created_at = (new Date()).getTime();
				logObj.owner = ownerRef;
				logObj.cell = cellRef;
				cellRef.collection("logs")
					.add(logObj)
					.then(ref => {
						ownerRef.get().then(doc => {
							let originData = doc.data();
							ownerRef.update({ logs: (originData.logs || []).concat([ref]) }).then(() => { resolve(); });
						});
					});
			} else reject("cell is not exist");
		});
	});
};

exports.getCellLogs = function(cellId, datestart, dateend){
	var cellLogsRef = cellsCollect.doc(cellId).collection("logs");

	var dataQuery = cellLogsRef
		.where('date', '>=', datestart)
		.where('date', '<=', dateend)
		.orderBy('date');

	return new Promise((resolve, reject) => {
		dataQuery.get()
			.then(querySnapshot => {
				var results = [];
				querySnapshot.forEach(doc => {
					results.push(doc.data());
				});
				resolve(results);
			});
	});
};

exports.getOwnCellLogs = function(ownerId){
	var ownerRef = usersCollect.doc(ownerId);

	return new Promise((resolve, reject) => {
		ownerRef.get().then(doc => {
			var theData = doc.data();
			Promise.all(theData.logs.map(logRef => {
				return logRef.get().then(log => { 
					var resData = log.data();
					resData.id = log.id;
					resData.device = resData.cell.id;
					return resData;
				});
			})).then(allResults => { resolve(allResults) });
		});
	});
};

exports.updateCellLog = function(cellId, logId, data){
	var cellLogsRef = cellsCollect.doc(cellId).collection("logs");
	var logRef = cellLogsRef.doc(logId);
	return new Promise((resolve, reject) => {
		logRef.update(data).then((resobj) => { resolve(resobj); });
	});
};
