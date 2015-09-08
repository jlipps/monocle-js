/*global it:true, describe:true */
"use strict";

var features = require('../../lib/detect-harmony.js')
  , monocle = require('../../lib/main.js')
  , o_O = monocle.o_O
  , domain = require("domain")
  , launch = monocle.launch
  , run = monocle.run
  , Q = require("q")
  , parallel = monocle.parallel
  , o_C = monocle.callback
  , sleep = monocle.utils.sleep
  , should = require('should')
  , vm = require('vm');

if (monocle.native) {
  var o_P = monocle.o_P;
}

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

describe('monocle ' + (monocle.native ? '(es6)' : '(es5)'), function() {
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
        yield badYield();
      } catch (e) {
        err = e;
      }
      should.exist(err);
      err.message.should.containEql("o-routines can only yield callbacks");
      done();
    });
  });

  it('should be able to yield generators', function(done) {
    var square = function*(x) {
      yield sleep(5);
      return x * x;
    };
    run(function*() {
      var s = yield square(3);
      s.should.equal(9);
    }).nodeify(done);
  });

  it('should yield undefined as default return', function(done) {
    var f = o_O(function*() {
      yield sleep(100);
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

  it('should catch vm exceptions and exit oroutine', function(done) {
    var shouldntChange = "foo";
    var vmContext = vm.createContext({});
    var fail1 = o_O(function*() {
      vm.runInContext("throw new Error(\"foo bar baz\");", vmContext, {displayErrors: false});
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

  it('should catch thrown values and exit oroutine', function(done) {
    var shouldntChange = "foo";
    var fail1 = o_O(function*() {
      throw "foo bar baz";
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
      err.should.equal("foo bar baz");
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

  it('should catch non-Error exceptions in async functions', function(done) {
    var shouldntChange = "foo";
    var errInAsync = function(cb) {
      cb("foo bar baz");
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
      err.should.equal("foo bar baz");
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

  it('should have clean vm error traces', function(done) {
    var shouldntChange = "foo";
    var vmContext = vm.createContext({});
    var errInAsync = function(cb) {
      try {
        vm.runInContext("throw new Error(\"foo bar baz\");", vmContext, {displayErrors: false});
        shouldntChange = "bar";
        cb();
      } catch (e) {
        cb(e);
      }
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

  it('should not attempt to munge error traces of non-Errors', function(done) {
    var shouldntChange = "foo";
    var errInAsync = function(cb) {
      cb("foo bar baz");
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
      err.should.equal("foo bar baz");
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
        yield sleep(20);
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
      yield sleep(500);
    });
    var f2 = o_O(function*() {
      yield sleep(250);
    });
    var f3 = o_O(function*() {
      yield sleep(333);
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
      yield sleep(500);
    });
    var f2 = o_O(function*(val1, val2) {
      val1.should.equal("foo");
      val2.should.equal("bar");
      yield sleep(250);
    });
    var f3 = o_O(function*() {
      arguments.length.should.equal(0);
      yield sleep(333);
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
      yield sleep(500);
      return 'a';
    });
    var f2 = o_O(function*(val1, val2) {
      val1.should.equal("foo");
      val2.should.equal("bar");
      yield sleep(250);
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

  it('should make errors from run available on cb.fin/nodeify', function(done) {
    var f1 = o_O(function*() {
      yield sleep(50);
      throw new Error('oh noes!');
    });
    run(function*() {
      yield promiseSleep(20);
      throw new Error('woohoo');
      yield f1();
    }).fin(function(err) {
      should.exist(err);
      err.message.should.equal('woohoo');
      run(function*() {
        yield f1();
      }).nodeify(function(err2) {
        should.exist(err2);
        err2.message.should.equal('oh noes!');
        done();
      });
    });
  });

  it('should not swallow errors in run without fin/nodeify', function(done) {
    var d = domain.create();
    var t;
    d.on('error', function(err) {
      clearTimeout(t);
      should.exist(err);
      err.message.should.equal("whoops!");
      done();
    });
    d.run(function() {
      run(function*() {
        yield sleep(250);
        throw new Error("whoops!");
      });
      t = setTimeout(function() {
        done(new Error("Run swallowed error"));
      }, 500);
    });
  });

  it('should not swallow errors in parallel', function(done) {
    var f1 = o_O(function*() {
      throw new Error('oh noes!');
    });
    var err;
    run(function*() {
      var start = Date.now();
      try {
        yield parallel([f1, [sleep, 250]]);
      } catch (e) {
        err = e;
      }
      (Date.now() - start).should.be.above(240);
      should.exist(err);
      err.message.should.containEql('One or more');
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
      err.message.should.containEql('sleeping');
      done();
    });
  });

  it('should monoclize things', function(done) {
    var asyncFn = function(foo, bar, cb) {
      setTimeout(function() {
        if (foo === "bad") {
          return cb(new Error("blarg"));
        }
        cb(null, foo + "lol" + bar);
      }, 50);
    };

    var mAsyncFn = monocle.monoclize(asyncFn);

    run(function*() {
      var res = yield mAsyncFn("lo", "ol");
      res.should.equal("lololol");
      var err;
      try {
        yield mAsyncFn("bad", "oops");
      } catch (e) {
        err = e;
      }
      should.exist(err);
      err.message.should.equal("blarg");
      done();
    });
  });

  it('should nodeify o-routines', function(done) {
    var nodeAsyncFn = monocle.no(sleep);
    var start = Date.now();
    nodeAsyncFn(50, function (err) {
      should.not.exist(err);
      (Date.now() - start).should.be.above(49);
      done();
    });
  });

  it('should nodeify generators', function(done) {
    var myGen = function*(x, y) {
      yield sleep(x + y);
    };
    var nodeAsyncFn = monocle.no(myGen);
    var start = Date.now();
    nodeAsyncFn(50, 25, function (err) {
      should.not.exist(err);
      (Date.now() - start).should.be.above(74);
      done();
    });
  });

  if (monocle.native && features.proxies) {

    describe('chaining callbacks', function() {
      var Clazz = function(initStr) {
        this.data = initStr || '';
      };
      Clazz.prototype.getString = function() {
        return this.data;
      };
      Clazz.prototype.f1 = o_P(function*(s) {
        yield sleep(250);
        this.data += "f1:" + s;
        return this;
      }, ['data']);
      Clazz.prototype.f2 = o_O(function*(s) {
        yield sleep(250);
        this.data += "f2::" + s + s;
        return this;
      });
      Clazz.prototype.f3 = o_O(function*(s) {
        yield sleep(250);
        this.data += "f3:::" + s + s + s;
        return this.data;
      });
      Clazz.prototype.f4 = o_O(function*(s) {
        yield sleep(250);
        return [new Clazz(s), new Clazz(s), this];
      });

      it('should chain method calls', function(done) {
        run(function*() {
          var obj = new Clazz();
          var res = yield obj.f1('a').f2('b').f3('c');
          res.should.equal("f1:af2::bbf3:::ccc");
          done();
        });
      });

      it('should chain properties as well', function(done) {
        run(function*() {
          var obj = new Clazz();
          var obj2 = new Clazz();
          var res1 = yield obj.f1('a').f4('newguys')[1].f3('b');
          res1.should.equal("newguysf3:::bbb");
          var res2 = yield obj2.f1('a').f4('lol')[2].f2('b').data;
          res2.should.equal("f1:af2::bb");
          done();
        });
      });

    });
  }
});
