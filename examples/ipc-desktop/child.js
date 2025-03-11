// Copyright 2025 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
  console.log('before heartbeat')
  handler.emit('heartbeat', Date.now())
  console.log('after heartbeat')
}, 1000)
