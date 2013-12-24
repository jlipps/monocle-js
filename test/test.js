"use strict";

var monocle = require('../lib/main.js');
require('./es' + (monocle.native ? '6' : '5') + '/tests.js');
