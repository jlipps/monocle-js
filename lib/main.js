"use strict";

console.log("This version of monocle has been deprecated. The new package " +
            "name is monocle-js; it's no longer monocle.js. So please " +
            "`npm install monocle-js` or require('monocle-js') instead " +
            "and continue to enjoy monocle!");

var monocle = require('./monocle')
  , utils = require('./utils');

monocle.utils = utils;

module.exports = monocle;
