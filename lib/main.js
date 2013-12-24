"use strict";

var nativeGenerators = require('./detect-harmony.js').generators
  , monocle
  , utils;

if (nativeGenerators) {
  monocle = require('./monocle');
  utils = require('./utils');
} else {
  monocle = require('./es5/monocle');
  utils = require('./es5/utils');
}

monocle.utils = utils;
module.exports = monocle;
