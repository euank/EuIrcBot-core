var Bjson = require('bj-stream-rpc');
var test = require('tape');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var mm = require('./../module-manager.js');

function MockIRC(nick) {
  this.me = nick;
  this.lines = [];
}

MockIRC.prototype.send = function(to, str) {
  var line = to + ": " + str;
  this.lines.push(line);
  this.emit('line', line);
};

util.inherits(MockIRC, EventEmitter);

describe('core', () => {
  var mock = new MockIRC("bot");
  mm({commandPrefix: '!'})(mock);
  it('should broadcast commands', (done) => {

    var fns = {
      command: function(arr) {
        var command = arr.shift();
        var remainder = arr.shift();
        var parts = arr.shift();
        var respto = arr.shift();
        var from = arr.shift();
        var to = arr.shift();

        expect(respto).to.eql("#foo");
        expect(command).to.eql("test");
        expect(remainder).to.eql("testing args");
        expect(parts).to.eql(["testing", "args"]);

        client.notify('sayTo', [respto, "test response"]);
      },
    };
    var client = new Bjson.NamedTcpClient("localhost", 52531, "test", 1, fns, function(err) {
      expect(err).not.to.be.ok;
      mock.emit('message', {to: "#foo", message: "!test testing args"});
    });

    mock.on('line', function(line) {
      expect(line).to.eql("#foo: test response");
      client.close();
      done();
    });
  });

  it('should rebroadcast unknown commands', (done) => {
    var client1 = new Bjson.NamedTcpClient("localhost", 52531, "c1", 1, {}, function(err) {
      expect(err).not.to.be.ok;
      var client2 = new Bjson.NamedTcpClient("localhost", 52531, "c2", 1, {}, function(err) {
        expect(err).not.to.be.ok;
        client1.request('test', [], function(err, resp) {
          // Error because there's nothing serving up 'test'
          expect(err).to.be.ok;
          client1.close();
          client2.close();
          done();
        });
      });
    });
  });

  it('should rebroadcast unknown commands', (done) => {
    var client1 = new Bjson.NamedTcpClient("localhost", 52531, "c1", 1, {testr: (a, cb) => { cb(null, 42); }}, function(err) {
      expect(err).not.to.be.ok;
      var client2 = new Bjson.NamedTcpClient("localhost", 52531, "c2", 1, {}, function(err) {
        expect(err).not.to.be.ok;
        client2.request('testr', ["arg"], function(err, resp) {
          expect(err).not.to.be.ok;
          expect(resp).to.eql(42);
          done();
        });
      });
    });

  });
});
