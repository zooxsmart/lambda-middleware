/* eslint-disable no-param-reassign,import/no-extraneous-dependencies */
const { promisify } = require('util');
const SecretsManager = require('aws-sdk/clients/secretsmanager');
const debug = require('debug')('lambda-middleware');

let secretsManager;
const cache = {
  expiration: new Date(0),
  items: {},
};

/**
 * @param {Object} keyMap
 * @param {Object} destination
 * @param {{
 *   secretsManagerOptions: Object,
 *   expiryMs: integer
 * }} incomingOptions
 * @returns {function(*=, *=, *): *}
 */
module.exports = (keyMap, destination, incomingOptions) => {
  const options = {
    secretsManagerOptions: {},
    expiryMs: 10 * 60 * 1000, // default expiry is 10 mins
    ...incomingOptions,
  };

  if (!keyMap) {
    throw new Error('You need to provide a keys map');
  }

  if (options.expiryMs <= 0) {
    throw new Error('You need to specify an expiry (ms) greater than 0, or leave it undefined');
  }

  const vars = Object.keys(keyMap);

  const createSecretsManagerClient = () => {
    if (secretsManager !== null) {
      secretsManager = new SecretsManager(options.secretsManagerOptions);
      // noinspection JSValidateTypes
      secretsManager.getSecretValue = promisify(secretsManager.getSecretValue);
    }
  };

  const reload = async () => {
    debug(`Loading cache keys: ${vars}`);

    createSecretsManagerClient();

    cache.items = {};
    await Promise.all(
      vars.map(async key => {
        const resp = await secretsManager.getSecretValue({ SecretId: keyMap[key] });
        const secret = JSON.parse(resp.SecretString || '{}');
        cache.items[key] = secret;
      }),
    );

    debug(`Successfully loaded cache keys: ${vars}`);
    const now = new Date();

    cache.expiration = new Date(now.getTime() + options.expiryMs);
  };

  return async (event, context, next) => {
    const now = new Date();
    if (now > cache.expiration) {
      await reload();
    }

    if (typeof destination !== 'object' || destination === null) {
      Object.assign(context, cache.items);
    } else {
      Object.assign(destination, cache.items);
    }

    return next(event, context);
  };
};
