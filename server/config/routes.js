/**
 * Routes for express app
 */
var express = require('express');
var path = require('path');
var utils = require('../services/utils');
var interface = require('../services/data-interface');
var nunjucks = require('nunjucks');

// route middleware to make sure a user is logged in
function loginRequired(req, res, next) {
    // if user is authenticated in the session, carry on
    // if(process.env.NODE_ENV === 'development' || req.isAuthenticated()) return toNext();    
    if(req.isAuthenticated()) return next();

    console.log("return to login");
    // if they aren't redirect them to the home page
    res.redirect('/login');
}

module.exports = function(app, passport) {

    var nunEnv = nunjucks.configure(app.get('views'), {
        autoescape: true,
        watch: true,
        express: app
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

        if (cellId) {
            interface.addData(cellId, data)
                .then( () => { 
                    console.log("[cellId: " + cellId + "] Insert OK.");
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

    app.get('/dashboard', loginRequired, function(req, res) {
        res.render('menu/dashboard');
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : false // allow flash messages
    }));

};
