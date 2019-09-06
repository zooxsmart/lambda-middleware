/* eslint-disable global-require */
module.exports = {
  pipeline: require('./src/pipeline'),
  errorHandler: require('./src/middlewares/errorHandler'),
  eventParser: require('./src/middlewares/eventParser'),
  doNotWaitEmptyEventLoop: require('./src/middlewares/doNotWaitEmptyEventLoop'),
  halResponse: require('./src/middlewares/halResponse'),
  parameterStore: require('./src/middlewares/parameterStore'),
};
