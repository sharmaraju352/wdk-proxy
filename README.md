# WDK Proxy

WDK Proxy is a versatile proxy that supports multiple transports. The transport layer is pluggable, allowing for flexibility in communication methods. Currently, the following transport methods are supported:

- HTTP Transport
- WebSocket Transport
- Desktop IPC Transport
- Mobile IPC Transport

## Installation

```sh
npm install
```

## Running Examples

### HTTP Transport Example

Run the server:
```sh
bare examples/http/http-server.js
```

Run the client in another terminal:
```sh
bare examples/http/http-client.js
```

**Note:** Server-Sent Events (SSE) do not work in `bare` right now. They work with Node.js.

### WebSocket Transport Example

Run the WebSocket server:
```sh
bare examples/websocket/ws-server.js
```

Run the WebSocket client in another terminal:
```sh
bare examples/websocket/ws-client.js
```

### Desktop IPC Example

Run the parent process:
```sh
bare examples/ipc-desktop/parent.js
```

The parent process will spawn the child process automatically, so there is no need to run the child process separately.

### Mobile IPC Example

First, create a bundle for the child process using one of the following commands:
```sh
npm run bundle-android
# or
npm run bundle-ios
```

This will create a bundle in the root folder, either `android.bundle.cjs` or `ios.bundle.cjs`, depending on the command used.

Next, copy the generated bundle and place it inside the `examples/ipc-mobile/parent-expo-app` directory.

Navigate to the `parent-expo-app` directory:
```sh
cd examples/ipc-mobile/parent-expo-app
```

Run the expo app on the desired platform:
```sh
npm run android
# or
npm run ios
```

