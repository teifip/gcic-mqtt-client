const mqtt = require('mqtt');
const jwt = require('node-webtokens');

const SUPPORTED_ALGORITHMS = ['RS256', 'ES256'];

module.exports = function(options) {
  // Verify that projectId is specified (string)
  if (typeof options.projectId !== 'string') {
    throw new TypeError('Missing or invalid projectId value');
  }
  // Verify that registryId is specified (string)
  if (typeof options.registryId !== 'string') {
    throw new TypeError('Missing or invalid registryId value');
  }
  // Verify that deviceId is specified (string)
  if (typeof options.deviceId !== 'string') {
    throw new TypeError('Missing or invalid deviceId value');
  }
  // Verify that cloudRegion is specified (string)
  if (typeof options.cloudRegion !== 'string') {
    throw new TypeError('Missing or invalid cloudRegion value');
  }
  // Verify that privateKey is specified (PEM format, either string or buffer)
  if (options.privateKey instanceof Buffer) {
    options.privateKey = options.privateKey.toString();
  } else if (typeof options.privateKey !== 'string') {
    throw new TypeError('Missing or invalid privateKey value');
  }
  if (!options.privateKey.includes('-----BEGIN') ||
      !options.privateKey.includes('KEY-----')) {
    throw new TypeError('privateKey must be a PEM formatted private key');
  }
  // Verify that tokenAlgorithm is valid or assign default value
  if (options.tokenAlgorithm === undefined) {
    options.tokenAlgorithm = 'RS256';
  } else if (!SUPPORTED_ALGORITHMS.includes(options.tokenAlgorithm)) {
    throw new TypeError('Invalid tokenAlgorithm value');
  }
  // Verify that tokenLifecycle is valid or assign default value
  if (options.tokenLifecycle === undefined) {
    options.tokenLifecycle = 3600; // 1 hour
  } else if (!Number.isInteger(options.tokenLifecycle) ||
             options.tokenLifecycle <= 0 || options.tokenLifecycle > 86400) {
    throw new TypeError('Invalid tokenLifecycle value');
  }
  // Prepare options for MTTQ client
  let tstamp = Math.floor(Date.now() / 1000);
  options.tokenExpiration = tstamp + options.tokenLifecycle;
  options.protocol = 'mqtts';
  options.host = options.host || 'mqtt.googleapis.com';
  options.port = options.port || 8883;
  options.clientId = `projects/${options.projectId}` +
                     `/locations/${options.cloudRegion}` +
                     `/registries/${options.registryId}` +
                     `/devices/${options.deviceId}`;
  options.username = options.username || 'gcic-mqtt-client';
  options.password = jwt.generate(options.tokenAlgorithm, {
    aud: options.projectId,
    exp: options.tokenExpiration
  }, options.privateKey);
  // Create and connect MQTT client
  let client = mqtt.connect(options);
  // Subscribe to config updates if onConfiguration callback is specified
  if (typeof options.onConfiguration === 'function') {
    let topic = `/devices/${client.options.deviceId}/config`;
    let qos = options.qosConfiguration === 1 ? 1 : 0;
    client.subscribe(topic, { qos: qos });
  }
  // Subscribe to commands if onCommand callback is specified
  if (typeof options.onCommand === 'function') {
    let topic = `/devices/${client.options.deviceId}/commands/#`;
    let qos = options.qosCommands === 1 ? 1 : 0;
    client.subscribe(topic, { qos: qos });
  }
  // Confgure the message listener
  client.on('message', (topic, message) => {
    let topicParts = topic.split('/');
    if (topicParts[3] === 'config') {
      client.options.onConfiguration(message);
    } else if (topicParts[3] === 'commands') {
      client.options.onCommand(message, topicParts[4] || null);
    }
  });
  // Extend MQTT client with publishState method
  client.publishState = function(state, qos = 0) {
    if (qos !== 0 && qos !== 1) {
      throw new TypeError('Invalid qos value');
    }
    let topic = `/devices/${client.options.deviceId}/state`;
    client.publish(topic, state, { qos: qos });
  }
  // Extend MQTT client with publishEvent method
  client.publishEvent = function(data, qos = 0, subfolder) {
    if (typeof qos === 'string' && subfolder === undefined) {
      qos = 0;
      subfolder = arguments[1];
    } else if (qos !== 0 && qos !== 1) {
      throw new TypeError('Invalid qos value');
    }
    if (subfolder !== undefined && typeof subfolder !== 'string') {
      throw new TypeError('Invalid subfolder value');
    }
    let topic = subfolder === undefined
              ? `/devices/${client.options.deviceId}/events`
              : `/devices/${client.options.deviceId}/events/${subfolder}`;
    client.publish(topic, data, { qos: qos });
  }
  // MQTT client password (token) auto-renewal
  client.on('offline', () => {
    let tstamp = Math.floor(Date.now() / 1000);
    let remainingTokenTime = client.options.tokenExpiration - tstamp;
    // Emit 'disconnect' event with indication of whether token was expired
    client.emit('disconnect', remainingTokenTime < 0);
    if (remainingTokenTime < client.options.tokenLifecycle / 2) {
      client.options.tokenExpiration = tstamp + client.options.tokenLifecycle;
      client.options.password = jwt.generate(client.options.tokenAlgorithm, {
        aud: client.options.projectId,
        exp: client.options.tokenExpiration
      }, client.options.privateKey);
      // Emit 'token_renewal' event with new token expiration as argument
      client.emit('token_renewal', client.options.tokenExpiration);
    }
  });
  // Extend MQTT client with changePrivateKey method
  client.changePrivateKey = function(newPrivateKey) {
    if (newPrivateKey instanceof Buffer) {
      newPrivateKey = newPrivateKey.toString();
    } else if (typeof newPrivateKey !== 'string') {
      throw new TypeError('Invalid new private key');
    }
    if (!newPrivateKey.includes('-----BEGIN') ||
        !newPrivateKey.includes('KEY-----')) {
      throw new TypeError('New private key must be in PEM format');
    }
    client.options.privateKey = newPrivateKey;
  }
  // Return MQTT client
  return client;
}
