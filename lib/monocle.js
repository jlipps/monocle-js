"use strict";
var _ = require('underscore')
  , callback = require('./callback');

var monocle = {};

// create a callback with no handlers and set its err/result
var defer = function(err, result) {
  var cb = callback();
  cb(err, result);
  return cb;
};

// create an o-routine callback's handler
var getResultHandler = function(gen, cb) {
  return function(err, res) {
    if (err) {
      chain(err, gen, cb);
    } else {
      chain(res, gen, cb);
    }
  };
};

// check whether a given object is a monocle-specific 'callback'
var isCallback = function(obj) {
  return (typeof obj === 'function' && _.has(obj, '__is_monocle_cb'));
};

// iterate through a generator, doing the appropriate things with the
// result of each 'yield'
var chain = function(toGen, gen, cb) {
  var fromGen, fromGenWrapper;
  while (true) {
    try {
      if (toGen instanceof Error) {
        // if a callback has passed us an error, throw it in the context
        // of the generator where we're waiting for the callback
        fromGenWrapper = gen.throw(toGen);
      } else {
        fromGenWrapper = gen.next(toGen);
      }
      // unwrap the actual response from the generator
      fromGen = fromGenWrapper.value;
    } catch (e) {
      // pass any errors up the chain
      cb(e);
      return cb;
    }

    if (fromGenWrapper.done) {
      // we have reached the end of the generator, which means the result
      // of the last next() should be whatever was 'returned' (or undef).
      // pass it up the chain
      cb(null, fromGen);
      return cb;
    }

    if (!isCallback(fromGen)) {
      // let the user know that yielding anything other than a callback is
      // an error
      cb(new Error("o-routines can only yield callbacks"));
      return cb;
    }

    if (!_.has(fromGen, 'result')) {
      // the user is yielding a callback, so we add a handler which will
      // be called when the callback itself is called
      fromGen.add(getResultHandler(gen, cb));
      return cb;
    }
    // if the callback already has a result, pass it back into the generator
    toGen = fromGen.result;
  }
};

// the monocle decorator
var o_O = function(gen) {
  return function() {
    var result;
    try {
      // start the generator, passing any arguments
      result = gen.apply(this, Array.prototype.slice.call(arguments, 0));
    } catch (e) {
      return defer(e);
    }

    if(result !== null &&
        typeof result.next === 'function' &&
        typeof result.throw === 'function') {
      // if we get an iterator back, we did indeed have a generator, so start
      // the monocle chain with a new main-level callback
      return chain(null, result, callback());
    } else if (isCallback(result)) {
      return result;
    }

    // if a user is monoclizing a non-generator, set up a deferred callback
    // so we return the result of the function straightaway
    return defer(null, result);
  };
};

// kick off an o-routine
monocle.launch = o_O(function*(oroutine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var cb = oroutine.apply(oroutine, args);
  if (!isCallback(cb)) {
    // if we launch something that's not an o-routine, just return it
    // immediately
    return cb;
  }
  // wait for the o-routine to finish and pass the result back
  return (yield cb);
});

// define and launch an o-routine in one go
monocle.run = function(gen, bindObj) {
  var oroutine = o_O(gen).bind(bindObj);
  return monocle.launch(oroutine);
};

// convert a regular node-style callback fn into an o-routine
monocle.monoclize = function(wrappedFn, wrappedObj) {
  return o_O(function*() {
    var cb = callback();
    var args = Array.prototype.slice.call(arguments, 0);
    args.push(cb);
    wrappedFn.apply(wrappedObj, args);
    return (yield cb);
  });
};


// fashion
monocle.o_O = o_O;
monocle.o_0 = o_O;
monocle.o0 = o_O;
monocle.oO = o_O;

// export callback for users
monocle.callback = monocle.oC = monocle.o_C = callback;

module.exports = monocle;
