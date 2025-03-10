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
class ProxyServer {
  constructor (transport) {
    this.transport = transport
    this.handler = null
    this._requestListener = null
    this._subscribeListener = null
  }

  exposeHandler (handler) {
    if (this.handler && this.transport.removeListener) {
      this.transport.removeListener('request', this._requestListener)
      this.transport.removeListener('subscribe', this._subscribeListener)
    }

    this.handler = handler

    this._requestListener = async (msg, respond) => {
      const { method, args } = msg
      const parts = method.split('.')
      let target = this.handler
      for (const part of parts) {
        if (target == null) break
        target = target[part]
      }
      if (typeof target !== 'function') {
        return respond(new TypeError(`Method "${method}" not found`))
      }
      try {
        const result = await target.apply(this.handler, args)
        respond(null, result)
      } catch (err) {
        respond(err)
      }
    }

    this._subscribeListener = (msg, respond) => {
      const { event, once } = msg
      if (!this.handler || typeof this.handler.on !== 'function') {
        return respond(new Error('Handler does not support events'))
      }

      const listener = (data) => {
        this.transport.send({ type: 'event', event, data })
      }

      if (once) {
        this.handler.once(event, listener)
      } else {
        this.handler.on(event, listener)
      }
      respond(null, `subscribed to ${event}`)
    }

    this.transport.on('request', this._requestListener)
    this.transport.on('subscribe', this._subscribeListener)
  }

  emitEvent (event, data) {
    this.transport.send({ type: 'event', event, data })
  }

  start () {
    if (typeof this.transport.start === 'function') {
      this.transport.start()
    }
  }

  close () {
    if (typeof this.transport.close === 'function') {
      this.transport.close()
    }
    if (this.transport.removeListener) {
      if (this._requestListener) {
        this.transport.removeListener('request', this._requestListener)
      }
      if (this._subscribeListener) {
        this.transport.removeListener('subscribe', this._subscribeListener)
      }
    }
  }
}

module.exports = ProxyServer
