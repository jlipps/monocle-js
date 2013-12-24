"use strict";

var monocle
  , utils;
try {
  eval("function*() { yield 1 })()");
  monocle = require('./monocle');
  utils = require('./utils');
} catch (e) {
  monocle = require('./es5/monocle');
  utils = require('./es5/utils');
}

monocle.utils = utils;

module.exports = monocle;
