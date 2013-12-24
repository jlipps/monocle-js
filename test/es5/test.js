/*global it:true, describe:true */
"use strict";

var monocle = require('../../lib/es5/main.js')
  , harmony = false
  , _ = require('underscore')
  , o_O = monocle.o_O
  , launch = monocle.launch
  , run = monocle.run
  , Q = require("q")
  , parallel = monocle.parallel
  , Return = monocle.Return
  , o_C = monocle.callback
  , sleep = monocle.utils.sleep
  , should = require('should');

if (harmony) {
  var o_P = monocle.o_P;
}

var square = o_O(wrapGenerator.mark(function(x) {
  return wrapGenerator(function($ctx) {
    while (1) switch ($ctx.next) {
    case 0:
      $ctx.rval = x * x;
      delete $ctx.thrown;
      $ctx.next = 4;
      break;
    case 4:
    case "end":
      return $ctx.stop();
    }
  }, this);
}));

var cube = o_O(wrapGenerator.mark(function(x) {
  var squareOfX;

  return wrapGenerator(function($ctx) {
    while (1) switch ($ctx.next) {
    case 0:
      $ctx.next = 2;
      return square(x);
    case 2:
      squareOfX = $ctx.sent;
      $ctx.rval = x * squareOfX;
      delete $ctx.thrown;
      $ctx.next = 7;
      break;
    case 7:
    case "end":
      return $ctx.stop();
    }
  }, this);
}));

var promiseSleep = function(ms, shouldThrow) {
  var deferred = Q.defer();
  setTimeout(function() {
    if (shouldThrow) {
      deferred.reject(new Error("sleeping sucks!"));
    } else {
      deferred.resolve(ms);
    }
  }, ms);
  return deferred.promise;
};

describe('monocle', function() {
  it('should not reach code after returns', function(done) {
    var shouldntChange = "foo";
    var square = o_O(wrapGenerator.mark(function(x) {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.rval = x * x;
          delete $ctx.thrown;
          $ctx.next = 5;
          break;
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var s;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return square(3);
        case 2:
          s = $ctx.sent;
          s.should.equal(9);
          shouldntChange.should.equal('foo');
          done();
        case 6:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should not yield anything other than callbacks', function(done) {
    var badYield = o_O(wrapGenerator.mark(function() {
      var s;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return square(3);
        case 2:
          s = $ctx.sent;
          $ctx.next = 5;
          return s;
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var err, s;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.pushTry(7, null, null);
          $ctx.next = 3;
          return badYield();
        case 3:
          s = $ctx.sent;
          $ctx.popCatch(7);
          $ctx.next = 11;
          break;
        case 7:
          $ctx.popCatch(7);
          $ctx.t0 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t0;
        case 11:
          should.exist(err);
          err.message.should.include("o-routines can only yield callbacks");
          done();
        case 14:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should yield undefined as default return', function(done) {
    var f = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return sleep(0.1);
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var res;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return f();
        case 2:
          res = $ctx.sent;
          (typeof res).should.equal("undefined");
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should work with async methods', function(done) {
    var f1 = o_O(wrapGenerator.mark(function() {
      var cb;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          cb = o_C();
          setTimeout(cb, 500);
          $ctx.next = 4;
          return cb;
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var start;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.next = 3;
          return f1();
        case 3:
          (Date.now() - start).should.be.above(490);
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should catch exceptions and exit oroutine', function(done) {
    var shouldntChange = "foo";
    var fail1 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          throw new Error("foo bar baz");
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var fail2 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return fail1();
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var err;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.pushTry(6, null, null);
          $ctx.next = 3;
          return fail2();
        case 3:
          $ctx.popCatch(6);
          $ctx.next = 10;
          break;
        case 6:
          $ctx.popCatch(6);
          $ctx.t1 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t1;
        case 10:
          should.exist(err);
          err.message.should.equal("foo bar baz");
          shouldntChange.should.equal("foo");
          done();
        case 14:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should catch exceptions in async functions', function(done) {
    var shouldntChange = "foo";
    var errInAsync = function(cb) {
      cb(new Error("foo bar baz"));
    };
    var fail1 = o_O(wrapGenerator.mark(function() {
      var cb;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          cb = o_C();
          errInAsync(cb);
          $ctx.next = 4;
          return cb;
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var fail2 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return fail1();
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var err;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.pushTry(6, null, null);
          $ctx.next = 3;
          return fail2();
        case 3:
          $ctx.popCatch(6);
          $ctx.next = 10;
          break;
        case 6:
          $ctx.popCatch(6);
          $ctx.t2 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t2;
        case 10:
          should.exist(err);
          err.message.should.equal("foo bar baz");
          shouldntChange.should.equal("foo");
          done();
        case 14:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should have clean error traces', function(done) {
    var shouldntChange = "foo";
    var errInAsync = function(cb) {
      cb(new Error("foo bar baz"));
    };
    var fail1 = o_O(wrapGenerator.mark(function() {
      var cb;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          cb = o_C();
          errInAsync(cb);
          $ctx.next = 4;
          return cb;
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var fail2 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return fail1();
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var err, re, matches;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.pushTry(6, null, null);
          $ctx.next = 3;
          return fail2();
        case 3:
          $ctx.popCatch(6);
          $ctx.next = 10;
          break;
        case 6:
          $ctx.popCatch(6);
          $ctx.t3 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t3;
        case 10:
          should.exist(err);
          re = new RegExp("monocle\.js", "g");
          matches = re.exec(err.stack);
          matches.length.should.not.be.above(1);
          err.message.should.equal("foo bar baz");
          shouldntChange.should.equal("foo");
          done();
        case 17:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should work with launch', function(done) {
    launch(o_O(wrapGenerator.mark(function() {
      var x;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return square(5);
        case 2:
          x = $ctx.sent;
          x.should.equal(25);
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    })));
  });

  it('should work with embedded o-routines', function(done) {
    run(wrapGenerator.mark(function() {
      var x;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return cube(3);
        case 2:
          x = $ctx.sent;
          x.should.equal(27);
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should pass multiple parameters to o-routine', function(done) {
    var add = o_O(wrapGenerator.mark(function(x, y) {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.rval = x + y;
          delete $ctx.thrown;
          $ctx.next = 4;
          break;
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var sum;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return add(3, 6);
        case 2:
          sum = $ctx.sent;
          sum.should.equal(9);
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should handle converting node-style async err handling', function(done) {
    var asyncFn = function(shouldErr, cb) {
      setTimeout(function() {
        if (shouldErr) {
          return cb(new Error("bad"));
        }
        cb(null, "yay!");
      }, 500);
    };
    var syncFn = o_O(wrapGenerator.mark(function(shouldErr) {
      var cb;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          cb = o_C();
          asyncFn(shouldErr, cb);
          $ctx.next = 4;
          return cb;
        case 4:
          $ctx.rval = $ctx.sent;
          delete $ctx.thrown;
          $ctx.next = 8;
          break;
        case 8:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var res, err;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return syncFn(false);
        case 2:
          res = $ctx.sent;
          res.should.equal("yay!");
          $ctx.pushTry(11, null, null);
          $ctx.next = 7;
          return syncFn(true);
        case 7:
          res = $ctx.sent;
          $ctx.popCatch(11);
          $ctx.next = 15;
          break;
        case 11:
          $ctx.popCatch(11);
          $ctx.t4 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t4;
        case 15:
          should.exist(err);
          err.message.should.equal("bad");
          done();
        case 18:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should bind generators to calling object', function(done) {
    var bindObj = {
      foo: 'bar'
    };

    bindObj.gen = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.rval = this.foo;
          delete $ctx.thrown;
          $ctx.next = 4;
          break;
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));

    run(wrapGenerator.mark(function() {
      var res;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return this.gen();
        case 2:
          res = $ctx.sent;
          res.should.equal('bar');
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }), bindObj);
  });

  it('should work with classes', function(done) {
    var MyClass = function() {
      this.foo = 'bar';
    };
    MyClass.prototype.myOroutine = o_O(wrapGenerator.mark(function() {
      var s;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return square(3);
        case 2:
          s = $ctx.sent;
          $ctx.rval = this.foo + ' ' + s;
          delete $ctx.thrown;
          $ctx.next = 7;
          break;
        case 7:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    MyClass.prototype.run = function(gen) {
      run(gen, this);
    };
    var obj = new MyClass();
    obj.run(wrapGenerator.mark(function() {
      var res;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return this.myOroutine();
        case 2:
          res = $ctx.sent;
          res.should.equal('bar 9');
          done();
        case 5:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should unravel lots of callbacks', function(done) {
    run(wrapGenerator.mark(function() {
      var i;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          i = 0;
        case 1:
          if (!(i < 100)) {
            $ctx.next = 7;
            break;
          }

          $ctx.next = 4;
          return sleep(0.02);
        case 4:
          i++;
          $ctx.next = 1;
          break;
        case 7:
          i.should.equal(100);
          done();
        case 10:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should defer non-generator "o-routines"', function(done) {
    var notAGenerator = o_O(function() {
      return 'foo';
    });
    run(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return notAGenerator();
        case 2:
          $ctx.sent.should.equal("foo");
          done();
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should yield to monocle callbacks', function(done) {
    run(wrapGenerator.mark(function() {
      var cb, start;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          cb = o_C();
          start = Date.now();
          setTimeout(cb, 500);
          $ctx.next = 5;
          return cb;
        case 5:
          (Date.now() - start).should.be.above(490);
          done();
        case 7:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should allow parallel execution', function(done) {
    var f1 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return sleep(0.5);
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f2 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return sleep(0.25);
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f3 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $ctx.next = 2;
          return sleep(0.33);
        case 2:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var start, end;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.next = 3;
          return parallel([f1, f2, f3]);
        case 3:
          end = Date.now();
          (end - start).should.be.above(490);
          (end - start).should.be.below(749);
          done();
        case 7:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should pass parameters to parallel oroutines', function(done) {
    var f1 = o_O(wrapGenerator.mark(function(val) {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          val.should.equal("1");
          $ctx.next = 3;
          return sleep(0.5);
        case 3:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f2 = o_O(wrapGenerator.mark(function(val1, val2) {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          val1.should.equal("foo");
          val2.should.equal("bar");
          $ctx.next = 4;
          return sleep(0.25);
        case 4:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f3 = o_O(wrapGenerator.mark(function() {
      var $args = arguments;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $args.length.should.equal(0);
          $ctx.next = 3;
          return sleep(0.33);
        case 3:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f4 = o_O(wrapGenerator.mark(function() {
      var $args = arguments;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $args.length.should.equal(0);
        case 1:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var start, end;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.next = 3;
          return parallel([[f1, "1"], [f2, "foo", "bar"], [f3], f4]);
        case 3:
          end = Date.now();
          (end - start).should.be.above(490);
          (end - start).should.be.below(740);
          done();
        case 7:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should return values from parallel oroutines', function(done) {
    var f1 = o_O(wrapGenerator.mark(function(val) {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          val.should.equal("1");
          $ctx.next = 3;
          return sleep(0.5);
        case 3:
          $ctx.rval = 'a';
          delete $ctx.thrown;
          $ctx.next = 7;
          break;
        case 7:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f2 = o_O(wrapGenerator.mark(function(val1, val2) {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          val1.should.equal("foo");
          val2.should.equal("bar");
          $ctx.next = 4;
          return sleep(0.25);
        case 4:
          $ctx.rval = 'b';
          delete $ctx.thrown;
          $ctx.next = 8;
          break;
        case 8:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var f3 = o_O(wrapGenerator.mark(function() {
      var $args = arguments;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          $args.length.should.equal(0);
          $ctx.next = 3;
          return sleep(0.33);
        case 3:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    run(wrapGenerator.mark(function() {
      var start, res, end;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.next = 3;
          return parallel([[f1, "1"], [f2, "foo", "bar"], f3]);
        case 3:
          res = $ctx.sent;
          end = Date.now();
          (end - start).should.be.above(490);
          (end - start).should.be.below(740);
          res.should.eql(["a", "b", undefined]);
          done();
        case 9:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should not swallow errors in run (oroutine)', function(done) {
    var f1 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          throw new Error('oh noes!');
        case 1:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var err;
    try {
      run(wrapGenerator.mark(function() {
        return wrapGenerator(function($ctx) {
          while (1) switch ($ctx.next) {
          case 0:
            $ctx.next = 2;
            return f1();
          case 2:
          case "end":
            return $ctx.stop();
          }
        }, this);
      }));
    } catch (e) {
      err = e;
    }
    should.exist(err);
    err.message.should.equal('oh noes!');
    done();
  });

  it('should not swallow errors in run (local)', function(done) {
    var err;
    try {
      run(wrapGenerator.mark(function() {
        return wrapGenerator(function($ctx) {
          while (1) switch ($ctx.next) {
          case 0:
            throw new Error("foobar!");
          case 1:
          case "end":
            return $ctx.stop();
          }
        }, this);
      }));
    } catch (e) {
      err = e;
    }
    should.exist(err);
    err.message.should.equal('foobar!');
    done();
  });

  it('should not swallow errors in parallel', function(done) {
    var f1 = o_O(wrapGenerator.mark(function() {
      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          throw new Error('oh noes!');
        case 1:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
    var err;
    run(wrapGenerator.mark(function() {
      var start;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.pushTry(7, null, null);
          $ctx.next = 4;
          return parallel([f1, [sleep, 0.25]]);
        case 4:
          $ctx.popCatch(7);
          $ctx.next = 11;
          break;
        case 7:
          $ctx.popCatch(7);
          $ctx.t5 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t5;
        case 11:
          (Date.now() - start).should.be.above(240);
          should.exist(err);
          err.message.should.include('One or more');
          err.allErrors[0].message.should.eql('oh noes!');
          done();
        case 16:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should work out of the box with promises', function(done) {
    run(wrapGenerator.mark(function() {
      var start;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.next = 3;
          return promiseSleep(100);
        case 3:
          $ctx.next = 5;
          return promiseSleep(200);
        case 5:
          $ctx.next = 7;
          return promiseSleep(50);
        case 7:
          (Date.now() - start).should.be.above(349);
          done();
        case 9:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should return promise resolutions', function(done) {
    run(wrapGenerator.mark(function() {
      var start, timeSlept;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.next = 3;
          return promiseSleep(50);
        case 3:
          timeSlept = $ctx.sent;
          (Date.now() - start).should.be.above(49);
          timeSlept.should.equal(50);
          done();
        case 7:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  it('should handle promise errors', function(done) {
    run(wrapGenerator.mark(function() {
      var start, err;

      return wrapGenerator(function($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
          start = Date.now();
          $ctx.pushTry(9, null, null);
          $ctx.next = 4;
          return promiseSleep(100, true);
        case 4:
          $ctx.next = 6;
          return promiseSleep(200);
        case 6:
          $ctx.popCatch(9);
          $ctx.next = 13;
          break;
        case 9:
          $ctx.popCatch(9);
          $ctx.t6 = $ctx.thrown;
          delete $ctx.thrown;
          err = $ctx.t6;
        case 13:
          should.exist(err);
          (Date.now() - start).should.be.below(149);
          err.message.should.include('sleeping');
          done();
        case 17:
        case "end":
          return $ctx.stop();
        }
      }, this);
    }));
  });

  if (harmony) {

    describe('chaining callbacks', function() {
      var Clazz = function(initStr) {
        this.data = initStr || '';
      };
      Clazz.prototype.getString = function() {
        return this.data;
      };
      Clazz.prototype.f1 = o_P(wrapGenerator.mark(function(s) {
        return wrapGenerator(function($ctx) {
          while (1) switch ($ctx.next) {
          case 0:
            $ctx.next = 2;
            return sleep(0.25);
          case 2:
            this.data += "f1:" + s;
            $ctx.rval = this;
            delete $ctx.thrown;
            $ctx.next = 7;
            break;
          case 7:
          case "end":
            return $ctx.stop();
          }
        }, this);
      }), ['data']);
      Clazz.prototype.f2 = o_O(wrapGenerator.mark(function(s) {
        return wrapGenerator(function($ctx) {
          while (1) switch ($ctx.next) {
          case 0:
            $ctx.next = 2;
            return sleep(0.25);
          case 2:
            this.data += "f2::" + s + s;
            $ctx.rval = this;
            delete $ctx.thrown;
            $ctx.next = 7;
            break;
          case 7:
          case "end":
            return $ctx.stop();
          }
        }, this);
      }));
      Clazz.prototype.f3 = o_O(wrapGenerator.mark(function(s) {
        return wrapGenerator(function($ctx) {
          while (1) switch ($ctx.next) {
          case 0:
            $ctx.next = 2;
            return sleep(0.25);
          case 2:
            this.data += "f3:::" + s + s + s;
            $ctx.rval = this.data;
            delete $ctx.thrown;
            $ctx.next = 7;
            break;
          case 7:
          case "end":
            return $ctx.stop();
          }
        }, this);
      }));
      Clazz.prototype.f4 = o_O(wrapGenerator.mark(function(s) {
        return wrapGenerator(function($ctx) {
          while (1) switch ($ctx.next) {
          case 0:
            $ctx.next = 2;
            return sleep(0.25);
          case 2:
            $ctx.rval = [new Clazz(s), new Clazz(s), this];
            delete $ctx.thrown;
            $ctx.next = 6;
            break;
          case 6:
          case "end":
            return $ctx.stop();
          }
        }, this);
      }));

      it('should chain method calls', function(done) {
        run(wrapGenerator.mark(function() {
          var obj, res;

          return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
              obj = new Clazz();
              $ctx.next = 3;
              return obj.f1('a').f2('b').f3('c');
            case 3:
              res = $ctx.sent;
              res.should.equal("f1:af2::bbf3:::ccc");
              done();
            case 6:
            case "end":
              return $ctx.stop();
            }
          }, this);
        }));
      });

      it('should chain properties as well', function(done) {
        run(wrapGenerator.mark(function() {
          var obj, obj2, res1, res2;

          return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
              obj = new Clazz();
              obj2 = new Clazz();
              $ctx.next = 4;
              return obj.f1('a').f4('newguys')[1].f3('b');
            case 4:
              res1 = $ctx.sent;
              res1.should.equal("newguysf3:::bbb");
              $ctx.next = 8;
              return obj2.f1('a').f4('lol')[2].f2('b').data;
            case 8:
              res2 = $ctx.sent;
              res2.should.equal("f1:af2::bb");
              done();
            case 11:
            case "end":
              return $ctx.stop();
            }
          }, this);
        }));
      });

    });
  }
});
