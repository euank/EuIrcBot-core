var Bjson   = require('bj-stream-rpc'),
    winston = require('winston'),
    path    = require('path'),
    fs = require('fs');

var reEscape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function quotedSplit(str) {
  var res = [];
  var currentStr = '';
  var inQuotes = false;
  for(var i=0;i<str.length;i++) {
    if(inQuotes && str[i] === '"') {
      res.push(currentStr);
      inQuotes = false;
      currentStr = '';
    } else if(str[i] === '"' && !inQuotes) {
      inQuotes = true;
      if(currentStr !== '') res.push(currentStr);
      currentStr = '';
    } else if(str[i] === ' ' && !inQuotes) {
      if(currentStr !== '') res.push(currentStr);
      currentStr = '';
    } else if(str[i] === "\\") {
      i++;
      currentStr += str[i];
    } else {
      currentStr += str[i];
    }
  }
  if(currentStr !== '') res.push(currentStr);
  return res;
}

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

var supportedConfigTypes = [
  {
    exts: [".json"],
    test: null, //TODO
    parse: function(data, loc, cb) {
      try {
        cb(null, JSON.parse(data));
      } catch(ex) {
        cb(ex);
      }
    },
  },
  {
    exts: ['.js'],
    test: null,
    parse: function(data, loc, cb) {
      try {
        cb(null, require(loc));
      } catch(ex) {
        cb(ex);
      }
    }
  }
];


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
		getConfig: function(name, cb) {
			var fullPath = path.join(config.configfolder, name);
			var done = false;
			fs.readFile(fullPath,{encoding: 'utf8'}, function(err, res) {
				if(err) return cb(err);

				var ext = path.extname(fullPath);
				supportedConfigTypes.forEach(function(type) {
					if(_.any(type.exts, function(e) { return e === ext; })) {
						type.parse(res, fullPath, cb);
						done = true;
						return false;
					}
				});
				if(!done) return cb(null, res);
			});
		},
	};

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
			if(text == "!LIST_CLIENTS") console.log(server);
			if(text.substring(0, config.commandPrefix.length) == config.commandPrefix) {
				var re = new RegExp('^' + reEscape(config.commandPrefix) + '(\\S*)\\s*(.*)$', 'g');
				var rem = re.exec(text);
				var command = rem[1];
				var remainder = rem.length == 3 ? rem[2] : "";
				var respTo = primaryFrom;

				server.broadcast("command", [command, remainder, quotedSplit(remainder), respTo, msg.from, msg.to, text]);
			}
		});
	});
}
