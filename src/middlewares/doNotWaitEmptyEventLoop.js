module.exports = (wait = false) => {
  return async (event, context, next) => {
    // eslint-disable-next-line no-param-reassign
    context.callbackWaitsForEmptyEventLoop = wait;

    return next(event, context);
  };
};
