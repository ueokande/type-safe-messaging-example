import * as timers from "node:timers/promises";

type MessageListener = (message: unknown) => unknown;

const listener: [MessageListener] = [() => {}];

// addListener adds a listener to the port
export const addListener = (l: MessageListener) => {
  listener[0] = l;
};

// sendMessage sends a message to the port with random delay
export const sendMessage = async (message: unknown): Promise<unknown> => {
  await timers.setTimeout(Math.random() * 1000);
  const ret = listener[0](message);
  await timers.setTimeout(Math.random() * 1000);
  return ret;
};
