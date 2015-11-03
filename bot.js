var irc = require('slate-irc'),
    moduleManager = require('./module-manager.js'),
    net = require('net'),
    tls = require('tls'),
    configLoader = require('EuNodeConfig'),
    Q = require('q'),
    winston = require('winston'),
    defaultConfig = require("./config.example.json");


function Bot(config) {
	this.config = config;
	this.nick = config.nick;
	winston.info("Instantiated bot with config", {config: config});
}

Bot.prototype.connect = function() {
	var deferred = Q.defer();
	var res;
	var bot = this;
	var config = bot.config;
	if(config.ssl) {
		res = irc(tls.connect({
			host: config.server,
			port: config.port
		}));
	} else {
		res = irc(net.connect({
			host: config.server,
			port: config.port,
		}));
	}

	bot.irc = res;
	if(typeof bot.config.password === 'string') {
		bot.irc.pass(bot.config.password);
	}
	bot.irc.user(bot.config.userName, bot.config.realName);
	bot.irc.nick(bot.config.nick);

	deferred.resolve(this);
	return deferred.promise;
};

Bot.prototype.waitForWelcome = function() {
	var bot = this;
	var deferred = Q.defer();

	bot.irc.on('welcome', function(nick) {
		bot.nick = nick;
		winston.info("Recieved welcome", {nick: nick});
		deferred.resolve(bot);
	});

	return deferred.promise;
}

Bot.prototype.joinChannels = function() {
	var deferred = Q.defer();
	var bot = this;

	bot.irc.join(bot.config.mainChannel);
	bot.config.channels.forEach(function(chan) {
		winston.info("Joining channel", {chan: chan});
		bot.irc.join(chan);
	});
	deferred.resolve(this);
	return deferred.promise;
};

Bot.prototype.startModuleManager = function() {
	var bot = this;
	bot.irc.use(moduleManager(bot.config));
};

configLoader.loadConfig(defaultConfig, {configFolders: '.'})
.then(function(config) {
	return Q.fcall(function() {
		return new Bot(config);
	});
}).then(function(bot) {
	return bot.connect();
}).then(function(bot) {
	return bot.waitForWelcome();
}).then(function(bot) {
	return bot.joinChannels();
}).then(function(bot) {
	return bot.startModuleManager();
}).fail(function(err) {
	winston.error(err);
});
