/**
 * Routes for express app
 */
var express = require('express');
var path = require('path');
const jwt = require('jsonwebtoken');
var secrets = require('./secrets');
var utils = require('../services/utils');
var interface = require('../services/data-interface');
var nunjucks = require('nunjucks');
var mqtt = require('mqtt');
var mqttUrl = 'mqtt://localhost';

var mqttClient = mqtt.connect(mqttUrl, secrets.mqttUserPass);

const fs = require('fs');
const localeDir = path.join(process.cwd(), "server", "locale" );
const loadedLocaleSet = {};

(() => {
    fs.readdir(localeDir, function(err, files){
        const jsonFiles = files.filter(el => path.extname(el) === '.json');
        jsonFiles.forEach(file => {
            const langCode = file.split(".json")[0];
            loadedLocaleSet[langCode] = require( path.join(localeDir, file) );
        });
    });
})();

// route middleware to make sure a user is logged in
function loginRequired(req, res, next) {
    // if user is authenticated in the session, carry on
    // if(process.env.NODE_ENV === 'development' || req.isAuthenticated()) return toNext();    
    if(req.isAuthenticated()) return next();

    console.log("return to login");
    // if they aren't redirect them to the home page
    res.redirect('/login');
}

function superuserRequired(req, res, next) {
    if (res.locals.isSuperuser) return next();

    res.sendStatus(404);
}

module.exports = function(app, passport) {

    var nunEnv = nunjucks.configure(app.get('views'), {
        autoescape: true,
        watch: true,
        express: app
    });

    var assetsMap = utils.assetsStampMap();
    
    nunEnv.addFilter("appendStamp", function(path){
        if (assetsMap[path]) {
            path += '?t=' + assetsMap[path].toString();
        }
        return path;
    });

    nunEnv.addFilter("isGroupWith", function(cur, target){
        return cur.substring(0, target.length) == target;
    });

    nunEnv.addFilter("trans", function(lang, word){
        if ( loadedLocaleSet[lang] ) {
            word = loadedLocaleSet[lang][word] || word;
        }
        return word;
    });

    // =====================================
    // Static Files ========================
    // =====================================
    // Using reverse proxy Nginx

    // =====================================
    // API =================================
    // =====================================
    app.post('/api/push', function (req, res, next) {
        var formbody = req.body;
        var cellId;
        var data = {};
        Object.keys(formbody).forEach( (key) => {
            if ( key == "WorkSheetName" ) cellId = formbody[key];
            else if ( key == "method" ) {}  // ignore
            else{
                var value = parseFloat(formbody[key]);
                data[key] = isNaN(value) ? formbody[key] : value;
            }
        } );

        // time case
        if (!data["Time"]) {
            data["Time"] = utils.toFridayFormat(new Date());
        }

        if (cellId) {
            interface.addData(cellId, data)
                .then( () => { 
                    console.log("[cellId: " + cellId + "] Insert OK.");
                    mqttClient.publish(`${cellId}/data`, JSON.stringify(data));
                    res.status(200).send("OK");
                } )
                .catch(err => {
                    let errorObj = {error: "Internal server error: " + err};
                    console.error(errorObj);
                    res.status(500).json(errorObj);
                });
        } else {
            console.error("WorkSheetName is not set");
            res.status(400).send("WorkSheetName is not set");
        }
    });

    app.get('/api/cells/:cellId', loginRequired, function(req, res) {
        interface.getCellData(req.params.cellId, req.query.start, req.query.end)
            .then(results => {
                res.status(200).json(results);
            });
    });

    app.get('/api/dailylist/:cellId', loginRequired, async function(req, res) {
        let reslogs = await interface.getCellLogs(req.params.cellId, req.query.start, req.query.end);
        res.status(200).json(reslogs);
    });

    app.post('/api/dailylist/log/:logId', loginRequired, async function(req, res) {
        let action = req.body.action;
        // check the owner
        let isValid = res.locals.isSuperuser || (await interface.checkLogOwner(req.user.id, req.params.logId));
        if ( isValid ) {
            let data = {
                title: req.body.title,
                content: req.body.content
            };
            if ( action == "update" ) {
                let resLog = await interface.updateCellLog(req.params.logId, data);
                res.status(200).json(resLog);
            } else if ( action == "delete" ) {
                await interface.deleteCellLog(req.params.logId);
                res.status(200).send("OK");
            }
        } else res.status(403).send("Forbidden");
    });

    // =====================================
    // Mobile API ==========================
    // =====================================
    app.post('/mobile/api/login', passport.authenticate('local-login', {
      session: false
    }), (req, res) => {
      // Token
      const token = jwt.sign({id: req.user.id}, secrets.jwt_secret)

      res.json({token: token})
    });

    app.get('/mobile/api/cells', passport.authenticate('jwt-check', {
        session: false
    }), async function(req, res) {
        if ( !req.user ) {
            res.json(['nobody'])
        }
        res.json(await interface.getOwnCells(req.user.id));
    });

    app.get('/mobile/api/cells/:cellId/latest', async function(req, res) {
        res.json(await interface.getCellLatestData(req.params.cellId))
    });
    
    // =====================================
    // CONSOLE =============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('login', { message: req.flash('message') } );
        // res.render(path.resolve(app.get("views"), 'login.ejs'));
    });
    // show the logout view
    app.get('/logout', loginRequired, function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.get('/', loginRequired, function(req, res) { res.redirect('/dashboard'); });

    app.get('/dashboard', loginRequired, async function(req, res) {
        res.render('menu/dashboard/normal', { devices: await interface.getOwnCells(req.user.id) });
    });

    app.get('/dashboard/normal', loginRequired, async function(req, res) {
        res.render('menu/dashboard/normal', { devices: await interface.getOwnCells(req.user.id) });
    });

    app.get('/dashboard/compares', loginRequired, async function(req, res) {
        res.render('menu/dashboard/compares', { devices: await interface.getOwnCells(req.user.id) });
    });

    app.get('/daily/list', loginRequired, async function(req, res) {
        let resdata = {};
        if ( res.locals.isSuperuser ) {
            let allLogs = await interface.getAllCellLogs();
            resdata.datalist = allLogs.filter(log => log.ownerid == req.user.id);
            resdata.otherdatalist = allLogs.filter(log => log.ownerid != req.user.id);
        } else {
            resdata.datalist = await interface.getOwnCellLogs(req.user.id);
        }
        res.render('menu/daily/list', resdata);
    });

    app.get('/daily/create', loginRequired, async function(req, res) {
        res.render('menu/daily/create', { devices: await interface.getOwnCells(req.user.id) });
    });
    app.post('/daily/create', loginRequired, async function(req, res) {
        let cellId = req.body.device;
        let data = {
            date: req.body.date,
            title: req.body.title,
            content: req.body.content || ""
        };
        if ( cellId ) {
            await interface.addCellLog(req.user.id, cellId, data);
            console.log("[Log: " + cellId + " " + data.date + "] Insert OK.");
        }
        res.redirect('/daily/list');
    });

    app.get('/device/create', loginRequired, superuserRequired, async function(req, res) {
        let users = await interface.getUsers();
        users = users.filter(u => u.id !== req.user.id);
        res.render('menu/device/create', { users: users });
    });
    app.get('/device/uniquecheck/cellid/:value', loginRequired, superuserRequired, function(req, res, next){
        const value = req.params.value;
        interface.getCell(value)
            .then(function(results){
                if ( results ) res.send("fail");
                else res.send("ok");
            })
            .catch(next);
    });
    app.post('/device/create', loginRequired, superuserRequired, async function(req, res, next){
        const cellId = req.body.cellid;
        const name = req.body.name;
        let grantsTo = req.body.grants || [];
        if (typeof req.body.grants === "string") {
            grantsTo = [req.body.grants];
        }
        
        await interface.createCell(req.user.id, cellId, grantsTo, { name: name });
        console.log("[Device: " + cellId + "] Create OK.");

        res.redirect('/device/create');
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : false // allow flash messages
    }));

};
