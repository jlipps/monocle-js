"use strict";

var Return = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  if (args.length === 1) {
    this.value = args[0];
  } else {
    this.value = args;
  }
};

module.exports = Return;

