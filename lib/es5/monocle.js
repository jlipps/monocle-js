/**
 * Copyright (c) 2013, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

(function(
  // Reliable reference to the global object (i.e. window in browsers).
  global,

  // Dummy constructor that we use as the .constructor property for
  // functions that return Generator objects.
  GeneratorFunction
) {
  var hasOwn = Object.prototype.hasOwnProperty;

  if (global.wrapGenerator) {
    return;
  }

  function wrapGenerator(innerFn, self) {
    return new Generator(innerFn, self || null);
  }

  global.wrapGenerator = wrapGenerator;
  if (typeof exports !== "undefined") {
    exports.wrapGenerator = wrapGenerator;
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  wrapGenerator.mark = function(genFun) {
    genFun.constructor = GeneratorFunction;
    return genFun;
  };

  // Ensure isGeneratorFunction works when Function#name not supported.
  if (GeneratorFunction.name !== "GeneratorFunction") {
    GeneratorFunction.name = "GeneratorFunction";
  }

  wrapGenerator.isGeneratorFunction = function(genFun) {
    var ctor = genFun && genFun.constructor;
    return ctor ? GeneratorFunction.name === ctor.name : false;
  };

  function Generator(innerFn, self) {
    var generator = this;
    var context = new Context();
    var state = GenStateSuspendedStart;

    function invoke() {
      state = GenStateExecuting;
      do {
        var value = innerFn.call(self, context);
      } while (value === ContinueSentinel);
      // If an exception is thrown from innerFn, we leave state ===
      // GenStateExecuting and loop back for another invocation.
      state = context.done
        ? GenStateCompleted
        : GenStateSuspendedYield;
      return { value: value, done: context.done };
    }

    function assertCanInvoke() {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        throw new Error("Generator has already finished");
      }
    }

    function handleDelegate(method, arg) {
      var delegate = context.delegate;
      if (delegate) {
        try {
          var info = delegate.generator[method](arg);
        } catch (uncaught) {
          context.delegate = null;
          return generator.throw(uncaught);
        }

        if (info) {
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            return info;
          }
        }

        context.delegate = null;
      }
    }

    generator.next = function(value) {
      assertCanInvoke();

      var delegateInfo = handleDelegate("next", value);
      if (delegateInfo) {
        return delegateInfo;
      }

      if (state === GenStateSuspendedYield) {
        context.sent = value;
      }

      while (true) try {
        return invoke();
      } catch (exception) {
        context.dispatchException(exception);
      }
    };

    generator.throw = function(exception) {
      assertCanInvoke();

      var delegateInfo = handleDelegate("throw", exception);
      if (delegateInfo) {
        return delegateInfo;
      }

      if (state === GenStateSuspendedStart) {
        state = GenStateCompleted;
        throw exception;
      }

      while (true) {
        context.dispatchException(exception);
        try {
          return invoke();
        } catch (thrown) {
          exception = thrown;
        }
      }
    };
  }

  Generator.prototype.toString = function() {
    return "[object Generator]";
  };

  function Context() {
    this.reset();
  }

  Context.prototype = {
    constructor: Context,

    reset: function() {
      this.next = 0;
      this.sent = void 0;
      this.tryStack = [];
      this.done = false;
      this.delegate = null;

      // Pre-initialize at least 20 temporary variables to enable hidden
      // class optimizations for simple generators.
      for (var tempIndex = 0, tempName;
           hasOwn.call(this, tempName = "t" + tempIndex) || tempIndex < 20;
           ++tempIndex) {
        this[tempName] = null;
      }
    },

    stop: function() {
      this.done = true;

      if (hasOwn.call(this, "thrown")) {
        var thrown = this.thrown;
        delete this.thrown;
        throw thrown;
      }

      return this.rval;
    },

    keys: function(object) {
      return Object.keys(object).reverse();
    },

    pushTry: function(catchLoc, finallyLoc, finallyTempVar) {
      if (finallyLoc) {
        this.tryStack.push({
          finallyLoc: finallyLoc,
          finallyTempVar: finallyTempVar
        });
      }

      if (catchLoc) {
        this.tryStack.push({
          catchLoc: catchLoc
        });
      }
    },

    popCatch: function(catchLoc) {
      var lastIndex = this.tryStack.length - 1;
      var entry = this.tryStack[lastIndex];

      if (entry && entry.catchLoc === catchLoc) {
        this.tryStack.length = lastIndex;
      }
    },

    popFinally: function(finallyLoc) {
      var lastIndex = this.tryStack.length - 1;
      var entry = this.tryStack[lastIndex];

      if (!entry || !hasOwn.call(entry, "finallyLoc")) {
        entry = this.tryStack[--lastIndex];
      }

      if (entry && entry.finallyLoc === finallyLoc) {
        this.tryStack.length = lastIndex;
      }
    },

    dispatchException: function(exception) {
      var finallyEntries = [];
      var dispatched = false;

      if (this.done) {
        throw exception;
      }

      // Dispatch the exception to the "end" location by default.
      this.thrown = exception;
      this.next = "end";

      for (var i = this.tryStack.length - 1; i >= 0; --i) {
        var entry = this.tryStack[i];
        if (entry.catchLoc) {
          this.next = entry.catchLoc;
          dispatched = true;
          break;
        } else if (entry.finallyLoc) {
          finallyEntries.push(entry);
          dispatched = true;
        }
      }

      while ((entry = finallyEntries.pop())) {
        this[entry.finallyTempVar] = this.next;
        this.next = entry.finallyLoc;
      }
    },

    delegateYield: function(generator, resultName, nextLoc) {
      var info = generator.next(this.sent);

      if (info.done) {
        this.delegate = null;
        this[resultName] = info.value;
        this.next = nextLoc;

        return ContinueSentinel;
      }

      this.delegate = {
        generator: generator,
        resultName: resultName,
        nextLoc: nextLoc
      };

      return info.value;
    }
  };
}).apply(this, Function("return [this, function GeneratorFunction(){}]")());

"use strict";
var _ = require('underscore')
  , harmony = false
  , arrayifyResponse = require('./helpers').arrayifyResponse
  , callback = require('./callback');

if (harmony) {
  require('harmony-reflect'); // get proxy support
}

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
      return chain(null, result, callback());
    } else if (isCallback(result)) {
      return result;
    }

    // if a user is monoclizing a non-generator, set up a deferred callback
    // so we return the result of the function straightaway
    return defer(null, result);
  };
};

if (harmony) {
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
            return o_P(wrapGenerator.mark(function() {
              var args, res, fin, $args = arguments;

              return wrapGenerator(function($ctx) {
                while (1) switch ($ctx.next) {
                case 0:
                  args = Array.prototype.slice.call($args);
                  $ctx.next = 3;
                  return cb;
                case 3:
                  res = $ctx.sent;
                  $ctx.next = 6;
                  return res[name].apply(res, args);
                case 6:
                  fin = $ctx.sent;
                  $ctx.rval = fin;
                  delete $ctx.thrown;
                  $ctx.next = 11;
                  break;
                case 11:
                case "end":
                  return $ctx.stop();
                }
              }, this);
            }), props);
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
monocle.launch = o_O(wrapGenerator.mark(function(oroutine) {
  var args, cb, $args = arguments;

  return wrapGenerator(function($ctx) {
    while (1) switch ($ctx.next) {
    case 0:
      args = Array.prototype.slice.call($args, 1);
      cb = oroutine.apply(oroutine, args);

      if (!!isCallback(cb)) {
        $ctx.next = 7;
        break;
      }

      $ctx.rval = cb;
      delete $ctx.thrown;
      $ctx.next = 13;
      break;
    case 7:
      $ctx.next = 9;
      return cb;
    case 9:
      $ctx.rval = $ctx.sent;
      delete $ctx.thrown;
      $ctx.next = 13;
      break;
    case 13:
    case "end":
      return $ctx.stop();
    }
  }, this);
}));

// define and launch an o-routine in one go
monocle.run = function(gen, bindObj) {
  var oroutine = o_O(gen).bind(bindObj);
  var cb = monocle.launch(oroutine);
  cb.add(function(err, res) {
    if (err) throw err;
  });
  return cb;
};

// convert a regular node-style callback fn into an o-routine
monocle.monoclize = function(wrappedFn, wrappedObj) {
  return o_O(wrapGenerator.mark(function() {
    var cb, args, $args = arguments;

    return wrapGenerator(function($ctx) {
      while (1) switch ($ctx.next) {
      case 0:
        cb = callback();
        args = Array.prototype.slice.call($args, 0);
        args.push(cb);
        wrappedFn.apply(wrappedObj, args);
        $ctx.next = 6;
        return cb;
      case 6:
        $ctx.rval = $ctx.sent;
        delete $ctx.thrown;
        $ctx.next = 10;
        break;
      case 10:
      case "end":
        return $ctx.stop();
      }
    }, this);
  }));
};

// run multiple o-routines paralleltaneously
monocle.parallel = o_O(wrapGenerator.mark(function(oroutines) {
  var allDone, numCompleted, responses, allErrors, onOroutineComplete, mainError;

  return wrapGenerator(function($ctx) {
    while (1) switch ($ctx.next) {
    case 0:
      allDone = callback(), numCompleted = 0, responses = [], allErrors = [];

      onOroutineComplete = function(index, err, res) {
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

      $ctx.next = 5;
      return allDone;
    case 5:
      if (!(allErrors.length > 0)) {
        $ctx.next = 9;
        break;
      }

      mainError = new Error("One or more parallel o-routines failed to " +
          "complete successfully. Error objects available as this.allErrors");

      mainError.allErrors = allErrors;
      throw mainError;
    case 9:
      $ctx.rval = responses;
      delete $ctx.thrown;
      $ctx.next = 13;
      break;
    case 13:
    case "end":
      return $ctx.stop();
    }
  }, this);
}));


// fashion
monocle.o_O = o_O;
monocle.o_0 = o_O;
monocle.o0 = o_O;
monocle.oO = o_O;
if (harmony) {
  monocle.o_P = monocle.chainable = monocle.o_p = monocle.p_o = o_P;
}
monocle.ll = monocle.parallel;
monocle.go = monocle.run;

// export callback for users
monocle.callback = monocle.oC = monocle.o_C = callback;

module.exports = monocle;
