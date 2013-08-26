"use strict";

var _ = require('underscore');

var callback = function() {

  var cbBindObj = {
    handlers: []
  };

  var cb = function() {
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
    });
    //console.log("setting callback's result to " + JSON.stringify(args));
    this.result = result;
  }.bind(cbBindObj);

  cb.__is_monocle_cb = true;

  cb.add = function(handler) {
    //console.log("in cb, adding handler");
    if (_.has(this, 'result')) {
      return handler(this.result);
    }
    if (typeof handler !== "function") {
      throw new Error("Object " + JSON.stringify(handler) + " is not a function");
    }
    this.handlers.push(handler);
  }.bind(cbBindObj);

  return cb;
};

module.exports = callback;
