"use strict";

var monocle
  , utils;

try {
  // detect es6 functionality
  eval("(function*() { yield 1 })()");
  monocle = require('./monocle');
  utils = require('./utils');
} catch (e) {
  // otherwise use es5
  monocle = require('./es5/monocle');
  utils = require('./es5/utils');
}

monocle.utils = utils;

module.exports = monocle;
