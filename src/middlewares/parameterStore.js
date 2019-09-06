/* eslint-disable no-param-reassign,import/no-extraneous-dependencies */
const { promisify } = require('util');
const SSM = require('aws-sdk/clients/ssm');
const debug = require('debug')('lambda-middleware');

let ssm;
const cache = {
  expiration: new Date(0),
  items: {},
};

/**
 * @param {Object} keyMap
 * @param {Object} destination
 * @param {{
 *   ssmOptions: Object,
 *   expiryMs: integer
 * }} incomingOptions
 * @returns {function(*=, *=, *): *}
 */
module.exports = (keyMap, destination, incomingOptions) => {
  const options = {
    ssmOptions: {},
    expiryMs: 10 * 60 * 1000, // default expiry is 10 mins
    ...incomingOptions,
  };

  if (!keyMap) {
    throw new Error('You need to provide a keys map');
  }

  if (typeof destination !== 'object' || destination === null) {
    throw new Error('Destination must be an object');
  }

  if (options.expiryMs <= 0) {
    throw new Error('You need to specify an expiry (ms) greater than 0, or leave it undefined');
  }

  const vars = Object.keys(keyMap);
  const keys = Object.values(keyMap);

  const createParameterStoreClient = () => {
    if (ssm !== null) {
      ssm = new SSM(options.ssmOptions);
      // noinspection JSValidateTypes
      ssm.getParameters = promisify(ssm.getParameters);
    }
  };

  const validate = (keys2, params) => {
    const missing = keys2.filter(k => params[k] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing keys: ${missing}`);
    }
  };

  const reload = async () => {
    debug(`Loading cache keys: ${vars}`);

    const req = {
      Names: keys,
      WithDecryption: true,
    };

    createParameterStoreClient();

    const resp = await ssm.getParameters(req);

    const params = {};
    resp.Parameters.forEach(p => {
      params[p.Name] = p.Value;
    });

    validate(keys, params);

    debug(`Successfully loaded cache keys: ${vars}`);
    const now = new Date();

    cache.expiration = new Date(now.getTime() + options.expiryMs);
    cache.items = params;
  };

  return async (event, context, next) => {
    const now = new Date();
    if (now > cache.expiration) {
      await reload();
    }

    vars.forEach(key => {
      destination[key] = cache.items[keyMap[key]];
    });

    return next(event, context);
  };
};
