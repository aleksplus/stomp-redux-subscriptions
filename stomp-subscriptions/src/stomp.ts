import * as StompJs from '@stomp/stompjs';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import { eventChannel } from 'redux-saga';
import SockJS from 'sockjs-client';
import { ServiceAction } from '@p.aleks/redux-saga-subscriptions-manager';

import { CreateWsInstanceConfig, Unsubscribe } from './types';

import { getHandler } from './handlersManager';
import { Subscribe } from '@redux-saga/core';

export const WS_RECONNECTED = 'WS_RECONNECTED';

let retryCount = 0;
const RETRY_TIMER_INCREMENT = 5000; // 5seconds
const getRetryTimer = () =>
  Math.min(RETRY_TIMER_INCREMENT * 6, RETRY_TIMER_INCREMENT * (retryCount + 1));

const RETRY_TIMER = getRetryTimer();

function createWsInstance({
  beforeConnect = () => {},
  getSocksJsEndpoint,
  transports = ['websocket'],
}: CreateWsInstanceConfig): Client {
  const unhandledHandler = (message: IMessage) => {
    const subscription = message.headers.subscription;
    const handler = getHandler(subscription);
    if (handler) {
      handler(message);
    }
  };

  const getSockInstance = () => {
    return new SockJS(getSocksJsEndpoint(), null, {
      transports: transports,
    });
  };

  return new StompJs.Client({
    beforeConnect: beforeConnect,
    connectHeaders: {},
    debug: console.log,
    webSocketFactory: getSockInstance,
    onUnhandledMessage: unhandledHandler,
    reconnectDelay: RETRY_TIMER,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 10000,
  });
}

let instance: Client | undefined;

export const getInstance = (config: CreateWsInstanceConfig): Client => {
  return instance ? instance : (instance = createWsInstance(config));
};

export function createWsChannel(
  wsClient: Client,
  {
    rootServiceConnected = (..._any: any[]): ServiceAction => ({
      type: 'ROOT_CONNECTED',
    }),
    rootServiceReconnected = (..._any: any[]): ServiceAction => ({
      type: 'ROOT_RECONNECTED',
    }),
    serviceFailing = (..._any: any[]): ServiceAction => ({
      type: 'ROOT_FAILING',
    }),
  },
) {
  retryCount = 0;

  const subscribe: Subscribe<ServiceAction> = (emit): Unsubscribe => {
    const errorCallback = (frame?: IFrame | IMessage | undefined) => {
      retryCount++;

      // save exists subscription
      if (frame?.command === 'ERROR') {
        emit(serviceFailing(null, frame?.headers?.message));
        return;
      }
      emit(serviceFailing(null, 'Error'));
    };

    wsClient.configure({
      logRawCommunication: true,
      splitLargeFrames: false,
      forceBinaryWSFrames: false,
      onDisconnect: errorCallback,
      onStompError: errorCallback,
      onConnect: () => {
        if (retryCount > 0) {
          emit(rootServiceReconnected(null, WS_RECONNECTED));
        } else {
          emit(rootServiceConnected(null));
        }
        retryCount = 0;

        wsClient.configure({
          reconnectDelay: RETRY_TIMER_INCREMENT,
        });
      },
      onWebSocketClose: (frame: IFrame) => {
        wsClient.configure({
          reconnectDelay: retryCount > 0 ? getRetryTimer() : RETRY_TIMER,
        });
        errorCallback(frame);
      },
      onWebSocketError: errorCallback,
    });

    try {
      wsClient.deactivate().then(() => {
        if (
          wsClient.state === StompJs.ActivationState.INACTIVE ||
          wsClient.state === StompJs.ActivationState.DEACTIVATING
        ) {
          setTimeout(() => {
            wsClient.activate();
          }, 0);
        } else {
          wsClient.activate();
        }
      });
    } catch (e: any) {
      console.error(e?.message ?? e);
      emit(serviceFailing(null, e?.message ?? e));
    }

    return () => {
      (async function () {
        try {
          if (wsClient.active) await wsClient.deactivate();
        } catch (e: any) {
          console.log('Stomp -> Failed to deactivate', e?.message ?? e);
        } finally {
          wsClient.forceDisconnect();
        }
      })();
    };
  };

  return eventChannel(subscribe);
}
