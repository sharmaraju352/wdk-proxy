const { WebSocketTransport } = require('../../transport')
const { ProxyClient } = require('../../proxy')

async function run () {
  const transport = new WebSocketTransport({
    clientOptions: { url: 'ws://localhost:3001' }
  })
  await transport.connect()
  const client = new ProxyClient(transport)
  const handler = await client.connect()

  // 1. Call a simple remote method
  const greeting = await handler.hello('world')
  console.log('WebSocket Greeting:', greeting)

  // 2. Subscribe to a continuous heartbeat event
  await handler.on('heartbeat', (data) => {
    console.log('WebSocket heartbeat event:', data)
  })

  // 3. Subscribe to a one-time event using once
  await handler.once('onceEvent', (data) => {
    console.log('Received onceEvent:', data)
  })

  // 4. Trigger the one-time event from server
  setTimeout(async () => {
    const res = await handler.emitTestEvent('This is a one-time event')
    console.log('emitTestEvent response:', res)
  }, 3000)

  // 5. Nested call
  const sum = await handler.math.add(10, 5)
  console.log('Nested math.add result:', sum)

  // 6. Promise chaining
  const chainedResult = await handler.chainExample(sum)
    .then(result => handler.math.multiply(result, 2))
  console.log('Chained result (sum * 2):', chainedResult)

  // 7. error handling with a non-existent method
  try {
    await handler.nonExistentMethod()
  } catch (err) {
    console.error('Expected error for non-existent method:', err.message)
  }

  // 8. promise chaining using .then on the returned promise directly
  handler.hello('chained world').then(result => {
    console.log('Promise chaining hello:', result)
  })

  // Close the client
  setTimeout(() => {
    client.close()
  }, 15000)
}

run().catch(err => console.error(err))
