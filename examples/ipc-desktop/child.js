const { DesktopIPCTransport } = require('../../transport')
const { ProxyServer } = require('../../proxy')
const EventEmitter = require('events')

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
const transport = new DesktopIPCTransport({ serverOptions: { port: 0 } })
const server = new ProxyServer(transport)

server.exposeHandler(handler)

transport.start().then(() => {
  const addr = transport.server.address()
  console.log(JSON.stringify({ port: addr.port }))
}).catch(err => {
  console.error('IPC server failed to start:', err)
})

// Emit heartbeat events every second.
setInterval(() => {
  handler.emit('heartbeat', Date.now())
}, 1000)
