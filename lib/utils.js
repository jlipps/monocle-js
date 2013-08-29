"use strict";

var monocle = require('./monocle')
  , o_O = monocle.o_O
  , o_C = monocle.o_C;

var utils = {};

utils.sleep = o_O(function*(seconds) {
  var cb = o_C();
  var ms = Math.floor(seconds * 1000);
  setTimeout(cb, ms);
  yield cb;
});

module.exports = utils;
