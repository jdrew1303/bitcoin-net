var util = require('util')
var debug = require('debug')('bitcoin-net:bridge')
var PeerGroup = require('./peerGroup.js')

var Bridge = module.exports = function (params, opts) {
  opts = Object.assign({ connectWeb: false }, opts)
  PeerGroup.call(this, params, opts)
}
util.inherits(Bridge, PeerGroup)

Bridge.prototype._onConnection = function (err, client) {
  if (err) {
    this.emit('connectError', err, null)
  }
  this.emit('connection', client)
  this._connectPeer((err, bridgePeer) => {
    if (err) {
      this.emit('connectError', err)
      return this._onConnection(null, client)
    }
    var onError = (err) => {
      client.destroy()
      bridgePeer.destroy()
      debug('error', err.message)
      this.emit('peerError', err, client, bridgePeer)
    }
    client.once('error', onError)
    bridgePeer.once('error', onError)
    client.once('close', () => bridgePeer.destroy())
    bridgePeer.once('close', () => client.destroy())

    client.pipe(bridgePeer).pipe(client)
    this.emit('bridge', client, bridgePeer)
  })
}

Bridge.prototype.connect = function () {
  // don't let consumers try to make outgoing connections
  throw new Error('Do not use "connect()" with Bridge, only incoming connections are allowed')
}