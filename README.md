# EuIrcBot-Core

This is the core to EuIrcBot. It should be fairly minimal, though any
functionality that would likely be implemented by all module managers may be
included here (e.g. configuration management, command parsing, etc).

## How it works

The core is responsible for connecting to a given irc server and emitting
events to its module-manager.

This "module-manager" is really a meta-module-manager or a
module-manager-manager which opens the well-known port 43778 and listens for
connections from the actual module managers.

The protocol these module managers use to speak can be found in bj-stream-rpc.


## TODO

There are many features that should be implemented, but or not, due to the
design philosophy of minimum viable (functional) product.

* Buffer messages for a module-manager when it disconnects/reconnects within a
	short time period (buffer up to 10 mins perhaps)
* Don't leak memory (ugh)
* Better logging
* Switch to a sane RPC system that isn't whatever the heck this is
