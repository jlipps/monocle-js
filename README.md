monocle-js
==========

[![Build Status](https://travis-ci.org/jlipps/monocle-js.png)](https://travis-ci.org/jlipps/monocle-js)

monocle-js is a Node library for using a blocking-like syntax when writing
asynchronous code. In other words, it's one way to avoid the 'callback hell' so
many Javascript developers love to hate. It's a port of the
[Monocle](https://github.com/saucelabs/monocle) library for event-driven
Python, made possible by ES6's new generators and the `yield` keyword. (For
present-day javascript, we use Facebook's
[Regenerator](https://github.com/facebook/regenerator) to bundle in a generator
runtime.)

Install with: `npm install monocle-js`

The problem
-----------
A lot of Node libraries and Javascript libraries in general follow the callback
pattern. This isn't bad in and of itself but it encourages developers to write
code that drifts rightward and becomes difficult to read. Let's say we want to
read some data from the web and write it to a file:

```js
var request = require('request')
  , fs = require('fs');

var myLibraryFunction = function(jsonUrl, cb) {
    request(jsonUrl, function(err, resp, body) {
        if (err) {
            return cb(err);
        }
        fs.writeFile('/path/to/my/file.json', body, function(err) {
            if (err) {
                return cb(err);
            }
            cb(null, resp, body);
        });
    });
};

myLibraryFunction('http://somesite.com/json/data', function(err, resp, body) {
    if (err) {
        console.log("Downloading and writing file failed!");
    } else {
        console.log("Downloading and writing file was successful!");
        console.log(resp);
        console.log(body);
    }
});
```

This is obviously a contrived example, but when building up a library of
project-specific functionality, you often find yourself doing this in Node.

Here's what the same code could look like using Monocle:

```js
var request = require('monocle-request')
  , fs = require('monocle-fs')
  , monocle = require('monocle-js')
  , o_O = monocle.o_O;

var myLibraryFunction = o_O(function*(jsonUrl) {
    var data = yield request(jsonUrl);
    yield fs.writeFile('/path/to/my/file.json', data[1]);
    return data;
});

var main = o_O(function*() {
    try {
        var data = yield myLibraryFunction('http://somesite.com/json/data');
        console.log("Downloading and writing file was successful!");
        console.log(data[0]);
        console.log(data[1]);
    } catch (err) {
        console.log("Downloading and writing file failed!");
    }
});

monocle.launch(main);
```

As you can see, the points at which you would have created an anonymous
function to handle the asynchronous callback, you now simply use the `yield`
keyword to block until the callback's result is ready. And the library
functions you create are 'monoclized' by wrapping them (or 'decorating them')
with the `o_O` method.

Also, notice that you don't need to do any explicit error handling if you don't
want to. Errors will be thrown like synchronous JS code, and can be caught and
handled appropriately.

It's important to understand that Monocle methods cannot simply be called like
normal functions--to actually begin executing them, pass them as arguments to
`monocle.launch`. There's also a convenience method for launching a monoclized
generator directly: `monocle.run`. With `monocle.run`, you can avoid having to
define a `main` function in the example above, like so:

```js
monocle.run(function*() {
    try {
        var data = yield myLibraryFunction('http://somesite.com/json/data');
        console.log("Downloading and writing file was successful!");
        console.log(data[0]);
        console.log(data[1]);
    } catch (err) {
        console.log("Downloading and writing file failed!");
    }
});
```

Using callback-based methods
--------------------
Of course, in the previous examples, I've required `monocle-fs` and
`monocle-request`, libraries which didn't exist until I created them. What if
you want to make use of arbitrary callback-based library methods? You can do
that with Monocle as well. Here's the previous example without the assumption
that `request` and `fs` have already been 'monoclized'.

```js
var request = require('request')
  , fs = require('fs')
  , monocle = require('monocle-js')
  , o_O = monocle.o_O
  , o_C = monocle.callback;

var myLibraryFunction = o_O(function*(jsonUrl) {
    var cb = o_C();
    request(jsonUrl, cb);
    var data = yield cb;
    cb = o_C();
    fs.writeFile('/path/to/my/file.json', data[1], cb);
    yield cb;
    return data;
});

monocle.run(function*() {
    try {
        var data = yield myLibraryFunction('http://somesite.com/json/data');
        console.log("Downloading and writing file was successful!");
        console.log(data[0]);
        console.log(data[1]);
    } catch (err) {
        console.log("Downloading and writing file failed!");
    }
});
```

The way it works is that first we create a special callback to be used in the
library method. We do this by calling `monocle.callback()` or `monocle.o_C()`
for short. This creates a callback we pass to the asynchronous method. Then, on
the next line, we simply `yield` to the callback, which blocks execution until
the asynchronous method is done and we have a result. Using this strategy, it's
easy to incorporate library methods which have not yet been monoclized.

Functions which have been monoclized are called 'o-routines', and, from within
other o-routines, can simply be yielded to without creating a callback. This is
why we simply `yield myLibraryFunction(jsonUrl)` in the example above.

Yield! As in traffic
-------------------
Reading through the examples above, you may have noticed that we're using
`yield` in an interesting way. In a typical Javascript generator, `yield` is
used to send data from the generator to the caller of `next()`. You could think
of this as "yield as in crops". In Monocle, `yield` is a sign that we should
wait for the result of an asynchronous function. It's much better to think of
this as "yield as in traffic" (hat tip to [the other
monocle](https://github.com/saucelabs/monocle) for this explanation). Take
a look at this code from the example above:

```js
var data = yield request(jsonUrl);
yield fs.writeFile('/path/to/my/file.json', data[1]);
return data;
```

In the first line, we're using yield as a way to retrieve the result of an
asynchronous o-routine called `request`. This is what we mean by "yield as in
traffic". In the second line, we're doing the same kind of thing, only we're
not assigning the result to anything. These lines essentially say, "wait until
the asynchronous process is finished, and give me the result".

The third line, using the `return` statement, is how we actually send a result
back to whoever is calling this particular function. So, the rule of thumb is
this:

* `yield` when you want to wait for an o-routine or a callback and get its result
* `return` when you want to send back the result of an o-routine

Because of these semantics, Monocle checks to make sure the only type of thing
you're yielding is an o-routine or callback. You can also yield iterators (what
you get when you call generators) directly--they're converted into o-routines
on the fly. See the examples below:

```js
var myFunc = o_O(function*() {
    // this is good, monocle.utils.sleep is an o-routine
    yield monocle.utils.sleep(1000);

    // this is good, cb is a monocle callback
    var cb = o_C();
    setTimeout(cb, 1000);
    yield cb;

    // this is good; pauseBriefly() returns an iterator
    var pauseBriefly = function*() {
        yield monocle.utils.sleep(500);
    };
    yield pauseBriefly();


    // this is bad, we should be returning instead; Math.pow is not an o-routine.
    // Monocle will throw an error
    yield Math.pow(2, 3);

    // this is bad, we should be returning instead.
    // Monocle will throw an error
    yield 5;
});
```

Porting async libraries
-----------------------
We saw above how to make use of pre-existing async functions in o-routines,
using monocle callbacks. Monocle also provides a helper function which can be
used to turn a node-style async function into an o-routine automatically:
`monocle.monoclize()` or `monocle.o_M()` for short. By "node-style async
function", I mean one which takes a series of parameters, the last of which is
a callback. Monocle assumes this callback takes at least two parameters: the
first of which is an error object (or `null`) used to determine whether the
original function completed successfully.

Let's look at an example. `fs.readFile()` is a node-style async function. We
can convert it into an o-routine like this:

```js
var monocle = require('monocle-js')
  , o_O = monocle.o_O
  , o_C = monocle.o_C
  , fs = require('fs');

var monoclizedRead = o_O(function*(filePath) {
    var cb = o_C();
    fs.readFile(filePath, cb);
    return (yield cb);
});
```

We can eliminate this boilerplate by using `monoclize()`:

```js
var monocle = require('monocle-js')
  , o_O = monocle.o_O
  , o_M = monocle.o_M
  , fs = require('fs');

var monoclizedRead = o_M(fs.readFile);
```

For an example of how this is used to port entire Node libraries, check out
[monocle-fs](https://github.com/jlipps/monocle-fs).

Using Promises
--------------
[Promises](http://promises-aplus.github.io/promises-spec/) are another way of
handling asynchronous control flow in Javascript. There are many popular
promises implementations, including [Q](https://github.com/kriskowal/q) and
[Bluebird](https://github.com/petkaantonov/bluebird). Library methods which
return promises can be used without modification in Monocle. For example,
here's a bit of functional testing code using
[Wd.js](https://github.com/admc/wd)'s promise library:

```js
var wd = require('wd')
  , browser = wd.promiseRemote()
  , should = require('chai').should();

browser
    .init({ browserName: 'chrome' })
    .then(function () {
        return browser.get("http://admc.io/wd/test-pages/guinea-pig.html");
    })
    .then(function () { return browser.title();})
    .then(function (title) {
        title.should.equal('WD Tests');
    })
    .fin(function () { browser.quit(); })
    .done();
```

This code opens up a Chrome browser, navigates to a URL, and asserts that the
title is as expected. We could rewrite this using Monocle as follows:

```js
var wd = require('wd')
  , run = require('monocle-js').run
  , browser = wd.promiseRemote()
  , should = require('chai').should();

run(function*() {
    yield browser.init({ browserName: 'chrome' });
    yield browser.get("http://admc.io/wd/test-pages/guinea-pig.html");
    var title = yield browser.title();
    title.should.equal('WD Tests');
    yield browser.quit();
});
```

Many libraries exist which make use of promises, and Monocle makes it easy to
take advantage of them in a more streamlined and elegant fashion.

Running o-routines in parallel
------------------------------
Having a blocking syntax is great, but we can also take advantage of the fact
that we're not really blocking! If we have a bunch of o-routines we want to run
in parallel, it's really easy:

```js
var monocle = require('monocle-js')
  , run = monocle.run
  , ll = monocle.parallel
  , sleep = monocle.utils.sleep
  , o_O = monocle.o_O;

var method1 = o_O(function*() {
    yield sleep(500);
    console.log("Hello");
});

var method2 = o_O(function*(sleepTime, text) {
    yield sleep(sleepTime);
    console.log(text);
});

run(function*() {
    yield ll([
        method1,
        [method2, 250, "World!"]
    ]);
});
```

In the above example, we have two methods. The first prints out "Hello" after
waiting half a second. The second prints out arbitrary text after waiting an
arbitrary amount of time. Using the `parallel` (or `ll`) method, we can run
both of these simultaneously. Because of this parallelism, the result will
actually look like this:

```
World!
Hello
```

And, everything will be printed out in half a second, not three quarters of
a second. You can see in the call how to pass parameters to parallel methods:
simply wrap the method and it's parameters in an array.

Chaining o-routines
-------------------
It's common practice in Javascript to run asynchronous methods on the results
of other asynchronous methods. This can be visualized like a chain:

```
obj1.foo() --> obj2
  obj2.bar() --> obj3
    obj3.baz() --> result
```

Or in code:

```js
var result = obj1.foo().bar().baz()
```

Of course, if `foo`, `bar`, and `baz` are asynchronous, this would really look
like:

```js
obj1.foo(function(err, obj2) {
    obj2.bar(function(err, obj3) {
        obj3.baz(function(err, result) {
            // do something with result
        });
    });
});
```

Out of the box, Monocle makes this easier, but we still have to yield each call
separately, since they're each going to be o-routines:

```js
var result = yield (yield (yield obj1.foo()).bar()).baz();
```

This can admittedly get a bit ugly. However, if we define `foo` as a chainable
o-routine, then we can get around this limitation:

```js
Clazz.prototype.foo = monocle.chainable(function*() {
    // do some stuff
    return objWithBarMethod;
});

var obj1 = new Clazz();
var result = yield obj1.foo().bar();
```

All that matters is that the first function be defined as `chainable`. There's
also a nice alias for `monocle.chainable`: `o_P`;

Getting errors out of Monocle
-----------------------------

Despite the coolness of Monocle, Javascript is still, at the end of the day,
callback-based. We haven't descended into fibers! What this means is that this
will throw an unhandled error:

```js
try {
    monocle.run(function*() {
        yield myFunc();
        yield sleep(50);
        throw new Error("whoops");
    });
} catch (e) {
    // we'll never get here, instead the error will crash the script
}
```

Remember: `monocle.run` and `monocle.launch` are not synchronous! So if you
want to do something with an error inside `run`, catch it with `.fin` or
`.nodeify`:

```js
monocle.run(function*() {
    yield myFunc();
    yield sleep(50);
    throw new Error("whoops");
}).fin(function(err) {
    console.log(err);  // whoops
});
```

If you don't, we'll throw the error in the general context, which might cause strange undefined behavior, as mentioned above.

Enabling Javascript generators
----------------
By default, generators and proxies (used for chaining) are not enabled in the
V8 Javascript engine which powers Node. In Node 11, generators are available
but not enabled unless you pass the `--harmony` flag. If you're using
monocle-js, make sure to do that!

Making libraries compatible with vanilla Node-style async methods
----------------
Let's say you want to use monocle-js to write your code, but you also want to
export library methods for people who don't have monocle-js to use. Basically,
what we need is a way to take an o-routine (or generator) and turn it into
a regular Node-style callback-based method. This is super easy with
`monocle.nodeify` (or `monocle.no` for short--get it? For when you want to say
"no" to monocle!). Take this simple o-routine, for example:

```js
var sleepTwice = o_O(function*(x, y) {
    yield sleep(x);
    yield sleep(y);
});
```

If we wanted to export this for others to use, we can simply add this to our
exports:

```js
module.exports.sleepTwice = monocle.no(sleepTwice);
```

Now someone can call it as expected in their own callback-based code:

```js
var sleepTwice = require('yourlibrary').sleepTwice;

sleepTwice(50, 100, function(err) {
    // do stuff
});
```

Running tests
-------------
Monocle's tests are written in Mocha. Simply run this command:

```bash
mocha --harmony test/
```

Case study
----------
I ported monocle-js for use in [Yiewd](https://github.com/jlipps/yiewd),
a generator-based WebDriver client library. All WebDriver calls are HTTP-based,
and given Node's callback-based HTTP library, WebDriver test code descends
quickly into callback hell. Yiewd is a good example of how an existing
callback-based library can be wrapped easily and its methods turned into
o-routines for use with Monocle.

Once you've 'monoclized' an existing library, or created a new library using
o-routines, it's easy to write asynchronous Javascript code in an easy-to-read
synchronous fashion.

Monocle-enabled libraries
-------------------------
A list of Node libraries that export o-routines:

* [Yiewd](https://github.com/jlipps/yiewd)
* [monocle-fs](https://github.com/jlipps/monocle-fs)
* [monocle-request](https://github.com/jlipps/monocle-request)

Fashion
-------
One of the awesome things about the [original
monocle](https://github.com/saucelabs/monocle) was that the decorator (`@_o`) looked like a monocle-bearing individual! We can't start names with `@` in Javascript, hence the use of `o_O` in the port. But we have options. These are all exported for your particular taste:

```
monocle.o0
monocle.o_0
monocle.oO
monocle.o_P  // for chaining
```

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/jlipps/monocle-js/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
