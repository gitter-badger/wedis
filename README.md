# wedis
[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

simple redis implementation as node lib

## Installation
```
npm install wedis
```

## Get Started
```
const Wedis = require('wedis')
const client = new Wedis

client.setAsync('key', 'value')
client.zaddAsync('key', 'score', 'value')
client.hsetnxAsync('key', 'sub-key', 'value')
```


[npm-image]: https://img.shields.io/npm/v/wedis.svg
[npm-url]: https://npmjs.org/package/wedis
[travis-image]: https://img.shields.io/travis/devfans/wedis/master.svg
[travis-url]: https://travis-ci.org/devfans/wedis
[coveralls-image]: https://img.shields.io/coveralls/devfans/wedis/master.svg
[coveralls-url]: https://coveralls.io/r/devfans/wedis?branch=master
[downloads-image]: https://img.shields.io/npm/dm/wedis.svg
[downloads-url]: https://npmjs.org/package/wedis

