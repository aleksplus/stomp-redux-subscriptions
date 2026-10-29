import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventChannel } from 'redux-saga';
import { takeEvery } from 'redux-saga/effects';

import { createStartHandler } from '../src/handlersFactories';
import { createEnv, sleep, START, STOP, ERROR } from './sagaEnv';

// A channel good enough for channelHandling: nobody ever emits, so take()
// parks the saga; teardown marks the channel closed, which is what we assert.
const stubChannel = () => {
  let closed = false;
  const channel = eventChannel((_emit: any) => {
    return () => {
      closed = true;
    };
  });
  return { channel: channel as any, isClosed: () => closed };
};

const watchStart = (stopSubActions: string[]) => {
  const createdPayloads: any[] = [];
  const channels: { channel: any; isClosed: () => boolean }[] = [];
  const createChannel = (payload: any) => {
    createdPayloads.push(payload);
    const stub = stubChannel();
    channels.push(stub);
    return stub.channel;
  };

  const watcher = function* (): Generator<any, any, any> {
    yield takeEvery(
      START,
      createStartHandler(stopSubActions)(createChannel) as any,
    );
  };
  return { watcher, createdPayloads, channels };
};

test('creates a channel with the start payload and keeps it open', async () => {
  const env = createEnv();
  const { watcher, createdPayloads, channels } = watchStart([STOP, ERROR]);
  env.sagaMiddleware.run(watcher);

  env.dispatch({ type: START, payload: { id: 1 } });
  await sleep(50);

  assert.deepEqual(createdPayloads, [{ id: 1 }]);
  assert.equal(channels[0].isClosed(), false);
});

test('closes the channel only on a stop action with a matching payload', async () => {
  const env = createEnv();
  const { watcher, channels } = watchStart([STOP, ERROR]);
  env.sagaMiddleware.run(watcher);

  env.dispatch({ type: START, payload: { id: 1 } });
  await sleep(20);

  env.dispatch({ type: STOP, payload: { id: 999 } });
  await sleep(50);
  assert.equal(channels[0].isClosed(), false);

  env.dispatch({ type: STOP, payload: { id: 1 } });
  await sleep(50);
  assert.equal(channels[0].isClosed(), true);
});

test('closes the channel on an error action with a matching payload', async () => {
  const env = createEnv();
  const { watcher, channels } = watchStart([STOP, ERROR]);
  env.sagaMiddleware.run(watcher);

  env.dispatch({ type: START, payload: { id: 1 } });
  await sleep(20);

  env.dispatch({ type: ERROR, payload: { id: 1 } });
  await sleep(50);
  assert.equal(channels[0].isClosed(), true);
});
