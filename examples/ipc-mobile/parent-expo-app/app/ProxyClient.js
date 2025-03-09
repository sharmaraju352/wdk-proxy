import { EventEmitter } from 'events';

class ProxyClient extends EventEmitter {
  constructor(transport) {
    super();
    this.transport = transport;
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;

    this.transport.on('response', (msg) => {
      const { id, error, result } = msg;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        const { resolve, reject } = pending;
        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
        this.pendingRequests.delete(id);
      }
    });

    this.transport.on('event', (msg) => {
      this.emit(msg.event, msg.data);
    });
  }

  _generateId() {
    return `${Date.now()}-${this.requestIdCounter++}`;
  }

  _sendRequest(request) {
    return new Promise((resolve, reject) => {
      const id = this._generateId();
      request.id = id;
      this.pendingRequests.set(id, { resolve, reject });
      this.transport.send(request).catch(reject);
    });
  }

  async _subscribe(event, once = false) {
    const request = { type: 'subscribe', event, once };
    return this._sendRequest(request);
  }

  async connect() {
    const self = this;
    const createProxy = (path = []) => {
      return new Proxy(() => {}, {
        get(target, prop) {
          if (prop === 'then' && path.length === 0) {
            return undefined;
          }
          if (prop === 'on') {
            return async (event, callback) => {
              await self._subscribe(event, false);
              self.on(event, callback);
            };
          }
          if (prop === 'once') {
            return async (event, callback) => {
              await self._subscribe(event, true);
              self.once(event, callback);
            };
          }
          return createProxy([...path, prop]);
        },
        apply(target, thisArg, args) {
          const method = path.join('.');
          const request = {
            type: 'request',
            method,
            args,
          };
          return self._sendRequest(request);
        },
      });
    };
    return createProxy();
  }

  close() {
    if (typeof this.transport.close === 'function') {
      this.transport.close();
    }
  }
}

export default ProxyClient;
