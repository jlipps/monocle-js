"use strict";

var _ = require('underscore');

var Callback = function() {
  this.handlers = [];
  return this.call.bind(this);
};

Callback.prototype.call = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  if (_.has(this, 'result')) {
    throw new Error("Already called back");
  }
  _.each(this.handlers, function(handler) {
    handler.apply(handler, args);
  }.bind(this));
  this.result = args;
};

Callback.prototype.add = function(handler) {
  if (_.has(this, 'result')) {
    return handler(this.result);
  }
  if (typeof handler !== "function") {
    throw new Error("Object " + JSON.stringify(handler) + " is not a function");
  }
  this.handlers.push(handler);
};

module.exports = Callback;
