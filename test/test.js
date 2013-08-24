"use strict";
var monocle = require('../lib/monocle')
  , o_0 = monocle.o_0
  , launch = monocle.launch
  , run = monocle.run
  , Return = monocle.Return
  , Callback = monocle.Callback;

describe('monocle', function() {
  it('should unwind callbacks', function(done) {
    var f1 = o_0(function*() {
      var cb = new Callback();
      setTimeout(cb, 500);
      var res = yield cb;
      yield new Return(res);
    });
    run(function*() {
      var start = Date.now();
      var res = yield f1;
      var end = Date.now();
      (end - start).should.be.above(499);
      done();
    });
  });
});
