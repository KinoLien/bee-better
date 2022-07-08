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
var logsCollect = db.collection('logs');

var cellExistMap = {};
var cellOwnersMap = {};

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
						name: data.name
					};
					resolve(resdata);
				} else reject("Email or Password is not valid.");
			});
	});
};

exports.getUsers = function() {
	return usersCollect.get()
		.then(snapshot => {
			return snapshot.docs.map(doc => {
				var data = doc.data();
				data.id = doc.id;
				return data;
			});
		});
};

exports.hasUser = function(ownerId) {
	var userRef = usersCollect.doc(ownerId);
	return userRef.get()
		.then(doc => doc.exists ? { id: doc.id } : null)
};

exports.getOwnCells = function(ownerId) {
	var userRef = usersCollect.doc(ownerId);

	var next = Promise.resolve();
	if ( typeof cellOwnersMap[ownerId] == 'undefined' ) {
		next = userRef.get()
			.then(doc => {
				var data = doc.data();
				if ( data.superuser ) {
					return cellsCollect.get()
						.then(snapshot => 
							snapshot.docs.map(doc => {
								return { id: doc.id, name: doc.data().name }
							})
						);
				}
				return Promise.all((data.cells || []).map(docRef => docRef.get()))
					.then(dataResults => 
						dataResults.map(res => {
							return {
								id: res.id,
								name: res.data().name
							}
						})
					);
			})
			.then(dataset => cellOwnersMap[ownerId] = dataset);
	}

	return next.then(() => cellOwnersMap[ownerId]);
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
			} else reject(`cell: ${cellId} is not exist`);
		});
	});
};

exports.getCell = function(cellId){
	var cellRef = cellsCollect.doc(cellId);

	return cellRef.get()
		.then(doc => {
			if (doc.exists) return doc.data();
			else return false;
		});
};

exports.createCell = function(ownerId, cellId, grantsToList, cellObj) {
	var ownerRef = usersCollect.doc(ownerId);
	return this.getCell(cellId)
		.then(res => {
			if (res) reject("cell is already exist");
		})
		.then(() => {
			cellObj.created_at = (new Date()).getTime();
			cellObj.owner = ownerRef;
			cellObj.logs = [];
			return cellsCollect.doc(cellId).set(cellObj);
		})
		.then(() => {
			var cellRef = cellsCollect.doc(cellId);

			var updatePromises = grantsToList.map(userId => {
				var userRef = usersCollect.doc(userId);
				return userRef.get().then(doc => {
					let originUserData = doc.data();
					return userRef.update({ cells: (originUserData.cells || []).concat([cellRef]) });
				});
			});
			
			updatePromises.push(
				ownerRef.get().then(doc => {
					let originData = doc.data();
					return ownerRef.update({ cells: (originData.cells || []).concat([cellRef]) });
				})
			);

			return Promise.all(updatePromises).then(() => cellRef);
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

exports.getCellLatestData = function(cellId) {
	var cellDataRef = cellsCollect.doc(cellId).collection("data");
	var nowDate = new Date();
	var dataQuery = cellDataRef
		.where('Time', '<=', utils.toFridayFormat(nowDate))
		.orderBy('Time', 'desc')
		.limit(1);

	return dataQuery.get()
		.then(querySnapshot => {
			var result = null;
			querySnapshot.forEach(doc => {
				var data = doc.data();
				var converted = Object.assign(
					{ "Time_convert": utils.fridayFormatToISOString(data["Time"]) }, 
					data,
					filterValidValues(data)
				);
				result = converted;
			});
			return result;
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

				logsCollect.add(logObj)
					.then(ref => {
						let bindPromises = [
							ownerRef.get().then(doc => {
								let originData = doc.data();
								return ownerRef.update({ logs: (originData.logs || []).concat([ref]) });
							}),
							cellRef.get().then(doc => {
								let originData = doc.data();
								return cellRef.update({ logs: (originData.logs || []).concat([ref]) });
							})
						];
						Promise.all(bindPromises).then(() => { resolve(); });
					});
			} else reject("cell is not exist");
		});
	});
};

exports.checkLogOwner = function(ownerId, logId){
	var ownerRef = usersCollect.doc(ownerId);
	var logRef = logsCollect.doc(logId);
	return logRef.get().then(doc => {
		let data;
		return doc.exists && (data = doc.data()) && data.owner.id == ownerRef.id;
	});
};

exports.getCellLogs = function(cellId, datestart, dateend){
	var cellRef = cellsCollect.doc(cellId);

	var dataQuery = logsCollect
		.where('cell', '==', cellRef)
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
	var dataQuery = logsCollect.where('owner', '==', ownerRef);
	return new Promise((resolve, reject) => {
		dataQuery.get()
			.then(querySnapshot => {
				var results = [];
				querySnapshot.forEach(doc => {
					var resData = doc.data();
					resData.id = doc.id;
					resData.device = resData.cell.id;
					results.push(resData);
				});
				resolve(results);
			});
	});
};

exports.getAllCellLogs = function(){
	return new Promise((resolve, reject) => {
		logsCollect.get()
			.then(querySnapshot => {
				var results = [];
				querySnapshot.forEach(doc => {
					var resData = doc.data();
					resData.id = doc.id;
					resData.device = resData.cell.id;
					resData.ownerid = resData.owner.id;
					results.push(resData);
				});
				resolve(results);
			});
	});
};

exports.updateCellLog = function(logId, data){
	var logRef = logsCollect.doc(logId);
	return new Promise((resolve, reject) => {
		logRef.update(data).then((resobj) => { resolve(resobj); });
	});
};

exports.deleteCellLog = function(logId){
	var logRef = logsCollect.doc(logId);
	return new Promise((resolve, reject) => {
		let ownerRef;
		let cellRef;
		logRef.get().then(doc => {
			let logData = doc.data();
			ownerRef = logData.owner;
			cellRef = logData.cell;
		}).then(() => {
			return logRef.delete();
		}).then(() => {
			return Promise.all([ownerRef.get(), cellRef.get()]);
		}).then(docs => {
			let ownerData = docs[0].data();
			let cellData = docs[1].data();

			let ownerRemoveIdx = -1, cellRemoveIdx = -1;
			// find index in owner
			for(let idx = 0, len = ownerData.logs.length; idx < len ;idx++) {
				if ( logId == ownerData.logs[idx].id ) {
					ownerRemoveIdx = idx; break;
				}
			}
			// find index in cell
			for(let idx = 0, len = cellData.logs.length; idx < len ;idx++) {
				if ( logId == cellData.logs[idx].id ) {
					cellRemoveIdx = idx; break;
				}
			}

			if ( ownerRemoveIdx != -1 && cellRemoveIdx != -1 ) {
				let updatedOwnerLogs = ownerData.logs.slice(0);
				let updatedCellLogs = cellData.logs.slice(0);

				updatedOwnerLogs.splice(ownerRemoveIdx, 1);
				updatedCellLogs.splice(cellRemoveIdx, 1);

				Promise.all([
					ownerRef.update({ logs: updatedOwnerLogs }),
					cellRef.update({ logs: updatedCellLogs })
				]).then(() => { resolve() });
			} else reject();
		});
	});
};
