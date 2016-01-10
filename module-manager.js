"use strict";

var Bjson       = require('bj-stream-rpc'),
    winston     = require('winston'),
    path        = require('path'),
    fs          = require('fs'),
    SnailEscape = require('snailescape.js');

var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function stringifyArgs(args) {
  var strParts = [];
  for(var i=0;i<arguments.length;i++) {
    if(typeof arguments[i] === 'string') {
      strParts.push(arguments[i]);
    } else if(Array.isArray(arguments[i])) {
      strParts = strParts.concat(stringifyArgs.apply(this, arguments[i]));
    } else if(arguments[i] === undefined || arguments[i] === null) {
      strParts.push('');
    } else{
      strParts.push(arguments[i].toString());
    }
  }
  return strParts;
}

var config = null;


module.exports = function(conf, irc) {
  config = conf;
  return moduleManager;
};

function moduleManager(irc) {
  var managerFns = {
    sayTo: function(to, args) {
      var strs = stringifyArgs(args);
      irc.send(to, stringifyArgs(args).join(' '));
    },
    say: function(args) {
      args = Array.prototype.slice.call(arguments);
      managerFns.sayTo.apply(this, [config.mainChannel].concat(args));
    },
  };

  var fnResolver = (name, cb) => {
    return function(args) {
      server.map.apply(this, [name].concat(args.concat(cb)));
    };
  };

  let quotedSplit = new SnailEscape();
  // Create our server on a well-known port
  var server = new Bjson.NamedTcpServer("0.0.0.0", 52531, managerFns, {buffer: true}, function(err) {
    if(err) {
      winston.error("Could not create NamedTcpServer", {err: err});
      return;
    }
    // Woo!
    irc.on('message', function(msg) {
      server.broadcast("irc_message", msg);
      var primaryFrom = (msg.to == irc.me) ? msg.from : msg.to;
      var text = msg.message;
      if(text == "!LIST_CLIENTS") winston.debug(server);
      if(text.substring(0, config.commandPrefix.length) == config.commandPrefix) {
        var re = new RegExp('^' + reEscape(config.commandPrefix) + '(\\S*)\\s*(.*)$', 'g');
        var rem = re.exec(text);
        var command = rem[1];
        var remainder = rem.length == 3 ? rem[2] : "";
        var respTo = primaryFrom;

        var parts = quotedSplit.parse(remainder).parts || remainder.split(" ");
        server.broadcast("command", [command, remainder, parts, respTo, msg.from, msg.to, text]);
      }
    });
  });
}
