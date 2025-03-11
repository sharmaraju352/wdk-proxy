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
class BaseTransport {
  constructor (opts = {}) {
    this.opts = opts
    this._listeners = {}
  }

  async start () {
    throw new Error('start() not implemented')
  }

  async connect () {
    throw new Error('connect() not implemented')
  }

  async send (message) {
    throw new Error('send() not implemented')
  }

  on (event, callback) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(callback)
  }

  _emit (event, ...args) {
    if (this._listeners[event]) {
      for (const cb of this._listeners[event]) {
        cb(...args)
      }
    }
  }

  close () {
    throw new Error('close() not implemented')
  }
}

module.exports = BaseTransport
