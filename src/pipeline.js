const doNotWaitEmptyEventLoop = require('./middlewares/doNotWaitEmptyEventLoop');
const errorHandler = require('./middlewares/errorHandler');
const eventParser = require('./middlewares/eventParser');

const app = (incomingOptions = {}) => {
  const options = {
    useRecommended: true,
    ...incomingOptions,
  };
  const middlewareList = [];
  let finalHandler;

  const run = ([first, ...others]) => {
    if (!first) {
      return finalHandler;
    }

    return async (event, context) => {
      return first(event, context, run(others));
    };
  };

  const instance = async (event, context) => {
    return run(middlewareList)(event, context);
  };

  instance.use = middleware => {
    middlewareList.push(middleware);
  };

  instance.handler = handler => {
    finalHandler = handler;
  };

  if (options.useRecommended) {
    instance.use(doNotWaitEmptyEventLoop());
    instance.use(errorHandler());
    instance.use(eventParser());
  }

  return instance;
};

module.exports = app;
