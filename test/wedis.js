process.env.NO_DEPRECATION = 'wedis';

var after = require('after')
var assert = require('assert')
var wedis = require('../')

describe('wedis', function(){
  it('get function', function(){
    assert.equal(typeof wedis, 'function')
  })

  it('should success', function() {
    // var db = new wedis()
    // db.setAsync('a', 'b')
    // db.store.stop()
  })
})
