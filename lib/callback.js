"use strict";

var _ = require('underscore')
  , arrayifyResponse = require('./helpers').arrayifyResponse;

// callback is a function so that it can be callable
// we add properties so we can detect that it's a monocle callback
// essentially treating the return of callback() as an instance of a
// 'Callback' class

var callback = function() {

  var cbBindObj = {
    handlers: []
  };

  // when cb is called back, it expects a node-style calling signature
  // i.e., the first parameter is the error or null, and subsequent
  // parameters are response values
  var cb = function() {
    if (_.has(this, 'result') || _.has(this, 'error')) {
      throw new Error("Already called back");
    }
    var arrayified = arrayifyResponse(arguments);
    this.error = arrayified[0];
    this.result = arrayified[1];

    // go through any attached handlers and pass them whatever came to us
    _.each(this.handlers, function(handler) {
      if (this.error) {
        return handler(this.error);
      }
      handler(null, this.result);
    }.bind(this));
  }.bind(cbBindObj);

  // 'hidden' variable used to tell monocle this is a monocle-style callback
  cb.__is_monocle_cb = true;

  cb.add = function(handler) {
    if (typeof handler !== "function") {
      throw new Error("Object " + JSON.stringify(handler) + " is not a function");
    }

    // if the callback has been called back already, pass results to handler
    // immediately
    if (_.has(this, 'error') && _.has(this, 'result')) {
      if (this.error) {
        return handler(this.error);
      }
      handler(null, this.result);
    }
    this.handlers.push(handler);
  }.bind(cbBindObj);

  cb.errIsHandled = false;
  cb.handleError = function(handler) {
    cb.errIsHandled = true;
    cb.add(handler);
  }.bind(cbBindObj);

  cb.fin = cb.handleError;
  cb.nodeify = cb.handleError;

  return cb;
};


module.exports = callback;
