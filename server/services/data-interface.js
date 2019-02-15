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

exports.addData = function(cellId, dataObj){
	var cellRef = cellsCollect.doc(cellId);
	return new Promise((resolve, reject) => {
		cellRef.get()
			.then(doc => {
				if (doc.exists) {
					// Atomically add a new region to the "regions" array field.
					dataObj.created_at = (new Date()).getTime();
					cellRef.collection("data").add(dataObj)
					.then(() => { resolve() });
				} else reject("cell is not exist");
			});
	});
};
