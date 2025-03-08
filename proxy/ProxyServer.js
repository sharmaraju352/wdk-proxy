class ProxyServer {
  constructor (transport) {
    this.transport = transport
    this.handler = null
  }

  exposeHandler (handler) {
    this.handler = handler

    this.transport.on('request', async (msg, respond) => {
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
    })

    this.transport.on('subscribe', (msg, respond) => {
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
    })
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
  }
}

module.exports = ProxyServer
