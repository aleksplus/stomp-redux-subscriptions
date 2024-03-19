import { Client, IMessage } from '@stomp/stompjs';
import { ChannelErrorMessage } from './types';

const CONNECTION_ERROR = 'Connection-error, timeout';

const createConnectionTimeout = (
  emitter: (message: ChannelErrorMessage) => void,
  timeout: number,
) => setTimeout(() => emitter({ error: CONNECTION_ERROR }), timeout);

export const createStateHandlerFactory = (
  emitter: (message: ChannelErrorMessage) => void,
  timeout: number,
) => {
  // On creation will start countdown for 'connection error'
  let timer = createConnectionTimeout(emitter, timeout);

  // We notify that client is alive and restart the connection error timeout;
  return (stomp: Client) => (message: IMessage) => {
    const [, inHeartbeat] = message.headers['heart-beat']?.split(',') ?? [0, 0];
    if (timer) clearTimeout(timer);
    timer = createConnectionTimeout(
      emitter,
      timeout + Number(inHeartbeat || 0),
    );

    const heartBeatTarget = message.headers['reply-to'];
    stomp.publish({
      destination: heartBeatTarget,
      body: '',
    });
  };
};
