#!/usr/bin/env bash
set -e

echo "* Clearing out old es5 lib"
rm -rf ./lib/es5
mkdir lib/es5
echo "* Regenerating new es5 lib"
regenerator -r lib/monocle.js > lib/es5/monocle.js
sed -i '' -e 's/harmony \= true/harmony = false/' lib/es5/monocle.js
regenerator lib/utils.js > lib/es5/utils.js
cp lib/callback.js lib/es5/callback.js
cp lib/helpers.js lib/es5/helpers.js

echo "* Clearing out old es5 tests"
rm -rf test/es5
mkdir test/es5
echo "* Regenerating new es5 tests"
regenerator test/es6/tests.js > test/es5/tests.js
sed -i '' -e 's/harmony \= true/harmony = false/' test/es5/tests.js
