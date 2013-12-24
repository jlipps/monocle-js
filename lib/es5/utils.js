"use strict";

var monocle = require('./monocle')
  , o_O = monocle.o_O
  , o_C = monocle.o_C;

var utils = {};

utils.sleep = o_O(wrapGenerator.mark(function(seconds) {
  var cb, ms;

  return wrapGenerator(function($ctx) {
    while (1) switch ($ctx.next) {
    case 0:
      cb = o_C();
      ms = Math.floor(seconds * 1000);
      setTimeout(function() { cb(); }, ms);
      $ctx.next = 5;
      return cb;
    case 5:
    case "end":
      return $ctx.stop();
    }
  }, this);
}));

module.exports = utils;
