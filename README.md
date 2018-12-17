# gcic-mqtt-client

Simple helper to build [Google Cloud IoT Core](https://cloud.google.com/iot-core/) MQTT clients with the renowned [MQTT.js](https://www.npmjs.com/package/mqtt) library.
This helper enhances the [MQTT.js](https://www.npmjs.com/package/mqtt) library with:
- Configuration parameters specific to the [Google Cloud IoT Core](https://cloud.google.com/iot-core/) solution;
- Methods to publish device events and state updates in a straightforward manner;
- Automatic subscription to device configuration updates and commands;
- Support for auto-renewal of the device token ([JWT](https://tools.ietf.org/html/rfc7519) used as MQTT client password).

All the options, methods and events supported by the [MQTT.js](https://www.npmjs.com/package/mqtt) library remain accessible, so that taking advantage of this helper does not cause any loss of functionality.

### Overview

```javascript
const mqtt = require('gcic-mqtt-client');

const options = {
  projectId: 'my-project',
  registryId: 'my-registry',
  deviceId: 'my-device',
  cloudRegion: 'us-central1',
  privateKey: fs.readFileSync('./rsa_private.pem')
};

const client = mqtt(options);

// Publish an event
client.publishEvent(data);

// Publish a state update
client.publishState(state);
```

The client can automatically subscribe to device configuration updates and invoke a callback every time device configuration is dispatched to the device. Similarly, the client can automatically subscribe to commands and invoke a callback every time a command is dispatched to the device.

```javascript
const mqtt = require('gcic-mqtt-client');

const options = {
  projectId: 'my-project',
  registryId: 'my-registry',
  deviceId: 'my-device',
  cloudRegion: 'us-central1',
  privateKey: fs.readFileSync('./rsa_private.pem'),
  onConfiguration: processConfiguration, // <--- callback
  onCommand: processCommand              // <--- callback
};

const client = mqtt(options);

function processConfiguration(configuration) {
  /* Process configuration data, possibly
     replying with a device state update */
}

function processCommand(command, subfolder) {
  /* Process the command */
}
```

All the events supported by the [MQTT.js](https://www.npmjs.com/package/mqtt) library remain accessible. For example:

```javascript
const mqtt = require('gcic-mqtt-client');

const client = mqtt(options);

client.on('connect', () => {
  console.log('Connected!');
});

client.on('error', (error) => {
  console.log(error.message);
});
```

### Installation

```
npm install gcic-mqtt-client --save
```

### Usage

The client is created and connected by invoking the helper module with an `options` object.

```javascript
const mqtt = require('gcic-mqtt-client');

const client = mqtt(options);
```

The following table lists the properties of the `options` object:

| Property          | Description |
|:------------------|:------------|
| `projectId`       | REQUIRED - String; identifies the Google Cloud IoT project
| `cloudRegion`     | REQUIRED - String; identifies the Google Cloud IoT Core cloud region
| `registryId`      | REQUIRED - String; identifies the Google Cloud IoT Core device registry
| `deviceId`        | REQUIRED - String; identifies the Google Cloud IoT Core device
| `privateKey`      | REQUIRED - String or buffer; device private key in PEM format; must be consistent with the selected `tokenAlgorithm`
| `tokenAlgorithm`  | OPTIONAL - String with `RS256` as default value; cryptographic algorithm for signing the token used as MQTT client password; Google Cloud IoT Core currently supports choice between `RS256` (2048-bit RSA key) and `ES256` (P-256 EC key). When choosing between the two algorithms, consider that generating `ES256` signatures is way faster than generating `RS256` signatures
| `tokenLifecycle`  | OPTIONAL - Integer with `3600` as default value and `86400` as maximum allowed value; specifies the time validity of the device token in seconds; Google Cloud IoT Core automatically disconnects devices after their tokens have expired; a grace period of approximately 10 minutes is observed to compensate for possible clock skews
| `onConfiguration` | OPTIONAL - Callback invoked whenever Google Cloud IoT Core publishes configuration information for the device. The MQTT client subscribes to configuration updates only if `onConfiguration` is specified. At every configuration update the MQTT client invokes the `onConfiguration` callback with `(configuration)` as argument; `configuration` is the received configuration passed as buffer
| `qosConfiguration` | OPTIONAL - Integer equal to either `0` (at most once) or `1` (at least once, default value); determines the QoS with which the client subscribes to configuration updates
| `onCommand`       | OPTIONAL - Callback invoked whenever Google Cloud IoT Core sends a command to the device. The MQTT client subscribes to commands only if `onCommand` is specified. At every command the MQTT client invokes the `onCommand` callback with `(command, subfolder)` as arguments; `command` is the received command passed as buffer; `subfolder` is `null` if the command was published to `/devices/{deviceId}/commands` or a string if the command was published to `/devices/{deviceId}/commands/{subfolder}`
| `qosCommands`     | OPTIONAL - Integer equal to either `0` (at most once, default value) or `1` (at least once); determines the QoS with which the client subscribes to commands
| `host`            | OPTIONAL - String with `mqtt.googleapis.com` as default; identifies the Google Cloud IoT Core MQTT bridge host
| `port`            | OPTIONAL - Integer with `8883` as default; identifies the Google Cloud IoT Core MQTT bridge port number
| `keepalive`       | OPTIONAL - Integer with `60` as default value; specifies the interval in seconds at which the MQTT client sends PINGREQ packets. The `keepalive` value should be tuned considering the trade-off between rapid detection of client disconnections vs amount of background traffic generated. Note that PINGREQ packets count against Google Cloud IoT Core billing  
| `reschedulePings` | OPTIONAL - Boolean with `true` as default value; controls whether the transmission of PINGREQ packets is rescheduled after sending other packets so that outgoing traffic is minimized
| `reconnectPeriod` | OPTIONAL - Integer with `1000` as default value; specifies the time interval in milliseconds between consecutive reconnection attempts
| `connectTimeout`  | OPTIONAL - Integer with `30000` as default value; specifies the maximum time in milliseconds waited before a CONNACK packet is received
| `queueQoSZero`    | OPTIONAL - Boolean with `true` as default value; controls whether outgoing messages with QoS=0 are queued or not during periods of disconnection
| `localAddress`    | OPTIONAL - String; identifies the local network address the MQTT client should connect from; when omitted, no binding is established and the MQTT client is allowed to use any available network interface
| `incomingStore`   | OPTIONAL - Support for alternative implementations of the message store; refer to the documentation of the [MQTT.js](https://www.npmjs.com/package/mqtt) library for details
| `outgoingStore`   | OPTIONAL - Same as above

A typical `options` object will be something like the following:

```javascript
const options = {
  projectId: 'my-project',
  registryId: 'my-registry',
  deviceId: 'my-device',
  cloudRegion: 'us-central1',
  tokenAlgorithm: 'ES256',
  tokenLifecycle: 86400, // 24 hours
  privateKey: fs.readFileSync('./ec_private.pem'),
  keepalive: 300, // 5 minutes
  onConfiguration: processConfiguration, // callback to be declared
  onCommand: processCommand // callback to be declared
};
```

Once the MQTT client has been created, all the methods and events supported by the [MQTT.js](https://www.npmjs.com/package/mqtt) library are accessible. In addition, this helper provides support for the following methods and events:

**client.publishEvent(event[, qos][, subfolder])**

Used to publish device telemetry events. Arguments are defined as follows:
- `event` - event data, either as string or as buffer;
- `qos` - either `0` (at most once) or `1` (at least once), with `0` as default;
- `subfolder` - subfolder to which the event should be published; if `subfolder` is omitted, then the event is published to `/devices/{deviceId}/events`; if `subfolder` is specified, then the event is published to `/devices/{deviceId}/events/subfolder`.

Example:

```javascript
const data = { 'sensor1': 'motion_detected' };

// Publish to 'alerts' subfolder with QoS=1
mqtt.publishEvent(JSON.stringify(data), 1, 'alerts');
```

Google Cloud IoT Core includes the subfolder name when mapping events from the MQTT bridge to Google Cloud Pub/Sub.

**client.publishState(state[, qos])**

Used to publish device state. Arguments are defined as follows:
- `state` - state data, either as string or as buffer;
- `qos` - either `0` (at most once) or `1` (at least once), with `0` as default.

Example:

```javascript
const state = {
  'fan1_target_rpm': 1000,
  'fan2_target_rpm': 1200,
  'firmware_version': '1.2.3b'
};

// Publish with QoS=0
client.publishState(JSON.stringify(state));
```

**client.changePrivateKey(newKey)**

Used to replace the private key used to sign tokens. The `newKey` must be in PEM format, passed either as string or as buffer, and must be consistent with the `tokenAlgorithm` selected at client creation time (i.e. of the same type as the key being replaced).

The key replacement can be initiated at any time, but takes effect at the next token auto-renewal.

Example:

```javascript
const newKey = fs.readFileSync('./ec_private2.pem');

client.changePrivateKey(newKey);
```

Google Cloud IoT Core enables key rotation by allowing up to three public keys or certificates to be associated with an individual device at any given time.

**client.on('disconnect', (tokenExpired) => { });**

The `disconnect` event is intended to be used in lieu of the `offline` event supported by the [MQTT.js](https://www.npmjs.com/package/mqtt) library. The `disconnect` event is emitted every time an `offline` event is emitted, but the `disconnect` event comes with the indication of whether the token was found expired or not (`tokenExpired` boolean flag).

In general, a disconnection reported with `tokenExpired` equal to `true` may simply be the symptom of a periodic token expiration, and be automatically solved by the token auto-renewal function supported by this helper module. However, please consider that Google Cloud IoT Core observes a relatively long grace period (approximately 10 minutes) before disconnecting a device whose token has expired. This creates a time window in which the `disconnect` event is reported with `tokenExpired` equal to `true` even if the actual cause of disconnection was not the token expiration itself. Additional insight may be obtained by listening to `error` events in addition to `disconnect` events.

**client.on('token_renewal', (expires) => { });**

The `token_renewal` event is emitted whenever the token auto-renewal function supported by this helper module takes care of generating a new token. The `expires` argument is an integer number that indicates the expiration time of the new token expressed as UNIX timestamp in seconds.

The following example summarizes the set of MQTT client events that may be reasonable to monitor. The definition of the corresponding event handlers is application specific.

```javascript
client.on('connect', () => {
  console.log('Connected!');
  // Connected!
});

client.on('disconnect', (tokenExpired) => {
  console.log('Disconnected; token has expired:', tokenExpired);
  // Disconnected; token has expired: true
});

client.on('error', (error) => {
  console.log(error.message);
  // Connection refused: Not authorized
});

client.on('token_renewal', (expires) => {
  console.log('New token generated; new expiration time:', expires);
  // New token generated; new expiration time: 1507002199
});
```

### Token auto-renewal

Each device that connects to the Google Cloud IoT Core MQTT bridge uses a [JSON Web Token](https://tools.ietf.org/html/rfc7519) as MQTT password. This helper module supports a token auto-renewal function intended to ensure prompt token replacement and device reconnection whenever a device gets disconnected because its token has expired. Specifically, whenever the device experiences a disconnection - if one of the following conditions holds true - a new token is generated before attempting reconnection:
- The current token has expired;
- The remaining validity time of the current token is less than half of the configured token `tokenLifecycle` period.

The second point above has the intent to proactively replace the token when a disconnection due to causes such as network problems is experienced, thus moving farther in the future the need to disconnect/reconnect to replace the token. The criterion of waiting until at least half of the token lifecycle has been consumed protects against repeated token replacements in presence frequent disconnections, e.g. because of unstable network conditions.
