import { IMessage } from '@stomp/stompjs';

type HandlerFnMessage = (message: IMessage) => void;

const handlersHash: Record<string, HandlerFnMessage> = {};

const addHandler = (subscription: string, handler: HandlerFnMessage) => {
  handlersHash[subscription] = handler;
};

const getHandler = (subscription: string) => handlersHash[subscription];

const removeHandler = (subscription: string) =>
  delete handlersHash[subscription];

export { addHandler, getHandler, removeHandler };
