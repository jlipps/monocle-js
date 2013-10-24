/*global it:true, describe:true */
"use strict";
var monocle = require('../lib/main')
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

var square = o_O(function*(x) {
  return x * x;
});

var cube = o_O(function*(x) {
  var squareOfX = yield square(x);
  return x * squareOfX;
});

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
    var square = o_O(function*(x) {
      return x * x;
      shouldntChange = "bar";
    });
    run(function*() {
      var s = yield square(3);
      s.should.equal(9);
      shouldntChange.should.equal('foo');
      done();
    });
  });

  it('should not yield anything other than callbacks', function(done) {
    var badYield = o_O(function*() {
      var s = yield square(3);
      yield s;
    });
    run(function*() {
      var err;
      try {
        var s = yield badYield();
      } catch (e) {
        err = e;
      }
      should.exist(err);
      err.message.should.include("o-routines can only yield callbacks");
      done();
    });
  });

  it('should yield undefined as default return', function(done) {
    var f = o_O(function*() {
      yield sleep(0.1);
    });
    run(function*() {
      var res = yield f();
      (typeof res).should.equal("undefined");
      done();
    });
  });

  it('should work with async methods', function(done) {
    var f1 = o_O(function*() {
      var cb = o_C();
      setTimeout(cb, 500);
      yield cb;
    });
    run(function*() {
      var start = Date.now();
      yield f1();
      (Date.now() - start).should.be.above(490);
      done();
    });
  });

  it('should catch exceptions and exit oroutine', function(done) {
    var shouldntChange = "foo";
    var fail1 = o_O(function*() {
      throw new Error("foo bar baz");
      shouldntChange = "bar";
    });
    var fail2 = o_O(function*() {
      yield fail1();
    });
    run(function*() {
      var err;
      try {
        yield fail2();
      } catch(e) {
        err = e;
      }
      should.exist(err);
      err.message.should.equal("foo bar baz");
      shouldntChange.should.equal("foo");
      done();
    });
  });

  it('should catch exceptions in async functions', function(done) {
    var shouldntChange = "foo";
    var errInAsync = function(cb) {
      cb(new Error("foo bar baz"));
    };
    var fail1 = o_O(function*() {
      var cb = o_C();
      errInAsync(cb);
      yield cb;
    });
    var fail2 = o_O(function*() {
      yield fail1();
    });
    run(function*() {
      var err;
      try {
        yield fail2();
      } catch(e) {
        err = e;
      }
      should.exist(err);
      err.message.should.equal("foo bar baz");
      shouldntChange.should.equal("foo");
      done();
    });
  });

  it('should have clean error traces', function(done) {
    var shouldntChange = "foo";
    var errInAsync = function(cb) {
      cb(new Error("foo bar baz"));
    };
    var fail1 = o_O(function*() {
      var cb = o_C();
      errInAsync(cb);
      yield cb;
    });
    var fail2 = o_O(function*() {
      yield fail1();
    });
    run(function*() {
      var err;
      try {
        yield fail2();
      } catch(e) {
        err = e;
      }
      should.exist(err);
      var re = new RegExp("monocle\.js", "g");
      var matches = re.exec(err.stack);
      matches.length.should.not.be.above(1);
      err.message.should.equal("foo bar baz");
      shouldntChange.should.equal("foo");
      done();
    });
  });

  it('should work with launch', function(done) {
    launch(o_O(function*() {
      var x = yield square(5);
      x.should.equal(25);
      done();
    }));
  });

  it('should work with embedded o-routines', function(done) {
    run(function*() {
      var x = yield cube(3);
      x.should.equal(27);
      done();
    });
  });

  it('should pass multiple parameters to o-routine', function(done) {
    var add = o_O(function*(x, y) {
      return x + y;
    });
    run(function*() {
      var sum = yield add(3, 6);
      sum.should.equal(9);
      done();
    });
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
    var syncFn = o_O(function*(shouldErr) {
      var cb = o_C();
      asyncFn(shouldErr, cb);
      return (yield cb);
    });
    run(function*() {
      var res = yield syncFn(false);
      res.should.equal("yay!");
      var err;
      try {
        res = yield syncFn(true);
      } catch (e) {
        err = e;
      }
      should.exist(err);
      err.message.should.equal("bad");
      done();
    });
  });

  it('should bind generators to calling object', function(done) {
    var bindObj = {
      foo: 'bar'
    };

    bindObj.gen = o_O(function*() {
      return this.foo;
    });

    run(function*() {
      var res = yield this.gen();
      res.should.equal('bar');
      done();
    }, bindObj);
  });

  it('should work with classes', function(done) {
    var MyClass = function() {
      this.foo = 'bar';
    };
    MyClass.prototype.myOroutine = o_O(function*() {
      var s = yield square(3);
      return this.foo + ' ' + s;
    });
    MyClass.prototype.run = function(gen) {
      run(gen, this);
    };
    var obj = new MyClass();
    obj.run(function*() {
      var res = yield this.myOroutine();
      res.should.equal('bar 9');
      done();
    });
  });

  it('should unravel lots of callbacks', function(done) {
    run(function*() {
      var i;
      for (i = 0; i < 100; i++) {
        yield sleep(0.02);
      };
      i.should.equal(100);
      done();
    });
  });

  it('should defer non-generator "o-routines"', function(done) {
    var notAGenerator = o_O(function() {
      return 'foo';
    });
    run(function*() {
      (yield notAGenerator()).should.equal("foo");
      done();
    });
  });

  it('should yield to monocle callbacks', function(done) {
    run(function*() {
      var cb = o_C();
      var start = Date.now();
      setTimeout(cb, 500);
      yield cb;
      (Date.now() - start).should.be.above(490);
      done();
    });
  });

  it('should allow parallel execution', function(done) {
    var f1 = o_O(function*() {
      yield sleep(0.5);
    });
    var f2 = o_O(function*() {
      yield sleep(0.25);
    });
    var f3 = o_O(function*() {
      yield sleep(0.33);
    });
    run(function*() {
      var start = Date.now();
      yield parallel([f1, f2, f3]);
      var end = Date.now();
      (end - start).should.be.above(490);
      (end - start).should.be.below(749);
      done();
    });
  });

  it('should pass parameters to parallel oroutines', function(done) {
    var f1 = o_O(function*(val) {
      val.should.equal("1");
      yield sleep(0.5);
    });
    var f2 = o_O(function*(val1, val2) {
      val1.should.equal("foo");
      val2.should.equal("bar");
      yield sleep(0.25);
    });
    var f3 = o_O(function*() {
      arguments.length.should.equal(0);
      yield sleep(0.33);
    });
    var f4 = o_O(function*() {
      arguments.length.should.equal(0);
    });
    run(function*() {
      var start = Date.now();
      yield parallel([[f1, "1"], [f2, "foo", "bar"], [f3], f4]);
      var end = Date.now();
      (end - start).should.be.above(490);
      (end - start).should.be.below(740);
      done();
    });
  });

  it('should return values from parallel oroutines', function(done) {
    var f1 = o_O(function*(val) {
      val.should.equal("1");
      yield sleep(0.5);
      return 'a';
    });
    var f2 = o_O(function*(val1, val2) {
      val1.should.equal("foo");
      val2.should.equal("bar");
      yield sleep(0.25);
      return 'b';
    });
    var f3 = o_O(function*() {
      arguments.length.should.equal(0);
      yield sleep(0.33);
    });
    run(function*() {
      var start = Date.now();
      var res = yield parallel([[f1, "1"], [f2, "foo", "bar"], f3]);
      var end = Date.now();
      (end - start).should.be.above(490);
      (end - start).should.be.below(740);
      res.should.eql(["a", "b", undefined]);
      done();
    });
  });

  it('should not swallow errors in run', function(done) {
    var f1 = o_O(function*() {
      throw new Error('oh noes!');
    });
    var err;
    try {
      run(function*() {
        yield f1();
      });
    } catch (e) {
      err = e;
    }
    should.exist(err);
    err.message.should.equal('oh noes!');
    done();
  });

  it('should not swallow errors in parallel', function(done) {
    var f1 = o_O(function*() {
      throw new Error('oh noes!');
    });
    var err;
    run(function*() {
      var start = Date.now();
      try {
        yield parallel([f1, [sleep, 0.25]]);
      } catch (e) {
        err = e;
      }
      (Date.now() - start).should.be.above(240);
      should.exist(err);
      err.message.should.include('One or more');
      err.allErrors[0].message.should.eql('oh noes!');
      done();
    });
  });

  it('should work out of the box with promises', function(done) {
    run(function*() {
      var start = Date.now();
      yield promiseSleep(100);
      yield promiseSleep(200);
      yield promiseSleep(50);
      (Date.now() - start).should.be.above(349);
      done();
    });
  });

  it('should return promise resolutions', function(done) {
    run(function*() {
      var start = Date.now();
      var timeSlept = yield promiseSleep(50);
      (Date.now() - start).should.be.above(49);
      timeSlept.should.equal(50);
      done();
    });
  });

  it('should handle promise errors', function(done) {
    run(function*() {
      var start = Date.now();
      var err;
      try {
        yield promiseSleep(100, true);
        yield promiseSleep(200);
      } catch (e) {
        err = e;
      }
      should.exist(err);
      (Date.now() - start).should.be.below(149);
      err.message.should.include('sleeping');
      done();
    });
  });
});
