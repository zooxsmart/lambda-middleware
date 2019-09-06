const { response } = require('@zooxsmart/lambda-util');
const debug = require('debug')('lambda-middleware');

module.exports = () => {
  return async (event, context, next) => {
    try {
      return await next(event, context);
    } catch (e) {
      debug(e);
      return response.createErrorResponse(
        e.statusCode || 500,
        e.expose === true ? e.message : null,
      );
    }
  };
};
