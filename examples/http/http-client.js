const { HTTPTransport } = require('../../transport')
const { ProxyClient } = require('../../proxy')

async function run () {
  const transport = new HTTPTransport({
    clientOptions: { url: 'http://localhost:3002' }
  })

  // Establish the SSE connection and RPC mechanism.
  await transport.connect()
  const client = new ProxyClient(transport)
  const handler = await client.connect()

  // 1. Call a simple remote method.
  const greeting = await handler.hello('HTTP world')
  console.log('HTTP Greeting:', greeting)

  // 2. Subscribe to continuous heartbeat events.
  await handler.on('heartbeat', (data) => {
    console.log('HTTP heartbeat event:', data)
  })

  // 3. Subscribe to a one-time event using once.
  await handler.once('onceEvent', (data) => {
    console.log('Received onceEvent:', data)
  })

  // 4. Trigger the one-time event from the server.
  setTimeout(async () => {
    const res = await handler.emitTestEvent('This is a one-time event via HTTP')
    console.log('emitTestEvent response:', res)
  }, 3000)

  // 5. Nested call.
  const sum = await handler.math.add(20, 15)
  console.log('Nested math.add result:', sum)

  // 6. Promise chaining.
  const chainedResult = await handler.chainExample(sum)
    .then(result => handler.math.multiply(result, 2))
  console.log('Chained result (sum * 2):', chainedResult)

  // 7. Error handling with a non-existent method.
  try {
    await handler.nonExistentMethod()
  } catch (err) {
    console.error('Expected error for non-existent method:', err.message)
  }

  // 8. Promise chaining using .then on the returned promise directly.
  handler.hello('chained HTTP world').then(result => {
    console.log('Promise chaining hello:', result)
  })

  // Close the client
  setTimeout(() => {
    client.close()
  }, 10000)
}

run().catch(err => console.error(err))
