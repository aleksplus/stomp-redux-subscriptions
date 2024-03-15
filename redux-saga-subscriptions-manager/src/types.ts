import {
  SUBSCRIPTIONS_SUBSCRIBE,
  SUBSCRIPTIONS_UNSUBSCRIBE,
} from '@p.aleks/redux-subscriptions-manager';

export type ServiceAction = {
  type: string;
  payload?: any;
  method?: typeof SUBSCRIPTIONS_SUBSCRIBE | typeof SUBSCRIPTIONS_UNSUBSCRIBE;
};

export interface SubscriptionOptions {
  subIdentifier: string;
  selector: ((state: any, payload: any) => any[]) | ((state: any) => any[]);
  startType?: string;
  stopType?: string | string[];
  errorType?: string | string[];
}
