"use strict";
var _ = require('underscore')
  , Return = require('./return')
  , Callback = require('./callback');

var monocle = {};

var defer = function(result) {
  var cb = new Callback();
  cb(result);
  return cb;
};

var chain = function(toGen, gen, cb) {
  var fromGen, fromGenWrapper, err, gotResult;
  while (true) {
    try {
      if (toGen instanceof Error) {
        fromGenWrapper = gen.throw(toGen);
      } else {
        fromGenWrapper = gen.next(toGen);
      }
      fromGen = fromGenWrapper.value;
    } catch (e) {
      cb(e);
    }
    if (fromGenWrapper.done) {
      fromGen = new Return();
    }
    if (fromGen instanceof Return) {
      cb(null, fromGen.value);
      return cb;
    } else if (!(fromGen instanceof Callback)) {
      err = new Error("o-routines can only yield Return and Callback types!");
      return chain(err, gen, cb);
    }

    if (!_.has(fromGen, 'result')) {
      gotResult = function(r) {
        chain(r, gen, cb);
      };
      fromGen.add(gotResult);
      return cb;
    }
    toGen = fromGen.result;
  }
};

var o_0 = monocle.o_0 = function(gen) {
  return function() {
    var result;
    try {
      result = gen.apply(gen, Array.prototype.slice.call(arguments, 0));
    } catch (e) {
      return defer(e);
    }

    if(_.has(result, 'next') && _.has(result, 'throw')) {
      return chain(null, result, new Callback());
    } else if (result instanceof Callback) {
      return result;
    }

    return defer(result);
  };
};

monocle.launch = o_0(function*(oroutine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var cb = oroutine.apply(oroutine, args);
  if (!(cb instanceof Callback)) {
    yield new Return(cb);
  }
  var r = yield cb;
  yield Return(r);
});

monocle.run = function(gen) {
  var oroutine = o_0(gen);
  return monocle.launch(oroutine);
};

monocle.Return = Return;
monocle.Callback = Callback;

module.exports = monocle;
