# babel-plugin-istanbul

A Babel plugin that instruments your code with Istanbul coverage.
It can instantly be used with [karma-coverage](https://github.com/karma-runner/karma-coverage) and mocha on Node.js (through [nyc](https://github.com/bcoe/nyc)).

__Note:__ This plugin does not generate any report or save any data to any file;
it only adds instrumenting code to your JavaScript source code.
To integrate with testing tools, please see the [Integrations](#integrations) section.

## Usage

Install it:

```
npm install --save-dev babel-plugin-istanbul
```

Add it to `.babelrc` in test mode:

```js
{
  "env": {
    "test": {
      "plugins": [ "istanbul" ]
    }
  }
}
```

Optionally, use [cross-env](https://www.npmjs.com/package/cross-env) to set
`NODE_ENV=test`:

```json
{
  "scripts": {
    "test": "cross-env NODE_ENV=test nyc --reporter=lcov --reporter=text mocha test/*.js"
  }
}
```

## Integrations

### karma

It _just works_ with Karma. First, make sure that the code is already transpiled by Babel (either using `karma-babel-preprocessor`, `karma-webpack`, or `karma-browserify`). Then, simply set up [karma-coverage](https://github.com/karma-runner/karma-coverage) according to the docs, but __don’t add the `coverage` preprocessor.__ This plugin has already instrumented your code, and Karma should pick it up automatically.

It has been tested with [bemusic/bemuse](https://codecov.io/github/bemusic/bemuse) project, which contains ~2400 statements.

### mocha on node.js (through nyc)

Configure Mocha to transpile JavaScript code using Babel, then you can run your tests with [`nyc`](https://github.com/bcoe/nyc), which will collect all the coverage report.

babel-plugin-istanbul respects the `include`/`exclude` configuration options from nyc,
but you also need to __configure NYC not to instrument your code__ by adding these settings in your `package.json`:

```js
  "nyc": {
    "sourceMap": false,
    "instrument": false
  },
```

## Ignoring files

You don't want to cover your test files as this will skew your coverage results. You can configure this by configuring the plugin using nyc's [exclude/include syntax](https://github.com/bcoe/nyc#excluding-files).

You can also use [istanbul's ignore hints](https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignoring-code-for-coverage-purposes) to specify specific lines of code to skip instrumenting.

## Credit where credit is due

The approach used in `babel-plugin-istanbul` was inspired by [Thai Pangsakulyanont](https://github.com/dtinth)'s original library [`babel-plugin-__coverage__`](https://github.com/dtinth/babel-plugin-__coverage__).
