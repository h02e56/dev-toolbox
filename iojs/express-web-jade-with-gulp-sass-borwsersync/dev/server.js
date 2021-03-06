'use strict';

let path = require('path');
let http = require('http');
let express = require('express');
let debug = require('debug');
let routesConfigurer = require('./routes');
let middlewares = require('./middlewares');

let server = null;

function start(config, callback) {
  let expressApp = express();
  let routes = routesConfigurer(config);
  debug = debug(config.debug.namespace + ':server');

  middlewares = middlewares(config);
  server = http.createServer(expressApp);
  expressApp.set('view engine', 'jade');
  expressApp.set('views', path.join(__dirname, 'views'));
  expressApp.set('etag', 'weak');

  // Pre-routing middlewares
  expressApp.use(middlewares.requestLogger);
  expressApp.use(middlewares.generalCachingPolicy);
  expressApp.use(middlewares.bodyParser);

  // Static assets
  expressApp.use('/styles', express.static(path.join(__dirname, 'public/styles')));
  expressApp.use('/scripts', express.static(path.join(__dirname, 'public/scripts')));
  expressApp.use('/images', express.static(path.join(__dirname, 'public/images')));
  expressApp.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));
  expressApp.use(middlewares.generalCachingPolicy);

  // Routes
  Object.keys(routes).forEach(function (route) {
    expressApp.use('/' + route, routes[route]);
  });

  // Post-send middlewares
  expressApp.use(middlewares.notFoundHandler);
  expressApp.use(middlewares.errorHandler);

  server.listen(config.port, config.ipAddress, function () {
    if (config.ipAddress) {
      debug('Server running on port %s:%s', config.ipAddress, config.port);
    } else {
      debug('Server running on port %s', config.port);
    }

    if (callback) {
      callback();
    }
  });
}

function stop(callback) {
  if (server) {
    server.close(callback);
    server = null;
  } else {
    if (callback) {
      setImmediate(callback());
    }
  }
}

module.exports = {
  start: start,
  stop: stop
};
