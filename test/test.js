/*global it:true, describe:true */
"use strict";

try {
  eval("function*() { yield 1 })()");
  require('./tests.js');
} catch (e) {
  require ('./es5/tests.js');
}
