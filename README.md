Monocle.js
==========

Monocle.js is a Node library for using a blocking-like syntax when writing asynchronous code. In other words, it's one way to avoid the 'callback hell' so many Javascript developers love to hate. It's a port of [Steven Hazel](https://github.com/sah/)'s [Monocle](https://github.com/saucelabs/monocle) library for event-driven Python, made possible by ES6's new generators and the `yield` keyword.

The problem
-----------
A lot of Node libraries and Javascript libraries in general follow the callback pattern. This isn't bad in and of itself but it encourages developers to write code that drifts rightward and becomes difficult to read. Let's say we want to read some data from the web and write it to a file:

```js
var request = require('request')
  , fs = require('fs');

var myLibraryFunction = function(cb) {
    request('http://somesite.com/json/data', function(err, data) {
        if (err) {
            return cb(err);
        }
        fs.writeFile('/path/to/my/file.json', data, function(err) {
            if (err) {
                return cb(err);
            }
            cb(null, data);
        });
    });
};

myLibraryFunction(function(err, data) {
    if (err) {
        console.log("Downloading and writing file failed!");
    } else {
        console.log("Downloading and writing file was successful!");
        console.log(data);
    }
};
```

This is obviously a contrived example, but when building up a library of
project-speciic functionality, you often find yourself doing this in Node.

Here's what the same code could look like using Monocle:

```js
var request = require('request.monocle')
  , fs = require('fs.monocle')
  , monocle = require('monocle.js')
  , o0 = monocle.o0;

var myLibraryFunction = o0(function*() {
    var data = yield request('http://somesite.com/json/data');
    yield fs.writeFile('/path/to/my/file.json', data);
    yield data;
});

var main = o0(function*() {
    try {
        var data = yield myLibraryFunction();
        console.log("Downloading and writing file was successful!");
        console.log(data);
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
with the `o0` method.

Also, notice that you don't need to do any explicit error handling if you don't
want to. Errors will be thrown like synchronous JS code, and can be caught and
handled appropriately.

It's important to understand that Monocle methods cannot simply be called like
normal functions--to actually begin executing them, pass them as arguments to
`monocle.launch`. There's also a convenience method for launching a monoclized
generator directly:

```js
monocle.run = function(generator) {
    var monoclizedFunc = o0(generator);
    monocle.launch(monoclizedFunc);
};
```

With `monocle.run`, you can avoid having to define a `main` function in the
example above:

```js
monocle.run(function*() {
    try {
        yield myLibraryFunction();
        console.log("Downloading and writing file was successful!");
    } catch (err) {
        console.log("Downloading and writing file failed!");
    }
});
```

Using callback-based methods
--------------------
Of course, in the previous examples, I've required `fs.monocle` and
`request.monocle`, libraries which don't actually exist yet. What if you want
to make use of arbitrary callback-based library methods? You can do that with
Monocle as well. Here's the previous example without the assumption that
`request` and `fs` have already been 'monoclized'.

```js
var request = require('request')
  , fs = require('fs')
  , monocle = require('monocle.js')
  , o0 = monocle.o0;
  , oC = monocle.callback;

var myLibraryFunction = o0(function*() {
    var cb = oC();
    request('http://somesite.com/json/data', cb);
    var data = yield cb;
    cb = oC();
    fs.writeFile('/path/to/my/file.json', data, cb);
    yield cb;
});

monocle.run(function*() {
    try {
        yield myLibraryFunction();
        console.log("Downloading and writing file was successful!");
    } catch (err) {
        console.log("Downloading and writing file failed!");
    }
});
```

The way it works is that first we create a special callback to be used in the
library method. We do this by calling `monocle.callback()` or `monocle.oC()`
for short. This creates a callback we pass to the asynchronous method. Then, on
the next line, we simply `yield` to the callback, which blocks execution until
the asynchronous method is done and we have a result. Using this strategy, it's
easy to incorporate library methods which have not yet been monoclized.

Functions which have been monoclized are called 'o-routines', and, from within
other o-routines, can simply be yielded to without creating a callback. This is
why we simply `yield myLibraryFunction()` in the example above.

A tale of two yields
-------------------
Reading through the examples above, you'll notice that we're using `yield` in
two ways, exemplified in these three lines:

```js
var data = yield request('http://somesite.com/json/data');
yield fs.writeFile('/path/to/my/file.json', data);
yield data;
```

In the first line, we're using yield as a way to retrieve the result of an
asynchronous function. This is (hat tip to [@sah](https://github.com/sah)) "yield as in traffic". In the
second line, we're doing the same thing, only we're not assigning the result to
anything. These lines essentially say, "wait until the asynchronous process is
finished, and give me the result". In the third line, we use yield not as a way
to wait but as a way to "return" a value from the o-routine. In this sense,
we're using "yield as in crops", not as in traffic.

Enabling Javascript generators
----------------
By default, generators are not enabled in the V8 Javascript engine which powers Node. In Node 11, generators are available but not enabled unless you pass the `--harmony` flag. If you're using Monocle.js, make sure to do that!

Running tests
-------------
Monocle's tests are written in Mocha. Simply run this command:

```bash
mocha --harmony test/
```

Case study
----------
I ported Monocle.js for use in [Yiewd](https://github.com/jlipps/yiewd),
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
