/*global it:true, describe:true */
"use strict";
var monocle = require('../lib/main')
  , o_O = monocle.o_O
  , launch = monocle.launch
  , run = monocle.run
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
      (Date.now() - start).should.be.above(499);
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
      (Date.now() - start).should.be.above(499);
      done();
    });
  });

  it('should allow paralleltaneous execution if desired', function(done) {
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
      (end - start).should.be.above(499);
      (end - start).should.be.below(749);
      done();
    });
  });
});
