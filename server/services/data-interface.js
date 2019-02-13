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

// exports.addCommit = function(data){ ... }
