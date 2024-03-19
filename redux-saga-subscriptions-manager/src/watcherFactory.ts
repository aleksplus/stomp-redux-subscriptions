import { EventChannel } from 'redux-saga';
import { takeEvery } from 'redux-saga/effects';

import {
  createErrorHandler,
  createStartHandler,
  createSubscriptionHandler,
} from './handlersFactories';
import { SubscriptionOptions } from './types';
import { flatten } from 'lodash';

export const parseOptions = (
  options: SubscriptionOptions,
): SubscriptionOptions => ({
  ...options,
  startType: options.startType || `${options.subIdentifier}/START`,
  stopType: options.stopType || `${options.subIdentifier}/STOP`,
  errorType: options.errorType || '',
});

export const createSubscriptionWatcher = (
  options: SubscriptionOptions,
  createChannel: (payload: any) => EventChannel<any>,
) =>
  function* (): Generator<any, any, any> {
    if (!options.subIdentifier)
      throw new Error('Our subIdentifier is required');

    const { subIdentifier, startType, stopType, errorType, selector } =
      parseOptions(options);

    const startSubscriptionHandler = createStartHandler(
      flatten([stopType, errorType]),
    )(createChannel);
    const restartHandler = createErrorHandler(startType, stopType);
    const subscribeHandler = createSubscriptionHandler(
      selector,
      startType,
      stopType,
    );

    yield takeEvery(startType, startSubscriptionHandler);
    yield takeEvery(subIdentifier, subscribeHandler);

    if (errorType) {
      yield takeEvery(errorType, restartHandler);
    }
  };
