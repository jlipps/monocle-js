/*global Proxy:true */
"use strict";

var _ = require('underscore')
  , native = require('./detect-harmony.js').generators
  , arrayifyResponse = require('./helpers').arrayifyResponse
  , callback = require('./callback');

var alreadyReflected = typeof Proxy !== "undefined" &&
                       Proxy &&
                       typeof Proxy.revocable === "function";

if (native && !alreadyReflected) {
  require('harmony-reflect'); // get proxy support
}

var monocle = {};
monocle.native = native;

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

// check whether a given object is a promise
var isPromise = function(obj) {
  try {
    return Object.prototype.toString.call(obj.then).indexOf('Function') !== -1;
  } catch (e) {
    return false;
  }
};

var cleanupErrStack = function(err) {
  var chainSigRe = '(^.+at Object.<anonymous>.+monocle\.js.+$\n)?' +
                   '^.+at GeneratorFunctionPrototype\.next.+$\n' +
                   '^.+at chain.+monocle\.js.+$\n' +
                   '^.+at .+monocle\.js.+$\n';
  var re = new RegExp(chainSigRe, 'mg');
  if (re.exec(err.stack)) {
    err.stack = err.stack.replace(re, '');
  }
  return err;
};

var convertPromise = function(promise) {
  var cb = callback();
  promise.then(function() {
    var responses = Array.prototype.slice.call(arguments, 0);
    responses.unshift(null);
    cb.apply(cb, responses);
  }, function(err) {
    cb(err);
  });
  return cb;
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
      cb(cleanupErrStack(e));
      return cb;
    }

    if (fromGenWrapper.done) {
      // we have reached the end of the generator, which means the result
      // of the last next() should be whatever was 'returned' (or undef).
      // pass it up the chain
      cb(null, fromGen);
      return cb;
    }

    if (isPromise(fromGen)) {
      // turn the promise into a callback
      fromGen = convertPromise(fromGen);
    }

    if (!isCallback(fromGen)) {
      // let the user know that yielding anything other than a callback is
      // an error
      cb(new Error("o-routines can only yield callbacks and promises"));
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
      return chain(undefined, result, callback());
    } else if (isCallback(result)) {
      return result;
    }

    // if a user is monoclizing a non-generator, set up a deferred callback
    // so we return the result of the function straightaway
    return defer(null, result);
  };
};

if (native) {
  var o_P = function(gen, props) {
    if (typeof props === "undefined") {
      props = [];
    }
    if (!(props instanceof Array)) {
      throw new Error("Chained property list must be an array");
    }
    var makeCbProxy = function(cb) {
      var handler = {
        get: function(tgt, name) {
          if (name in tgt || name === "inspect" || name === "then") {
            return tgt[name];
          } else if (/^[0-9]$/.test(name.toString()) || _.contains(props, name)) {
            // we're trying to get a property/index
            // just give a proxy for the actual property
            var propCb = callback();
            cb.add(function(err, res) {
              if (err) return propCb(err);
              propCb(null, res[name]);
            });
            return makeCbProxy(propCb);
          } else {
            // we're trying to call a method
            // give a proxy for the method call
            return o_P(function*() {
              var args = Array.prototype.slice.call(arguments);
              var res = yield cb;
              var fin = (yield res[name].apply(res, args));
              return fin;
            }, props);
          }
        }
      };
      return Proxy(cb, handler);
    };

    return function() {
      var mainCb = o_O(gen).apply(this, Array.prototype.slice.call(arguments));
      return makeCbProxy(mainCb);
    };
  };
}

// kick off an o-routine
monocle.launch = function(oroutine) {
  var args = Array.prototype.slice.call(arguments, 1);
  var cb;
  try {
    cb = oroutine.apply(oroutine, args);
  } catch (err) {
    console.log("got an initial err: " + err);
  }
  if (!isCallback(cb)) {
    // if we launch something that's not an o-routine, just return it
    // immediately
    return cb;
  }

  // make sure that any errors that get passed up but not handled get thrown
  // a user handles an error by defining .fin or .nodeify on the cb
  cb.add(function(err) {
    // if an error is thrown before the eventloop goes around, we won't know
    // that someone has actually attached a handler. So wait a tick.
    setTimeout(function() {
      if (!cb.errIsHandled && err) {
        throw err;
      }
    });
  });

  return cb;
};

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

// run multiple o-routines paralleltaneously
monocle.parallel = o_O(function*(oroutines) {
  var allDone = callback()
    , numCompleted = 0
    , responses = []
    , allErrors = [];
  var onOroutineComplete = function(index, err, res) {
    if (err) {
      allErrors.push(err);
    }
    responses[index] = res;
    numCompleted++;
    if (numCompleted === oroutines.length) {
      allDone();
    }
  };
  _.each(oroutines, function(oroutine, index) {
    var args;
    if (typeof oroutine === "function") {
      args = [];
    } else {
      args = oroutine.slice(1);
      oroutine = oroutine[0];
    }
    oroutine.apply(oroutine, args).add(function() {
      var arrayified = arrayifyResponse(arguments);
      onOroutineComplete(index, arrayified[0], arrayified[1]);
    });
  });
  yield allDone;
  if (allErrors.length > 0) {
    var mainError = new Error("One or more parallel o-routines failed to " +
        "complete successfully. Error objects available as this.allErrors");
    mainError.allErrors = allErrors;
    throw mainError;
  }
  return responses;
});


// fashion
monocle.o_O = o_O;
monocle.o_0 = o_O;
monocle.o0 = o_O;
monocle.oO = o_O;
if (native) {
  monocle.o_P = monocle.chainable = monocle.o_p = monocle.p_o = o_P;
}
monocle.ll = monocle.parallel;
monocle.go = monocle.run;
monocle.m = monocle.monoclize;
monocle.o_M = monocle.monoclize;

// export callback for users
monocle.callback = monocle.oC = monocle.o_C = callback;

module.exports = monocle;
