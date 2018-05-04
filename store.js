const fs = require('fs')
const utils = require('./utils')
// options: 
// dumpInterval
// dumpPath

const _dumpPath = 'wedis.dump'
const _dumpInterval = 5*60*100 // 5 minutes
const fsOpen = utils.promisify(fs, fs.open)
const fsWrite = utils.promisify(fs, fs.write)
const fsWriteFile = utils.promisify(fs, fs.writeFile)
const fsRead = utils.promisify(fs, fs.read)
const fsReadFile = utils.promisify(fs, fs.readFile)

class Store {
  constructor (options) {
    this.dumpPath = options.dumpPath || _dumpPath
    this.dumpInterval = options.dumpInterval || _dumpInterval
    this.logger = options.logger || console
    // data store
    this._string = {}
    this._zset = {}
    this._array = {}
    this._hash = {}

    // init
    this.init()
    this.timers = []
  }

  setInterval(f, interval) {
    this.timers.push(setInterval(f, interval))
    this.logger.info(`set schedule for ${f.name} with interval ${interval}`)
  }

  async init() {
    await this.load()
    this.setInterval(this.dump.bind(this), this.dumpInterval)
  }

  async stop() {
    this.timers.forEach(t=>clearInterval(t))
    this.logger.info("Saving database before exit..")
    await this.dump()
  }
  
  async dump() {
    await fsWriteFile(this.dumpPath, JSON.stringify({
      _tsp: Date.now(),
      _string: this._string,
      _zset: this._zset,
      _array: this._array,
      _hash: this._hash
    }), 'utf8')
    this.logger.info('DB snapshot tick!')
  }

  async load() {
    try {
      const _data = await fsReadFile(this.dumpPath, 'utf8')
      const data = JSON.parse(_data)
      this._string = data._string || {}
      this._zset = data._zset || {}
      this._array = data._array || {}
      this._hash = data._hash || {}
      const tsp = new Date(data._tsp)
      this.logger.info(`Successfully loaded database file created at ${tsp}`)
    } catch (e) {
      this.logger.info('Failed to load database file')
    }
  }

}

const _db = Symbol('db')
const store = {}

class Dal {
  constructor(options={}) {
    if (store[_db]) this.store = store._db
    else store[_db] = this.store = new Store(options)  
  }

  async setAsync(key, value, ex, exValue) {
    this.store._string[key] = value 
    return 0
  }

  async keys() {
    const keys = []
    const types = await this.getTypes()
    types.forEach(t=>keys.concat(Object.keys(t)))
    return keys
  }

  async getTypes() {
    return [this.store._string, this.store._array, this.store._zset, this.store._hash]
  }

  async existsAsync(key) {
    let exist = 0
    const types = await this.getTypes()
    types.forEach(t=>{
      if (t.hasOwnProperty(key)) exist = 1
    })
    return exist
  }

  async delAsync(key) {
    delete this.store._string[key] 
    return 0
  }
  
  async setnxAsync(key, value, ex, exValue) {
    if (this.store._string[key] != null) return 0 
    await this.setAsync(key, value, ex, exValue)
    return 1
  }

  async getAsync(key) {
    return this.store._string[key]
  }

  async incrAsync(key) {
    const intValue = parseInt(this.store._string[key] || 0)
    if (!isNaN(intValue)) {
      this.logger.error(Error('ERR value is not an integer or out of range'))
      return
    }
    await this.setAsync(key, intValue + 1)
    return intValue + 1
  }

  async hsetAsync(key, attr, value) {
    if (!this.store._hash[key]) this.store._hash[key] = {}
    this.store._hash[key][attr] = value
    return 0
  }
  
  async hsetnxAsync(key, attr, value) {
    if (!this.store._hash[key]) this.store._hash[key] = {}
    if (this.store._hash[key][attr] == null) this.store._hash[key][attr] = value
    else return 0
    return 1
  }

  async hdelAsync(key, attr) {
    if (this.store._hash[key] != null) delete this.store._hash[key][attr]
    return 0
  }

  async hmsetAsync(key, value) {
    this.store._hash[key] = value
    return 0
  }

  async hgetAsync(key, attr) {
    if (this.store._hash[key] == null) return
    return this.store._hash[key][attr]
  }

  async hincrbyAsync(key, attr, value) {
    if (!this.store._hash[key]) this.store._hash[key] = {}
    const intValue = parseInt(this.store._hash[key][attr] || 0)
    if (!isNaN(intValue)) {
      this.logger.error(Error('ERR value is not an integer or out of range'))
      return
    }
    await (this.hsetAsync(key, attr, ntValue + value))
    return intValue + value
  }

  async hkeysAsync(key) {
    return Object.keys(this.store._hash[key] || {})
  }

  async hexistsAsync(key, attr) {
    if (!this.store._hash[key]) return 0
    if (this.store._hash[key][attr] == null) return 0
    return 1
  }

  async hgetallAsync(key) {
    return this.store._hash[key]
  }

  // List
  async lrangeAsync(key, l, r) {
    return (this.store._array[key]|| [])[l, r]
  }

  async rpushAsync(key, value) {
    if (!this.store._array[key]) this.store._array[key] = []
    this.store._array[key].push(value)
    return 0
  }

  async lpushAsync(key, value) {
    this.store._array[key] = [value].concat(this.store._array[key]|| [])
    return 0
  }

  async lremAsync(key, count, value) {
    const list = this.store._array[key]
    if (list == null) return 0
    for (let i=0; i < count; i++) {
      const index = list.indexOf(value)
      if (index == -1) break
      list.splice(index, 1)
    }
    this.store._array[key] = list
    return 0
  }

  async llenAsync(key) {
    if (this.store._array[key] == null) return
    return this.store._array[key].length
  }

  async zaddAsync(key, score, value) {
    if (this.store._zset[key] == null) this.store._zset[key] = []
    this.store._zset[key].push([score, value])
    return 0
  }

  async zrangebyscoreAsync(key, l, h) {
    if(this.store._zset[key] == null) return
    return this.store._zset[key].sort((a,b)=> a[0] > b[0] ? 1 : -1 ).filter(i=>i[0] >= l && i[0] <= h)
  }

  async zremrangebyscoreAsync(key, l, h) {
    if(this.store._zset[key] == null) return
    this.store._zset[key].sort((a,b)=> a[0] > b[0] ? 1 : -1 )
    const length = this.store._zset[key].length
    let start = length
    let end = 0
    for (let i=0; i < length; i++) {
      if (this.store._zset[key][i][0] >= l && this.store._zset[key][i][0] <= h) {
        if (i < start) start = i
        if (i > end) end = i
      }
    }
    if (length > 0 && end - start >= 0) this.store._zset[key].splice(start, end - start + 1)
    return 0
  }

}

module.exports = Dal
