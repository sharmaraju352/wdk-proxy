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
const ws = require('bare-ws')
const BaseTransport = require('./BaseTransport')

class WebSocketTransport extends BaseTransport {
  constructor ({ serverOptions, clientOptions } = {}) {
    super()
    this.serverOptions = serverOptions || null
    this.clientOptions = clientOptions || null
    this.isServer = !!serverOptions
    this.ws = null
    this.server = null
    this.pendingMessages = []
  }

  async start () {
    if (!this.isServer) {
      throw new Error('start() should only be called on a server transport')
    }
    this.server = new ws.Server(this.serverOptions, (socket) => {
      this.ws = socket
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
      this.server.on('listening', resolve)
      this.server.on('error', reject)
    })
  }

  async connect () {
    if (this.isServer) {
      throw new Error('connect() should only be called on a client transport')
    }
    if (!this.clientOptions || !this.clientOptions.url) {
      throw new Error('clientOptions with a valid URL must be provided for client mode')
    }
    const { hostname, port } = new URL(this.clientOptions.url)
    this.ws = new ws.Socket({ hostname, port })
    this.ws.on('data', (data) => {
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
      this.ws.on('open', resolve)
      this.ws.on('error', reject)
    })
  }

  async send (message) {
    const data = JSON.stringify(message)
    if (this.ws) {
      this.ws.write(data)
    } else {
      this.pendingMessages.push(data)
    }
    return Promise.resolve()
  }

  close () {
    if (this.ws) {
      this.ws.end()
    }
    if (this.server) {
      this.server.close()
    }
  }
}

module.exports = WebSocketTransport
