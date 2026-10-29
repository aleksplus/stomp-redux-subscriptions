import createSagaMiddleware from 'redux-saga';
import isEqual from 'lodash/isEqual';
import {
  SUBSCRIPTIONS_SUBSCRIBE,
  SUBSCRIPTIONS_UNSUBSCRIBE,
} from '@p.aleks/redux-subscriptions-manager';

export const SUBS = 'TEST/SUBSCRIPTIONS';
export const START = 'TEST/SUBSCRIPTION/START';
export const STOP = 'TEST/SUBSCRIPTION/STOP';
export const ERROR = 'TEST/SUBSCRIPTION/ERROR';

export { SUBSCRIPTIONS_SUBSCRIBE, SUBSCRIPTIONS_UNSUBSCRIBE };

export type TestAction = {
  type: string;
  payload?: any;
  method?: string;
};

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// Minimal store (redux itself is not a dependency here): just the API the
// saga middleware needs, with a reducer that records every action and
// refcounts subscriptions like @p.aleks/redux-subscriptions-manager does.
export const createEnv = () => {
  const actions: TestAction[] = [];
  let subscriptions: any[] = [];
  let state: any = { subscriptions };

  // Mirror applyMiddleware: the middleware gets a dispatch closure that
  // forwards to the final composed dispatch, so effects like put() flow
  // back through the saga channel and reach other takers.
  let finalDispatch: (action: TestAction) => TestAction;

  const baseDispatch = (action: TestAction) => {
    actions.push(action);
    if (action.type === SUBS) {
      if (action.method === SUBSCRIPTIONS_SUBSCRIBE) {
        subscriptions = subscriptions.concat(action.payload);
      }
      if (action.method === SUBSCRIPTIONS_UNSUBSCRIBE) {
        const index = subscriptions.findIndex((s) =>
          isEqual(s, action!.payload),
        );
        if (index !== -1) {
          subscriptions = [
            ...subscriptions.slice(0, index),
            ...subscriptions.slice(index + 1),
          ];
        }
      }
      state = { subscriptions };
    }
    return action;
  };

  const middlewareAPI = {
    getState: () => state,
    dispatch: (action: TestAction) => finalDispatch(action),
    subscribe: (_listener: () => void) => () => {},
  };

  const sagaMiddleware: any = createSagaMiddleware();
  finalDispatch = sagaMiddleware(middlewareAPI)(baseDispatch);

  return {
    sagaMiddleware,
    dispatch: finalDispatch,
    actions,
    payloadsOf: (type: string) =>
      actions.filter((a) => a.type === type).map((a) => a.payload),
    subscriptionsState: () => subscriptions,
  };
};

// Selector shape expected by createSubscriptionHandler:
// (state, payload) => matching subscription entries
export const payloadMatchingSelector = (state: any, payload: any) =>
  state.subscriptions.filter((s: any) => isEqual(s, payload));
