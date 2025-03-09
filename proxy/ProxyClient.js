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
const EventEmitter = require('events')

class ProxyClient extends EventEmitter {
  constructor (transport) {
    super()
    this.transport = transport
    this.pendingRequests = new Map()
    this.requestIdCounter = 0

    this.transport.on('response', (msg) => {
      const { id, error, result } = msg
      const pending = this.pendingRequests.get(id)
      if (pending) {
        const { resolve, reject } = pending
        if (error) {
          reject(new Error(error))
        } else {
          resolve(result)
        }
        this.pendingRequests.delete(id)
      }
    })

    this.transport.on('event', (msg) => {
      this.emit(msg.event, msg.data)
    })
  }

  _generateId () {
    return `${Date.now()}-${this.requestIdCounter++}`
  }

  _sendRequest (request) {
    return new Promise((resolve, reject) => {
      const id = this._generateId()
      request.id = id
      this.pendingRequests.set(id, { resolve, reject })
      this.transport.send(request).catch(reject)
    })
  }

  async _subscribe (event, once = false) {
    const request = { type: 'subscribe', event, once }
    return this._sendRequest(request)
  }

  async connect () {
    const self = this
    const createProxy = (path = []) => {
      return new Proxy(() => {}, {
        get (target, prop) {
          if (prop === 'then' && path.length === 0) {
            return undefined
          }
          if (prop === 'on') {
            return async (event, callback) => {
              await self._subscribe(event, false)
              self.on(event, callback)
            }
          }
          if (prop === 'once') {
            return async (event, callback) => {
              await self._subscribe(event, true)
              self.once(event, callback)
            }
          }
          return createProxy([...path, prop])
        },
        apply (target, thisArg, args) {
          const method = path.join('.')
          const request = {
            type: 'request',
            method,
            args
          }
          return self._sendRequest(request)
        }
      })
    }
    return createProxy()
  }

  close () {
    if (typeof this.transport.close === 'function') {
      this.transport.close()
    }
  }
}

module.exports = ProxyClient
