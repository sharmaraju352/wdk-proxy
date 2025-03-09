const BaseTransport = require('./BaseTransport')

class MobileIPCTransport extends BaseTransport {
  constructor (opts = {}) {
    super(opts)
    if (!opts.IPC) {
      throw new Error('MobileIPCTransport requires an IPC instance')
    }
    this.IPC = opts.IPC
    this.isServer = !!opts.isServer
  }

  async start () {
    if (!this.isServer) {
      throw new Error('start() should only be called on a server transport')
    }
    this.IPC.setEncoding('utf8')
    this.IPC.on('data', (data) => {
      try {
        const msg = JSON.parse(data)
        if (msg.type && this._listeners[msg.type]) {
          if (msg.type === 'request' || msg.type === 'subscribe') {
            this._emit(msg.type, msg, (err, result) => {
              const response = {
                type: 'response',
                id: msg.id,
                error: err ? err.message : null,
                result
              }
              this.send(response)
            })
          } else {
            this._emit(msg.type, msg)
          }
        }
      } catch (err) {
        this._emit('error', new Error('Failed to parse message: ' + err.message))
      }
    })
  }

  async connect () {
    if (this.isServer) {
      throw new Error('connect() should only be called on a client transport')
    }
    this.IPC.setEncoding('utf8')
    this.IPC.on('data', (data) => {
      try {
        const msg = JSON.parse(data)
        if (msg && msg.type) {
          this._emit(msg.type, msg)
        } else {
          this._emit('message', msg)
        }
      } catch (err) {
        this._emit('error', new Error('Failed to parse message: ' + err.message))
      }
    })
  }

  async send (message) {
    const data = JSON.stringify(message)
    this.IPC.write(data)
    return Promise.resolve()
  }
}

module.exports = MobileIPCTransport
