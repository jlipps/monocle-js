"use strict";

var _ = require('underscore');
var cbCount = 0;

var callback = function() {
  cbCount++;
  var cbId = cbCount;
  //console.log("creating callback " + cbId);

  var cbBindObj = {
    handlers: []
    , id: cbId
  };

  var cb = function() {
    //console.log("callback " + this.id + " is being called back");
    var args = Array.prototype.slice.call(arguments, 0);
    var result;
    var err = null;
    if (args.length === 0) {
      result = null; // no values
    } else if (args.length === 1) {
      err = args[0]; // error
    } else if (args.length === 2 && args[0] === null) {
      result = args[1]; // 1 value
    } else {
      result = args.slice(1);
    }
    if (_.has(this, 'result') || _.has(this, 'error')) {
      throw new Error("Already called back");
    }
    //console.log("setting callback's err to " + JSON.stringify(err).slice(0, 100) + " and result to " + JSON.stringify(result));
    this.result = result;
    this.error = err;
    if (this.handlers.length) {
      //console.log("handlers exist, calling them back");
    } else {
      //console.log("no handlers yet");
      if (this.error) {
        //console.log("got an error but no handlers, gonna throw");
        throw this.error;
      }
    }
    _.each(this.handlers, function(handler) {
      handler(err, result);
    });
  }.bind(cbBindObj);

  cb.__is_monocle_cb = true;

  cb.add = function(handler) {
    //console.log("in cb " + this.id + ", adding handler");
    if (typeof handler !== "function") {
      throw new Error("Object " + JSON.stringify(handler) + " is not a function");
    }
    if (_.has(this, 'error') && _.has(this, 'result')) {
      //console.log('result/error already exist, calling handler immediately');
      return handler(this.error, this.result);
    }
    this.handlers.push(handler);
  }.bind(cbBindObj);

  return cb;
};

module.exports = callback;
