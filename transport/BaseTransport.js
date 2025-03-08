class BaseTransport {
  constructor (opts = {}) {
    this.opts = opts
    this._listeners = {}
  }

  async start () {
    throw new Error('start() not implemented')
  }

  async connect () {
    throw new Error('connect() not implemented')
  }

  async send (message) {
    throw new Error('send() not implemented')
  }

  on (event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
  }

  _emit (event, ...args) {
    if (this._listeners[event]) {
      for (const cb of this._listeners[event]) {
        cb(...args)
      }
    }
  }

  close () {
    throw new Error('close() not implemented')
  }
}

module.exports = BaseTransport
