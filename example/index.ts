import { Receiver } from "../src/receiver";
import { Sender } from "../src/sender";
import type { Duplex, ResponsesOf } from "../src/types";
import { addListener, sendMessage } from "./port";

// === Schema shared between server and client ===
type Schema = {
  "math.add": Duplex<{ a: number; b: number }, number>;
  "counter.increment": Duplex<number>;
  "monitring.ping": Duplex;
};

// === Server-side ===
const receiver = new Receiver<Schema>();

receiver.route("math.add").to(({ a, b }) => Promise.resolve(a + b));
receiver.route("counter.increment").to(() => Promise.resolve());
receiver.route("monitring.ping").to(() => Promise.resolve());

addListener((message: unknown) => {
  const { key, args } = message as { key: string; args: unknown };
  return receiver.receive(key, args);
});

// === Client-side ===
const sender = new Sender<Schema>((key, args) => {
  return sendMessage({ key, args }) as Promise<ResponsesOf<Schema>>;
});

(async () => {
  const sum = await sender.send("math.add", { a: 1, b: 2 });
  console.log("1 + 2 =", sum);

  await sender.send("counter.increment", 10);
  await sender.send("monitring.ping");
})();
