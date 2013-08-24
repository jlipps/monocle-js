"use strict";

var _ = require('underscore');

var CallbackObj = function() {
  //console.log("constructing new callback");
  this.handlers = [];
};

CallbackObj.prototype.handler = function() {
  return this.call.bind(this);
};

CallbackObj.prototype.call = function() {
  //console.log("callback is being called back");
  var args = Array.prototype.slice.call(arguments, 0);
  var result;
  if (args.length === 0) {
    result = null; // no values
  } else if (args.length === 1) {
    result = args[0]; // error
  } else if (args.length === 2 && args[0] === null) {
    result = args[1]; // 1 value
  } else {
    result = args.slice(1);
  }
  if (_.has(this, 'result')) {
    throw new Error("Already called back");
  }
  _.each(this.handlers, function(handler) {
    //console.log("handlers already exist, calling them back");
    handler(result);
  }.bind(this));
  //console.log("setting callback's result to " + JSON.stringify(args));
  this.result = result;
};

CallbackObj.prototype.add = function(handler) {
  if (_.has(this, 'result')) {
    return handler(this.result);
  }
  if (typeof handler !== "function") {
    throw new Error("Object " + JSON.stringify(handler) + " is not a function");
  }
  this.handlers.push(handler);
};

module.exports = CallbackObj;
