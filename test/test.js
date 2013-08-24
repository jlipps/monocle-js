"use strict";
var monocle = require('../lib/monocle')
  , o_0 = monocle.o_0
  , launch = monocle.launch
  , run = monocle.run
  , Return = monocle.Return
  , Callback = monocle.Callback
  , should = require('should');

describe('monocle', function() {
  it('should not reach code after returns', function(done) {
    var shouldntChange = "foo";
    var square = o_0(function*(x) {
      yield new Return(x * x);
      shouldntChange = "bar";
    });
    run(function*() {
      var s = yield square(3);
      s.should.equal(9);
      shouldntChange.should.equal('foo');
      done();
    });
  });
  it('should unwind callbacks', function(done) {
    var f1 = o_0(function*() {
      var cb = new Callback();
      setTimeout(cb.handler(), 500);
      yield cb;
    });
    run(function*() {
      var start = Date.now();
      yield f1();
      (Date.now() - start).should.be.above(499);
      done();
    });
  });
});
