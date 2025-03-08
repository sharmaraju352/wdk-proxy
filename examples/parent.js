const { spawn } = require('bare-subprocess')
const path = require('path')
const { DesktopIPCTransport } = require('../transport')
const { ProxyClient } = require('../proxy')
global.process = require('process')

function runChild () {
  return new Promise((resolve, reject) => {
    const childScript = path.join(__dirname, 'child.js')

    const child = spawn('bare', [childScript])

    child.stdout.on('data', (data) => {
      const msg = JSON.parse(data)
      resolve({ port: msg.port, child })
    })

    child.stderr.on('data', (data) => {
      console.error('Child error: ', String(data))
    })

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Child exited with code ${code}`))
      }
    })
  })
}

async function main () {
  try {
    const { port } = await runChild()
    console.log(`Parent: Connecting to child on port ${port}`)

    const transport = new DesktopIPCTransport({ clientOptions: { port, host: 'localhost' } })
    await transport.connect()
    const client = new ProxyClient(transport)
    const handler = await client.connect()

    const response = await handler.echo('Hello from parent!')
    console.log('Response from child:', response)

    setTimeout(() => {
      client.close()
      process.exit(0)
    }, 5000)
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
