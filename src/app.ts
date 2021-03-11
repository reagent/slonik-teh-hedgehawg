import express from 'express';
import httpStatus from 'http-status';

import { createPool, sql, TypeParserType } from 'slonik';
import type { DatabasePoolType } from 'slonik';
import { UserService } from './services';

const timestampParser = (value: string | null) => {
  return value === null ? value : new Date(value);
};

export const createTimestampWithTimeZoneTypeParser = (): TypeParserType => {
  return {
    name: 'timestamptz',
    parse: timestampParser,
  };
};

const pool: DatabasePoolType = createPool(
  'postgres://localhost/slonik_development',
  { typeParsers: [createTimestampWithTimeZoneTypeParser()] }
);

const app = express();
app.use(express.json());

class NotFoundError extends Error {
  constructor() {
    super('Resource not found');
  }
}

const errorHandler: express.ErrorRequestHandler = (err, _req, resp, _next) => {
  if (err instanceof NotFoundError) {
    return resp.status(httpStatus.NOT_FOUND).json({ error: 'Not found' }).end();
  }

  resp
    .status(httpStatus.INTERNAL_SERVER_ERROR)
    .json({ error: err.message })
    .end();
};

/* 
curl -s \
  -H "Content-Type: application/json" \
  "http://localhost:3000/users/910c5d73-4078-4050-934f-96e05d2e0a34" | jq .
*/
app.get('/users/:id', async (req, resp, next) => {
  const userService = new UserService(pool);

  const user = await userService.findById(req.params.id);

  if (!user) {
    return next(new NotFoundError());
  }

  resp.status(httpStatus.OK).json({ user }).end();
});

/* 
curl -s \
  -H "Content-Type: application/json" \
  "http://localhost:3000/users" | jq .
*/
app.get('/users', async (_, resp) => {
  const userService = new UserService(pool);
  const users = await userService.all();

  resp.status(httpStatus.OK).json({ users });
});

/*
curl -s \
  -H "Content-Type: application/json" \
  -d '{"email":"user@host.example"}' \
  "http://localhost:3000/users" | jq .
*/
app.post('/users', async (req, resp, next) => {
  const { email } = req.body;

  if (!email) {
    return resp
      .status(httpStatus.UNPROCESSABLE_ENTITY)
      .json({ error: 'Missing email' });
  }

  const userService = new UserService(pool);

  try {
    const user = await userService.create({ email });

    resp.status(httpStatus.OK).json(user);
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(3000, () => {
  console.log('listening on 3000');
});
