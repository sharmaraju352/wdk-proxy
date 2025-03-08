const { WebSocketTransport } = require('../../transport')
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
const transport = new WebSocketTransport({
  serverOptions: { port: 3001 }
})
const server = new ProxyServer(transport)

server.exposeHandler(handler)
transport.start().then(() => {
  console.log('WebSocket server started on port 3001')
})

setInterval(() => {
  handler.emit('heartbeat', Date.now())
}, 1000)
