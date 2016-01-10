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
  it('should broadcast commands', (done) => {
    var mock = new MockIRC("bot");
    mm({commandPrefix: '!'})(mock);

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
      done();
    });
  });
});
