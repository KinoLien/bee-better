var express = require('express');

var app = express();
var http = require('http');
var passport = require('passport');

// pass passport for configuration
require('./config/passport')(passport); 

// Bootstrap application settings
require('./config/express')(app, passport);

// Bootstrap routes
require('./config/routes')(app, passport);

// Schedules
require('./config/schedule')();

var server = http.createServer(app).listen(app.get('port'));

// socket init
// var environment = require('./config/environment.js');
// var io = environment.loadSocketIo(server);

// environment.authorize(io);
