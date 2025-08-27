import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const input = ctx.args?.input ?? {};
  const { id, username, email } = input;

  // Validate required fields
  if (!id || !username || !email) {
    util.error('Missing required fields: id, username, email', 'ValidationError');
  }

  const now = util.time.nowISO8601();

  // Full item to return to the client
  const item = {
    id,
    username,
    email,
    name: input.name ?? username,
    avatar: input.avatar ?? '👤',
    status: input.status ?? 'online',
    createdAt: now,
    updatedAt: now,
  };

  // Make available to response()
  ctx.stash.item = item;

  // Exclude the key from attributeValues
  const { id: _ignored, ...attributes } = item;

  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ id }),
    attributeValues: util.dynamodb.toMapValues(attributes),
    // Remove the condition to allow overwriting existing users
    // This will update the user if they already exist
  };
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === 'ConditionalCheckFailedException') {
      util.error('User already exists with this id', 'ConflictError');
    }
    util.error(ctx.error.message, ctx.error.type ?? 'DynamoDBError', ctx.error);
  }
  return ctx.stash.item;
}
