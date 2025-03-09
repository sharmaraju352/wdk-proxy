import { useState, useEffect } from 'react'
import { Text } from 'react-native'
import { Worklet } from 'react-native-bare-kit'
import ProxyClient from './ProxyClient'
import MobileIPCTransport from './MobileIPCTransport';

const androidBundle = require('../android.bundle.cjs')

export default function () {
  const [response, setReponse] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      
      console.log('Creating worklet')
      const worklet = new Worklet();
      worklet.start('/app.bundle', androidBundle);

      console.log('Creating MobileIPCTransport')
      const transport = new MobileIPCTransport({ IPC: worklet.IPC, isServer: false });
      await transport.connect();

      console.log('IPC connected')


      // Wrap the transport in a ProxyClient.
      const client = new ProxyClient(transport);
      const handler = await client.connect();

      console.log('Handler created')

      // 1. Call a simple remote method.
      const greeting = await handler.hello("Expo");
      console.log("IPC Greeting:", greeting);

      // 2. Subscribe to continuous heartbeat events.
      await handler.on('heartbeat', (data: any) => {
        console.log("Heartbeat event:", data);
      });

      // 3. Subscribe to a one-time event using once.
      await handler.once('onceEvent', (data: any) => {
        console.log("Received onceEvent:", data);
      });

      // 4. Trigger the one-time event from the server.
      setTimeout(async () => {
        const res = await handler.emitTestEvent("This is a one-time event from Expo");
        console.log("emitTestEvent response:", res);
      }, 3000);

      // 5. Nested call: calling math.add remotely.
      const sum = await handler.math.add(10, 5);
      console.log("Nested math.add result:", sum);

      // 6. Promise chaining.
      const chainedResult = await handler.chainExample(sum)
        .then((result: any) => handler.math.multiply(result, 2));
      console.log("Chained result (sum * 2):", chainedResult);

      // 7. Error handling with a non-existent method.
      try {
        await handler.nonExistentMethod();
      } catch (err: any) {
        console.error("Expected error for non-existent method:", err.message);
      }

      // 8. Promise chaining using .then on the returned promise directly.
      handler.hello("chained Expo world").then((result: any) => {
        console.log("Promise chaining hello:", result);
      });

      // Also subscribe to 'data' events to update local state.
      handler.on('data', (msg: any) => {
        console.log("Received data:", msg);
        setResponse(JSON.stringify(msg));
      });
    }
    run().catch(err => console.error(err));
  }, []);

  return <Text>{response}</Text>
}
