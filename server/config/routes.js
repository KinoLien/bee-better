/**
 * Routes for express app
 */
var express = require('express');
var path = require('path');
var utils = require('../services/utils');
var interface = require('../services/data-interface');

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

    // =====================================
    // Static Files ========================
    // =====================================
    // Using reverse proxy Nginx

    // =====================================
    // API =================================
    // =====================================
    

    // =====================================
    // CONSOLE =============================
    // =====================================
    app.get('/', function (req, res, next) {
        res.render(path.resolve(__dirname, '../', 'views/index.ejs'));
    });
    // show the login form
    app.get('/login', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render(path.resolve(__dirname, '../', 'views/login.ejs'));
    });
    // show the logout view
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });


    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : false // allow flash messages
    }));

};
