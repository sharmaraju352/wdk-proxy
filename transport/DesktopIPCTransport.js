const net = require('bare-net')
const BaseTransport = require('./BaseTransport')

class DesktopIPCTransport extends BaseTransport {
  constructor ({ serverOptions, clientOptions } = {}) {
    super()
    this.serverOptions = serverOptions || null
    this.clientOptions = clientOptions || null
    this.isServer = !!serverOptions
    this.socket = null
    this.server = null
    this.pendingMessages = []
  }

  async start () {
    if (!this.isServer) {
      throw new Error('start() should only be called on a server transport')
    }
    this.server = net.createServer((socket) => {
      this.socket = socket
      socket.on('data', (data) => {
        let msg
        try {
          msg = JSON.parse(data.toString())
        } catch (err) {
          return
        }
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
      })
    })

    return new Promise((resolve, reject) => {
      this.server.listen(this.serverOptions, () => {
        resolve()
      })
      this.server.on('error', reject)
    })
  }

  async connect () {
    if (this.isServer) {
      throw new Error('connect() should only be called on a client transport')
    }
    if (!this.clientOptions || !this.clientOptions.port) {
      throw new Error('clientOptions with a valid port must be provided for client mode')
    }
    this.socket = net.createConnection(
      this.clientOptions.port,
      this.clientOptions.host,
      () => {
        this.pendingMessages.forEach(data => this.socket.write(data))
        this.pendingMessages = []
      }
    )
    this.socket.on('data', (data) => {
      let msg
      try {
        msg = JSON.parse(data.toString())
      } catch (err) {
        return
      }
      if (msg.type && this._listeners[msg.type]) {
        this._emit(msg.type, msg)
      }
    })
    return new Promise((resolve, reject) => {
      this.socket.on('connect', resolve)
      this.socket.on('error', reject)
    })
  }

  async send (message) {
    const data = JSON.stringify(message)
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(data)
    } else {
      this.pendingMessages.push(data)
    }
    return Promise.resolve()
  }

  close () {
    if (this.socket) {
      this.socket.end()
    }
    if (this.server) {
      this.server.close()
    }
  }
}

module.exports = DesktopIPCTransport
