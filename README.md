### Intro

@zooxsmart/lambda-middleware is a simple middleware implementation for AWS Lambda.

It uses async/await for handlers, no "callback hell".

This module also provides some basic middlewares.

### Example

```javascript
const middleware = require('@zooxsmart/lambda-middleware');
const CompanyMapper = require('./CompanyMapper');
const getParams = require('./getParams');

const handler = middleware.pipeline();

handler.use(getParams());
handler.use(middleware.halResponse().halEntity);

handler.handler(async event => {
  const mapper = new CompanyMapper();

  return mapper.fetch(event.pathParameters.id);
});

module.exports = { handler };
```

Here we have a get company example using some recommended lambda middlewares embedded in ```middleware.pipeline()```,
decorates the output with HAL links for the entity and a custom middleware ```getParam()``` to fetch database parameters.

### How it works

This module implements the middleware pipeline in a onion style.

The terminology "pipeline" is often used to describe the onion. One way of looking at the "onion" is as a queue, which is first-in-first-out (FIFO) in operation. This means that the first middleware on the queue is executed first, and this invokes the next, and so on (and hence the "next" terminology)

Each middleware receives the event and context, and pass to the handler only when wanting to hand off processing.

A middleware can return a response immediately, for example validate in input before handling it to the handler. In this case, the pipeline will not continue and the request will not even reach the handler.

### Pipeline

The pipeline will return the middleware engine.

Options:
```javascript
{
    useRecommended: true
}
```

* useRecommended: Will automatically add the following middlewares at the top:
    - doNotWaitEmptyEventLoop
    - errorHandler
    - eventParser

You can add other middlewares using the ```use(middleware)``` method and finally your handler with the ```handler(handler)``` method.

### Middlewares

#### Included (more on the way)

##### doNotWaitEmptyEventLoop(wait = false)
Will set ```context.callbackWaitsForEmptyEventLoop = wait;```

#### errorHandler
Will wrap the following middlewares and handler with a try/catch and return a formatted json response (recommended using http-errors)

#### eventParser({ parseBody: true })
Will parse a body string into json and ensure the presence of pathParameters, queryStringParameters, requestContext and requestContext.authorizer.

#### halResponse({ path: null, collectionName: null, entityPath: null })
Will decorate an entity json with the _link.self from HAL and a collection with links, pagination, and it's entities.
* path: the path to include in the _link.self . Fallback to the current event.path if not provided
* collectionName: the collection name (duh) to be named in the _embedded
* entityPath: the entity path prefix. Will append the entity id

#### parameterStore(keyMap, destination, { ssmOptions: {}, expiryMs: 10 * 60 * 1000 })
Will fetch the keys from SSM Parameter Store, embed in the destination and cache the result for the specified expiryMs.
* keyMap: A map of key names and paths in SSM. Example:
{
    MYSQL_HOST: '/production/MYSQL_HOST',
    MYSQL_USER: '/production/MYSQL_USER',
    MYSQL_PASS: '/production/MYSQL_PASS',
}
* destination: the destination of the parameters. Example: ```process.env```, ```context```
* ssmOptions: Will be passed to the SSM constructor
* expiryMs: Will keep the parameters in the memory cache for expiryMs in milliseconds. Default is 10 minutes.


#### secretsManager(keyMap, destination, { secretsManagerOptions: {}, expiryMs: 10 * 60 * 1000 })
Will fetch the keys from AWS Secrets Manager, embed in the destination and cache the result for the specified expiryMs.
* keyMap: A map of key names and paths in Secrets Manager. Example:
{
    MYSQL_HOST: '/production/MYSQL_HOST',
    MYSQL_USER: '/production/MYSQL_USER',
    MYSQL_PASS: '/production/MYSQL_PASS',
}
* destination: the destination of the parameters. Example: ```context``` . context will be used if null
* secretsManagerOptions: Will be passed to the AWS.secretsmanager constructor
* expiryMs: Will keep the parameters in the memory cache for expiryMs in milliseconds. Default is 10 minutes.

#### Custom
You can create a custom middleware and even call another middleware, just follow the following signature and example:
```javascript
const middleware = require('../lambda-middleware');

module.exports = () => {
  return async (event, context, next) => {
    if (process.env.NODE_ENV !== 'development') {
      const params = {};
      await secretManager({ MYSQL: 'prod/mysql' })(event, params, (ev, ctx) => {
        process.env.MYSQL_HOST = ctx.MYSQL.host;
        process.env.MYSQL_USER = ctx.MYSQL.username;
        process.env.MYSQL_PASS = ctx.MYSQL.password;
      });
    }

    return next(event, context);
  };
};
```

```javascript
const middleware = require('../lambda-middleware');

module.exports = () => {
  return async (event, context, next) => {
    if (process.env.NODE_ENV !== 'development') {
      return middleware.parameterStore(
        {
          MYSQL_HOST: '/production/MYSQL_HOST',
          MYSQL_USER: '/production/MYSQL_USER',
          MYSQL_PASS: '/production/MYSQL_PASS',
        },
        process.env,
      )(event, context, next);
    }

    return next(event, context);
  };
};
```

***Warning*** Don't forget to call ```return next(event, context)``` at the end or the pipeline will not continue and will get no response.
