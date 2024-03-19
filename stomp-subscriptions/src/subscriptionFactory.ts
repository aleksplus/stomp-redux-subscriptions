import { Client, IMessage } from '@stomp/stompjs';

export type SubData = {
  entity: string;
  subId: string;
};

export const createSubscriptionInitializer =
  (data: SubData, cb: (message: IMessage) => void) => (stomp: Client) => {
    stomp.subscribe(data.entity, cb, { id: String(data.subId) });
  };
