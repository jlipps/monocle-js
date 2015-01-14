"use strict";

var features = {
  generators: false,
  proxies: false
};

try {
  // detect es6 functionality
  /* jshint evil:true */
  eval("(function*() { yield 1 })()");
  features.generators = true;
} catch (e) {
  // otherwise use es5 and regenerator
}

features.proxies = typeof Proxy === 'object';

module.exports = features;
