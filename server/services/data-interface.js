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

