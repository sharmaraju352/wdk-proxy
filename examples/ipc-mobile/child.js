const { MobileIPCTransport } = require('../../transport')
const { ProxyServer } = require('../../proxy')
const EventEmitter = require('events')
const { IPC } = BareKit

class MathHandler {
  async add (a, b) {
    return a + b
  }

  async multiply (a, b) {
    return a * b
  }
}

class Handler extends EventEmitter {
  constructor () {
    super()
    this.math = new MathHandler()
  }

  async hello (name) {
    return `Hello ${name}`
  }

  async emitTestEvent (data) {
    this.emit('onceEvent', data)
    return 'onceEvent emitted'
  }

  async chainExample (value) {
    return value
  }
}

const handler = new Handler()
const transport = new MobileIPCTransport({ IPC, isServer: true })
const server = new ProxyServer(transport)
server.exposeHandler(handler)

transport.start()

setInterval(() => {
  handler.emit('heartbeat', Date.now())
}, 1000)

console.log('Mobile IPC Child started')
