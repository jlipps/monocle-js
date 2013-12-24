"use strict";

exports.arrayifyResponse = function(args) {
  args = Array.prototype.slice.call(args, 0);
  var result;
  var err = null;
  if (args.length === 0) {
    result = null; // no values
  } else if (args.length === 1) {
    err = args[0]; // error
  } else if (args.length === 2 && args[0] === null) {
    result = args[1]; // 1 value
  } else {
    result = args.slice(1);
  }
  return [err, result];
};
