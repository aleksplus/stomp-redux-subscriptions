import { Client, IMessage } from '@stomp/stompjs';

import { addHandler, removeHandler } from './handlersManager';

import { createStateHandlerFactory } from './createStateHandlerFactory';
import { SubData, createSubscriptionInitializer } from './subscriptionFactory';
import { ChannelErrorMessage } from './types';

const DEFAULT_TIMEOUT = 30000;

const createEventHandler =
  (
    emitter: (message: IMessage | ChannelErrorMessage) => void,
    stateHandler: (message: IMessage) => void,
  ) =>
  (message: IMessage) => {
    const data = JSON.parse(message.body);
    if (data.heartBeat) {
      stateHandler(message);
      return;
    }
    emitter(data);
  };

export const createSubscription = (
  stomp: Client,
  data: SubData,
  emitter: (message: IMessage | ChannelErrorMessage | Error) => void,
  timeout: number = DEFAULT_TIMEOUT,
) => {
  const subId = String(data.subId);
  const initializeSubscription = createSubscriptionInitializer(data, emitter);

  if (stomp?.connected) {
    // after connect
    initializeSubscription(stomp);
    const stateHandlerFactory = createStateHandlerFactory(emitter, timeout);
    const stateHandler = stateHandlerFactory(stomp);
    const eventHandler = createEventHandler(emitter, stateHandler);
    addHandler(subId, eventHandler);
  } else {
    emitter(new Error("Stomp isn't connected"));
  }

  return {
    unsubscribe: () => {
      if (stomp?.connected) {
        removeHandler(subId);
        stomp?.unsubscribe(subId);
      }
    },
  };
};
