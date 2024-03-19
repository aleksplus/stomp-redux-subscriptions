# DEPRECATED
Do not use in new projects.

#### Fork of [@jaszczw/stomp-redux-subscriptions](https://github.com/jaszczw/stomp-redux-subscriptions) version, add types, minor changed.


#### Usage example
```ts
import { createWsChannel, getInstance } from './stomp';
import { all, cancelled, put, take } from 'redux-saga/effects';
import { Channel } from 'redux-saga';

function getInstanceIfNeed() {
  return getInstance({
    transports: ['websocket' /* , 'xhr-streaming', 'xhr-pooling' */],
    getSocksJsEndpoint: () => {
      const { host } = document.location;
      return `//${host}/`;
    }
  });
}

function* watchChannelEvents(channel: Channel<any>) {
  while (true) {
    const event = yield take(channel);
    switch (event.type) {
      case 'ROOT_CONNECTED': {
        // put emitted channel event if needed
        yield put({
          type: 'ROOT_CONNECTED'
        });
        break;
      }
    }
  }
}

function* connectSaga() {
  const wsClient = getInstanceIfNeed();
  const channel = createWsChannel(wsClient);
  try {
    return yield watchChannelEvents(channel);
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
  }
}

export default function* () {
  yield all([connectSaga()]);
}



```