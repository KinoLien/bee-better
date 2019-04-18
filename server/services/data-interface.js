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

var cellsCollect = db.collection('cells');

var cellExistMap = {};

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

