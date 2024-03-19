import { StompConfig } from '@stomp/stompjs/src/stomp-config';
import { Options } from 'sockjs-client';

export type Unsubscribe = () => void;

export interface CreateWsInstanceConfig
  extends Pick<StompConfig, 'beforeConnect'>,
    Pick<Options, 'transports'> {
  getSocksJsEndpoint: () => string;
}

export type ChannelErrorMessage = {
  error?: string | string[] | any[] | any;
};
