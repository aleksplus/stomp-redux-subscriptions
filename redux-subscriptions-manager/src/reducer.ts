import findIndex from 'lodash/findIndex';
import isEqual from 'lodash/fp/isEqual';
import { SubscribeAction } from './actions';

import { SUBSCRIPTIONS_SUBSCRIBE } from './constants';

let getIndexOfSubscription = <S = any>(
  currentSubscriptionState: S[],
  payload: any,
) => findIndex(currentSubscriptionState, isEqual(payload));

const getStateAfterUnsub = <S = any>(state: S[], payload: any) => {
  const index = getIndexOfSubscription(state, payload);

  return [...state.slice(0, index), ...state.slice(index + 1)];
};

const getStateAfterSub = <S = any>(state: S[], payload: any) => {
  return state.concat(payload);
};

const handleSubscriptions = <S = any>(
  state: S[],
  { payload, method }: SubscribeAction,
) =>
  method === SUBSCRIPTIONS_SUBSCRIBE
    ? getStateAfterSub(state, payload)
    : getStateAfterUnsub(state, payload);

export const createReducer =
  <S = any>(SUBSCRIPTION_TYPE: string) =>
  (state: S[] = [], action: SubscribeAction): S[] => {
    return action.type === SUBSCRIPTION_TYPE
      ? handleSubscriptions(state, action)
      : state;
  };

export const getSubscriptions = <T, S extends Array<T>>(state: S, payload: T) =>
  state.filter((subscribedPayloads) => isEqual(payload, subscribedPayloads));
