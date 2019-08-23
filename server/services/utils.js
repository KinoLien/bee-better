
var url = require('url');
var md5 = require('md5');
var fs = require('fs');
var uuid = require('node-uuid');
const path = require('path');

var strkey = "_bb";

function lessTenAddZero(v) { return v < 10? ("0" + v) : v; };

function walkSync (dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
    	if ( file && file[0] == "." ) return;	// ignore hidden files
        const dirFile = path.join(dir, file);
        try {
            filelist = walkSync(dirFile, filelist);
        }
        catch (err) {
            if (err.code === 'ENOTDIR' || err.code === 'EBUSY') filelist = [...filelist, dirFile];
            else throw err;
        }
    });
    return filelist;
}

exports.getCookie = function(req){
	var res = null,
		cookiePairs = [];

	if(req && req.headers && req.headers.cookie)
		cookiePairs = req.headers.cookie.split(';');

	for(var idx = 0, len = cookiePairs.length; idx < len; idx++){
		var cookie = cookiePairs[idx];
		var parts = cookie.match(/(.*?)=(.*)$/);
		if(parts[1].trim() == strkey){
			res = (parts[2] || '').trim();
			break;
		}
	}
	return res;
};

exports.setCookie = function(res, strValue, milliseconds){
	res.cookie(strkey, strValue, {
        maxAge: milliseconds,
        httpOnly: true
    });
};

exports.getParamPairs = function(req){
	var requestUrl = url.parse(req.url),
		requestQuery = requestUrl.query,
		requestParams = requestQuery.split('&');
	params = {};
	for (i = 0; i <= requestParams.length; i++) {
		param = requestParams[i];
		if (param) {
			var p = param.split('=');
			if (p.length != 2) continue;
			params[p[0]] = decodeURIComponent(p[1]);
		}
	}
	return params;
};

exports.getToken = function(){
	return md5(uuid.v4());
};

exports.base64_encode = function(file){
	// read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
};

function toFridayFormat(dte){
	var year = dte.getUTCFullYear(),
		month = dte.getUTCMonth() + 1,
		day = dte.getUTCDate(),
		hour = dte.getUTCHours(),
		min = dte.getUTCMinutes(),
		sec = dte.getUTCSeconds();
	return parseInt( [
		year.toString().slice(2), lessTenAddZero(month), lessTenAddZero(day), 
		lessTenAddZero(hour), lessTenAddZero(min), lessTenAddZero(sec)
	].join("") );
}

exports.toFridayFormat = toFridayFormat;

exports.isIsoDate = function (str) {
	if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
	var d = new Date(str); 
	return d.toISOString()===str;
};

exports.fridayFormatToISOString = function(num){
	var str = num.toString();
	if ( str.length != 12 ) return null;
	return [
			[ "20" + str.slice(0, 2), str.slice(2, 4), str.slice(4, 6) ].join("-"),
			"T",
			[ str.slice(6, 8), str.slice(8, 10), str.slice(10, 12) ].join(":"),
			".000Z"
		].join("");
};

exports.assetsStampMap = function(){
	var res = {};
	var rootPath = process.cwd();
    var filelist = walkSync(rootPath + "/assets");
    filelist.forEach(function(path){
    	var key = path.slice(rootPath.length);
        var stats = fs.statSync(path);
        var mtime = stats.mtime;
        res[key] = toFridayFormat(new Date(mtime));
    });
    return res;
};
