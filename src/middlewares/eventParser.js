/* eslint-disable no-param-reassign */
const createError = require('http-errors');

module.exports = incomingOptions => {
  const options = {
    parseBody: true,
    ...incomingOptions,
  };

  const httpParser = event => {
    event.pathParameters = event.pathParameters || {};
    event.queryStringParameters = event.queryStringParameters || {};
    event.requestContext = event.requestContext || {};
    event.requestContext.authorizer = event.requestContext.authorizer || {};
    if (options.parseBody) {
      try {
        event.body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (err) {
        throw new createError.BadRequest('Invalid JSON format');
      }
    }
  };

  return async (event, context, next) => {
    if (Object.prototype.hasOwnProperty.call(event, 'httpMethod')) {
      httpParser(event);
    }

    return next(event, context);
  };
};
