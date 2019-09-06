const { response, hal } = require('@zooxsmart/lambda-util');

module.exports = incomingOptions => {
  const options = {
    path: null,
    collectionName: null,
    entityPath: null,
    ...incomingOptions,
  };

  const halEntity = async (event, context, next) => {
    const entity = await next(event, context);
    const resource = hal.toHal(entity, options.path || event.path);
    return response.createResponse(200, resource.toJSON());
  };

  const halCollection = async (event, context, next) => {
    const collection = await next(event, context);
    const resource = hal.toHalCollection(
      collection,
      options.collectionName,
      event.path,
      options.entityPath,
      event.queryStringParameters,
      context.collectionCount || null,
    );
    return response.createResponse(200, resource.toJSON());
  };

  return {
    halEntity,
    halCollection,
  };
};
