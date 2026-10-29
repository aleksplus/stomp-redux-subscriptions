import { Client, IMessage } from '@stomp/stompjs';
import { ChannelErrorMessage } from './types';

const CONNECTION_ERROR = 'Connection-error, timeout';

const createConnectionTimeout = (
  emitter: (message: ChannelErrorMessage) => void,
  timeout: number,
) => setTimeout(() => emitter({ error: CONNECTION_ERROR }), timeout);

type StateHandlerFactory = ((stomp: Client) => (message: IMessage) => void) & {
  cleanup: () => void;
};

export const createStateHandlerFactory = (
  emitter: (message: ChannelErrorMessage) => void,
  timeout: number,
): StateHandlerFactory => {
  // On creation will start countdown for 'connection error'
  let timer = createConnectionTimeout(emitter, timeout);

  const cleanup = () => clearTimeout(timer);

  // We notify that client is alive and restart the connection error timeout;
  const stateHandlerFactory: StateHandlerFactory = (stomp: Client) => (
    message: IMessage,
  ) => {
    cleanup();
    // First header value is the interval the sender guarantees to send at;
    // '0' or a non-numeric value leaves the budget at the base timeout
    const [sendInterval] = message.headers['heart-beat']?.split(',') ?? ['0'];
    const extra = Number(sendInterval);
    timer = createConnectionTimeout(
      emitter,
      timeout + (Number.isFinite(extra) ? extra : 0),
    );

    const heartBeatTarget = message.headers['reply-to'];
    if (heartBeatTarget) {
      stomp.publish({
        destination: heartBeatTarget,
        body: '',
      });
    }
  };

  stateHandlerFactory.cleanup = cleanup;

  return stateHandlerFactory;
};
