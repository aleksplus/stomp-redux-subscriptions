import {
  call,
  cancel,
  delay,
  fork,
  put,
  race,
  select,
  take,
} from 'redux-saga/effects';
import { EventChannel } from 'redux-saga';
import isEqual from 'lodash/isEqual';

import {
  SUBSCRIPTIONS_SUBSCRIBE,
  SUBSCRIPTIONS_UNSUBSCRIBE,
} from '@p.aleks/redux-subscriptions-manager';
import { ServiceAction } from './types';

const SUB_RECONNECT_TIMEOUT = 5000;

function* channelHandling(
  createChannel: (payload: any) => EventChannel<any>,
  action: ServiceAction,
): Generator<any, any, any> {
  const channel = yield call(createChannel, action.payload);

  try {
    while (true) {
      const result = yield take(channel);
      yield result;
    }
  } finally {
    channel.close();
  }
}

export const createStartHandler =
  (stopSubActions: string[]) =>
  (createChannel: (payload: any) => EventChannel<any>) =>
    function* (action: ServiceAction): Generator<any, any, any> {
      const task = yield fork(channelHandling, createChannel, action);

      const stopPredicate = ({ type }: ServiceAction) => {
        return stopSubActions.includes(type);
      };

      try {
        while (true) {
          const stopSub = yield take(stopPredicate);

          if (stopSub && isEqual(stopSub.payload, action.payload)) {
            return;
          }
        }
      } finally {
        yield cancel(task);
      }
    };

//TODO WJ: Opinionated about subscription storing, selection - very limiting approach, but simplifies things
export const createSubscriptionHandler = (
  selector: SubscriptionsSelector,
  startType: string,
  stopType: string | string[],
) =>
  function* ({ payload, method }: ServiceAction): Generator<any, any, any> {
    const subscriptionsState = yield select(selector, payload);
    const subCount = subscriptionsState.length;

    const firstSub = subCount === 1 && method === SUBSCRIPTIONS_SUBSCRIBE;
    const lastUnSub = subCount === 0 && method === SUBSCRIPTIONS_UNSUBSCRIBE;

    if (firstSub) {
      yield put({ type: startType, payload });
    }

    if (lastUnSub) {
      if (Array.isArray(stopType)) {
        for (const type of stopType) {
          yield put({ type: type, payload });
        }
      } else {
        yield put({ type: stopType, payload });
      }
    }
  };

export const createErrorHandler = (
  startType: string,
  stopType: string | string[],
  reconnectTimeout = SUB_RECONNECT_TIMEOUT,
) =>
  function* ({ payload }: ServiceAction): Generator<any, any, any> {
    console.info(
      `'Will restart subscription in ${reconnectTimeout / 1000} seconds`,
    );

    // Stop current sub
    if (Array.isArray(stopType)) {
      for (const type of stopType) {
        yield put({ type: type, payload });
      }
    } else {
      yield put({ type: stopType, payload });
    }

    // Race between state induced STOP - meaning we no longer subscribe and reconnect timeout
    const { retry } = yield race({
      retry: delay(reconnectTimeout),
      stop: take(stopType),
    });

    if (retry) {
      yield put({ payload, type: startType });
    }
  };

type SubscriptionsSelector = (state: any, payload: any) => any[];
