const { DesktopIPCTransport } = require('../transport')
const { ProxyServer } = require('../proxy')
const EventEmitter = require('events')

class Handler extends EventEmitter {
  async echo (text) {
    return `Child received: ${text}`
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
  console.error('Server failed to start:', err)
})
