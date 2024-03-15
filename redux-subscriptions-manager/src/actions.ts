import {
  SUBSCRIPTIONS_SUBSCRIBE,
  SUBSCRIPTIONS_UNSUBSCRIBE,
} from './constants';

export type SubscribeAction = {
  type: string;
  payload?: any;
  method?: typeof SUBSCRIPTIONS_SUBSCRIBE | typeof SUBSCRIPTIONS_UNSUBSCRIBE;
};

export const subscriptionActions = (type) => {
  const subscribe = (payload?: any): SubscribeAction => ({
    type: type,
    method: SUBSCRIPTIONS_SUBSCRIBE,
    payload,
  });

  const unsubscribe = (payload?: any): SubscribeAction => ({
    type: type,
    method: SUBSCRIPTIONS_UNSUBSCRIBE,
    payload,
  });

  return {
    subscribe,
    unsubscribe,
  };
};
