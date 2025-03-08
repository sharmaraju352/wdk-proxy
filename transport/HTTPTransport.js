const http = require('bare-http1')
const BaseTransport = require('./BaseTransport')
const { v4: uuidv4 } = require('uuid')
const { URL } = require('url')

class HTTPTransport extends BaseTransport {
  constructor ({ serverOptions, clientOptions } = {}) {
    super()
    this.serverOptions = serverOptions || null
    this.clientOptions = clientOptions || null
    this.isServer = !!serverOptions
    this.eventClients = []
    this.server = null
    this.sseRequest = null
  }

  async start () {
    if (!this.isServer) {
      throw new Error('start() should only be called on a server transport')
    }
    this.server = http.createServer((req, res) => {
      // POST /rpc endpoint for handling RPC requests.
      if (req.method === 'POST' && req.url === '/rpc') {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          let msg
          try {
            msg = JSON.parse(body)
          } catch (err) {
            res.statusCode = 400
            res.end()
            return
          }
          if (msg && msg.type && this._listeners[msg.type]) {
            if (msg.type === 'request' || msg.type === 'subscribe') {
              this._emit(msg.type, msg, (err, result) => {
                const responseObj = {
                  type: 'response',
                  id: msg.id,
                  error: err ? err.message : null,
                  result
                }
                const responseBody = JSON.stringify(responseObj)
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.setHeader('Content-Length', Buffer.byteLength(responseBody))
                res.write(responseBody)
                res.end()
              })
            } else {
              this._emit(msg.type, msg)
              res.statusCode = 200
              res.end()
            }
          } else {
            res.statusCode = 400
            res.end()
          }
        })
      }
      // GET /events endpoint for Server Sent Events (SSE).
      else if (req.method === 'GET' && req.url === '/events') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.write('')

        const clientId = uuidv4()
        const newClient = { id: clientId, res }
        this.eventClients.push(newClient)

        req.on('close', () => {
          this.eventClients = this.eventClients.filter(c => c.id !== clientId)
        })
      }
      // For any other endpoints, respond with 404.
      else {
        res.statusCode = 404
        res.end()
      }
    })

    return new Promise((resolve, reject) => {
      const port = this.serverOptions.port
      this.server.listen(port, () => {
        console.log(`HTTP server started on port ${port}`)
        resolve()
      })
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
    // create an SSE connection.
    const parsedUrl = new URL(this.clientOptions.url)
    const options = {
      method: 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: '/events'
    }
    const req = http.request(options, (res) => {
      console.log('SSE connection established')
      let buffer = ''
      res.on('data', (chunk) => {
        buffer += chunk.toString()
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.substring(6).trim()
            try {
              const msg = JSON.parse(dataStr)
              if (msg.type && this._listeners[msg.type]) {
                this._emit(msg.type, msg)
              }
            } catch (err) {}
          }
        }
      })
      res.on('end', () => {
        console.log('SSE connection ended')
      })
    })
    req.on('error', (err) => {
      console.error('SSE request error:', err)
    })
    req.end()
    this.sseRequest = req
  }

  async send (message) {
    if (this.isServer) {
      if (message.type === 'event') {
        const data = `data: ${JSON.stringify(message)}\n\n`
        this.eventClients.forEach(client => {
          client.res.write(data)
        })
      }
      return Promise.resolve()
    } else {
      const fetch = require('bare-fetch')
      try {
        const res = await fetch(this.clientOptions.url + '/rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        })
        const text = await res.text()
        let data
        try {
          data = JSON.parse(text)
        } catch (err) {
          throw new Error('Failed to parse response as JSON: ' + text)
        }
        this._emit('response', data)
        return Promise.resolve(data)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }

  close () {
    if (this.isServer) {
      if (this.server) {
        this.server.close()
      }
    } else {
      if (this.sseRequest && typeof this.sseRequest.abort === 'function') {
        this.sseRequest.abort()
      }
    }
  }
}

module.exports = HTTPTransport
