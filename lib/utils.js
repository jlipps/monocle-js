"use strict";

var monocle = require('./monocle')
  , o_O = monocle.o_O
  , o_C = monocle.o_C;

var utils = {};

utils.sleep = o_O(function*(ms) {
  var cb = o_C();
  setTimeout(function() { cb(); }, ms);
  yield cb;
});

module.exports = utils;
