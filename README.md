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
            cb();
        });
    });
};

myLibraryFunction(function(err) {
    if (err) {
        console.log("Downloading and writing file failed!");
    } else {
        console.log("Downloading and writing file was successful!");
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

As you can see, the points at which you would have created an anonymous
function to handle the asynchronous callback, you now simply use the `yield`
keyword to block until the callback's result is ready. And the library
functions you create are 'monoclized' by wrapping them (or 'decorating them')
with the `o0` method.

It's important to note that Monocle methods cannot simply be called like normal functions--to actually begin executing them, pass them as arguments to `monocle.launch`. The `monocle.run` method is shorthand for this:

```js

```

Using callback-based methods
--------------------
Of course, in the previous example, I'm requiring `fs.monocle` and
`request.monocle`, libraries which don't actually exist. What if you want to
make use of arbitrary callback-based library methods? You can do that with
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
    fs.writeFile('/path/to/my/file.json', data);
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

The way it works is that first we create a special callback to be used in the library method. We do this by calling `monocle.callback()` or `monocle.oC()` for short. This creates a callback we pass to the asynchronous method. Then, on the next line, we simply `yield` to the callback, which blocks execution until the asynchronous method is done and we have a result. Using this strategy, it's easy to incorporate library methods which have not yet been monoclized.
