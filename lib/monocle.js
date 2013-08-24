"use strict";
var _ = require('underscore')
  , ReturnObj = require('./return')
  , CallbackObj = require('./callback');

var monocle = {};

var Callback = function() {
  return new CallbackObj();
};

var Return = function(value) {
  return new ReturnObj(value);
};

var defer = function(result) {
  var cb = new Callback();
  cb.handler()(result);
  return cb;
};

var chain = function(toGen, gen, cb) {
  var fromGen, fromGenWrapper, err, gotResult;
  var i = 0;
  while (true) {
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
      //console.log("received " + JSON.stringify(fromGen) + " in response");
    } catch (e) {
      //console.log("got error sending to generator, calling cb with error");
      throw e;
    }

    if (fromGenWrapper.done) {
      //console.log("we're done with generator");
      fromGen = new Return();
    }

    if (fromGen instanceof ReturnObj) {
      //console.log("calling cb with value since it's a return");
      cb.handler()(fromGen.value);
      return cb;
    } else if (!(fromGen instanceof CallbackObj)) {
      //console.log(JSON.stringify(fromGen));
      //console.log(fromGen);
      err = new Error("o-routines can only yield ReturnObj and CallbackObj types!");
      return chain(err, gen, cb);
    }

    if (!_.has(fromGen, 'result')) {
      //console.log("fromGen is a callback with no result yet");
      gotResult = function(r) {
        chain(r, gen, cb);
      };
      //console.log("adding handler to fromGen");
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
      //console.log("starting what we think is a generator");
      result = gen.apply(gen, Array.prototype.slice.call(arguments, 0));
    } catch (e) {
      //console.log("could not start the generator, deferring with this error");
      return defer(e);
    }

    if(result !== null &&
        typeof result.next === 'function' &&
        typeof result.throw === 'function') {
      //console.log("we have an iterator, starting the chain");
      return chain(null, result, new Callback());
    } else if (result instanceof CallbackObj) {
      //console.log("we have a CallbackObj, just returning it");
      return result;
    }

    //console.log("we got a result from the 'generator', just defer it");
    //console.log("result was: " + JSON.stringify(result));
    return defer(result);
  };
};

monocle.launch = o_0(function*(oroutine) {
  var args = Array.prototype.slice.call(arguments, 1);
  //console.log("running the oroutine");
  var cb = oroutine.apply(oroutine, args);
  if (!(cb instanceof CallbackObj)) {
    //console.log("didn't get a CallbackObj from the oroutine, ReturnObjing " + JSON.stringify(cb));
    yield new Return(cb);
  }
  var r = yield cb;
  //console.log("got " + JSON.stringify(r) + " as result of oroutine, ReturnObjing");
  yield new Return(r);
});

monocle.run = function(gen) {
  var oroutine = o_0(gen);
  return monocle.launch(oroutine);
};

monocle.Return = Return;
monocle.Callback = Callback;
monocle.o0 = monocle.o_0;

module.exports = monocle;
