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
  //console.log("checking whether " + obj + " is a cb");
  var is = (typeof obj === 'function' && _.has(obj, '__is_monocle_cb'));
  //console.log(is);
  return is;
};

var chain = function(toGen, gen, cb) {
  var fromGen, lastFromGen, fromGenWrapper, err, gotResult;
  var i = 0;
  while (true) {
    lastFromGen = fromGen;
    i++;
    //console.log("it's the " + i + "th time through the loop");
    try {
      if (toGen instanceof Error) {
        //console.log("toGen is an error, throwing back to generator");
        //console.log(toGen);
        fromGenWrapper = gen.throw(toGen);
      } else {
        //console.log("sending " + JSON.stringify(toGen) + " to generator");
        fromGenWrapper = gen.next(toGen);
      }
      fromGen = fromGenWrapper.value;
      //console.log("received " + JSON.stringify(fromGenWrapper) + " in response");
    } catch (e) {
      //console.log("got error sending to generator, calling cb with error");
      cb(e);
      return cb;
    }

    if (fromGenWrapper.done) {
      //console.log("we're done with generator");
      fromGen = lastFromGen;
      //console.log("sending " + fromGen + " to callback");
      cb(null, lastFromGen);
      return cb;
    }

    if (fromGen instanceof ReturnObj) {
      //console.log("calling cb with value since it's a return");
      cb(null, fromGen.value);
      return cb;
    } else if (isCallback(fromGen)) {
      if (!_.has(fromGen, 'result')) {
        //console.log("fromGen is a callback with no result yet");
        gotResult = function(err, res) {
          //console.log("Got result from callback, it's " + res);
          if (err) {
            chain(err, gen, cb);
          } else {
            chain(res, gen, cb);
          }
        };
        //console.log("adding handler to fromGen");
        fromGen.add(gotResult);
        return cb;
      }
      toGen = fromGen.result;
    } else {
      toGen = null;
    }
  }
};

var o_0 = monocle.o_0 = function(gen) {
  return function() {
    var result;
    try {
      //console.log("starting what we think is a generator");
      result = gen.apply(this, Array.prototype.slice.call(arguments, 0));
    } catch (e) {
      //console.log("could not start the generator, deferring with this error");
      return defer(e);
    }

    if(result !== null &&
        typeof result.next === 'function' &&
        typeof result.throw === 'function') {
      //console.log("we have an iterator, starting the chain");
      return chain(null, result, callback());
    } else if (isCallback(result)) {
      //console.log("we have a CallbackObj, just returning it");
      return result;
    }

    //console.log("we got a result from the 'generator', just defer it");
    //console.log("result was: " + JSON.stringify(result));
    return defer(null, result);
  };
};

monocle.launch = o_0(function*(oroutine) {
  var args = Array.prototype.slice.call(arguments, 1);
  //console.log("running the oroutine");
  var cb = oroutine.apply(oroutine, args);
  if (!isCallback(cb)) {
    //console.log("didn't get a CallbackObj from the oroutine, ReturnObjing " + JSON.stringify(cb));
    yield new Return(cb);
  }
  //console.log("yielding the main callback");
  var r = yield cb;
  //console.log("got " + JSON.stringify(r) + " as result of oroutine, ReturnObjing");
  yield new Return(r);
});

monocle.run = function(gen, bindObj) {
  var oroutine = o_0(gen).bind(bindObj);
  return monocle.launch(oroutine);
};

monocle.Return = Return;
monocle.callback = callback;
monocle.o0 = monocle.o_0;

module.exports = monocle;
