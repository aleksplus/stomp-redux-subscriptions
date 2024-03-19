import { StompConfig } from '@stomp/stompjs/src/stomp-config';
import { Options } from 'sockjs-client';
import { ServiceAction } from '@p.aleks/redux-saga-subscriptions-manager';

export type Unsubscribe = () => void;
export type ChannelActions = {
  rootServiceConnected: (..._any: any[]) => ServiceAction;
  rootServiceReconnected: (..._any: any[]) => ServiceAction;
  serviceFailing: (..._any: any[]) => ServiceAction;
};

export interface CreateWsInstanceConfig
  extends Pick<StompConfig, 'beforeConnect'>,
    Pick<Options, 'transports'> {
  getSocksJsEndpoint: () => string;
}

export type ChannelErrorMessage = {
  error?: string | string[] | any[] | any;
};
