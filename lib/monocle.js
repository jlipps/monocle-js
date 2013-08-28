"use strict";
var _ = require('underscore')
  , callback = require('./callback');

var monocle = {};

var ReturnObj = function(value) {
  this.value = value;
};

var Return = function(value) {
  return new ReturnObj(value);
};

var defer = function(err, result) {
  var cb = callback();
  cb(err, result);
  return cb;
};

var isCallback = function(obj) {
  return (typeof obj === 'function' && _.has(obj, '__is_monocle_cb'));
};

var chain = function(toGen, gen, cb) {
  var fromGen, lastFromGen, fromGenWrapper, gotResult;
  while (true) {
    lastFromGen = fromGen;
    try {
      if (toGen instanceof Error) {
        fromGenWrapper = gen.throw(toGen);
      } else {
        fromGenWrapper = gen.next(toGen);
      }
      fromGen = fromGenWrapper.value;
    } catch (e) {
      cb(e);
      return cb;
    }

    if (fromGenWrapper.done) {
      fromGen = lastFromGen;
      cb(null, lastFromGen);
      return cb;
    }

    if (fromGen instanceof ReturnObj) {
      cb(null, fromGen.value);
      return cb;
    } else if (isCallback(fromGen)) {
      if (!_.has(fromGen, 'result')) {
        gotResult = function(err, res) {
          if (err) {
            chain(err, gen, cb);
          } else {
            chain(res, gen, cb);
          }
        };
        fromGen.add(gotResult);
        return cb;
      }
      toGen = fromGen.result;
    } else {
      toGen = null;
    }
  }
};

var o_0 = monocle.o_0 = monocle.o0 = function(gen) {
  return function() {
    var result;
    try {
      result = gen.apply(this, Array.prototype.slice.call(arguments, 0));
    } catch (e) {
      return defer(e);
    }

    if(result !== null &&
        typeof result.next === 'function' &&
        typeof result.throw === 'function') {
      return chain(null, result, callback());
    } else if (isCallback(result)) {
      return result;
    }

    return defer(null, result);
  };
};

monocle.launch = o_0(function*(oroutine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var cb = oroutine.apply(oroutine, args);
  if (!isCallback(cb)) {
    yield new Return(cb);
  }
  var r = yield cb;
  yield new Return(r);
});

monocle.run = function(gen, bindObj) {
  var oroutine = o_0(gen).bind(bindObj);
  return monocle.launch(oroutine);
};

// also export Return and callback
monocle.Return = monocle.oR = Return;
monocle.callback = monocle.oC = callback;

module.exports = monocle;
