# type-safe-messaging-example

## What

This repository shows a simple example of type-safe messaging in TypeScript.
We assume that messages are used internally and the message payloads are always valid.
In other work, we don't need runtime validation of payloads, such as using JSON schema, Ajv, or Zod.

## How

### Define message schema

We can create a message sender and receiver with a message schema defined in TypeScript.

This repository provides some utility types to define message payload with its name.
The `Duplex` type has two type parameters, the first one is the request payload, and the second one is the response payload.

```typescript
import type { Duplex } from "../src/types";

type Schema = {
  "math.add": Duplex<{ a: number; b: number }, number>;
  "counter.increment": Duplex<number>;
  "monitring.ping": Duplex;
}
```

### Create a message sender

The message sender is a wrapper client that sends a message.
It has a type-safe `send` method that takes a message name and payload.

```typescript
const sender = new Sender<Schema>((key, args) => {
  // send a message such as HTTP request, WebSocket, or IPC
);

const sum = await sender.send("math.add", { a: 1, b: 2 });
await sender.send("counter.increment", 10);
await sender.send("monitring.ping");
```

### Create a message receiver

The message receiver is a wrapper server that receives a message.
It is also type-safe and has a `route` method that takes a message name and a handler function.

```typescript
const receiver = new Receiver<Schema>();

receiver.route("math.add").to(({ a, b }) => Promise.resolve(a + b));
receiver.route("counter.increment").to((num) => Promise.resolve());
receiver.route("monitring.ping").to(() => Promise.resolve());

someMessageHandler.addEventListner('message', async (event) => {
  receiver.receive(message.data.key, message.data.args)
}
```

### Type violations

The sender does not accept invalid payloads.

```
const str: string = sender.send('math.add', { a: 1, b: 2 });
      ~~~                                           ~
TS2322: Type 'Promise<number>' is not assignable to type 'string'.
TS2322: Type 'string' is not assignable to type 'number'.
```

```
await sender.send("counter.increment", 'ten');
                                       ~~~~~
TS2345: Argument of type '"ten"' is not assignable to parameter of type 'undefined'.
```

```
await sender.send("monitring.ping", 100)
                                    ~~~
TS2345: Argument of type '100' is not assignable to parameter of type 'undefined'.
```

```
await sender.send("do something")
                  ~~~~~~~~~~~~~~
TS2345: Argument of type '"do something"' is not assignable to parameter of type 'keyof Schema'.
```

The receiver does not accept invalid handlers as well.

```
receiver.route("math.add").to(({ a, b, c }) => Promise.resolve(a + b));
                                       ~
TS2339: Property 'c' does not exist on type '{ a: number; b: number; }'.
```

```
receiver.route("counter.increment").to(() => Promise.resolve(42));
                                             ~~~~~~~~~~~~~~~~~~~
TS2322: Type 'Promise<string>' is not assignable to type 'Promise<void>'.
```

## Details

### The message schema

The `Duplex` type has simply two type parameters, `Request` and `Response`.

```typescript
export type Duplex<Req = undefined, Resp = void> = {
  Request: Req;
  Response: Resp;
};
```

The `Schema` type is treated as a map of message names and their payload types.

```typescript
type Schema = {
  "math.add": { Request: { a: number; b: number }, Response: number };
  "counter.increment": { Request: number, Response: void };
  "monitring.ping": { Request: undefined, Response: void };
};
```

### A type-safe message sender

The message sender has a `send` method that takes a message name as a generic type parameter.
TypeScript binds the argument `args` to the request type of the message key in `Schema`.

```typescript
export type SenderHandler<
  Schema extends { [Key in keyof Schema]: Duplex<unknown, unknown> },
> = (
  key: keyof Schema,
  args: Schema[keyof Schema]["Request"],
) => Promise<Schema[keyof Schema]["Response"]>;

export class Sender<
  Schema extends { [Key in keyof Schema]: Duplex<unknown, unknown> },
> {
  private readonly sender: SenderHandler<Schema>;

  constructor(sender: SenderHandler<Schema>) {
    this.sender = sender;
  }

  send<Key extends keyof Schema>(
    key: Key,
    ...args: Schema[Key]["Request"] extends undefined
      ? [undefined?]
      : [Schema[Key]["Request"]]
  ): Promise<Schema[Key]["Response"]> {
    return this.sender(key, args);
  }
}
```

Where the argument `args` of the `send()` method is a tricky part.
The `args` is a rest parameter that takes single argument, with a conditional type.
If the request payload type of Schema is `undefined`, the `args` can accept no arguments.
Otherwise, it allows only one argument that matches the request payload type.

```typescript
send<Key extends KeyOf<Schema>>(
  key: Key,
  ...[args]: RequestOf<Key, Schema> extends undefined
    ? [undefined?]
    : [RequestOf<Key, Schema>]
): Promise<ResponseOf<Key, Schema>> {
  return this.sender(key, args);
}
```

It can accept no arguments if the message does not have a request payload.
Otherwise, it allows only one argument that matches the request payload type.

### A type-safe message receiver

The message receiver provide *router* and *message handler*.
The router is a class that has a `to` method that takes a handler function.
The message handler is a class that has a `route` method that takes a message name and returns a router.

The `Handler` type is a function that takes a request payload and returns a response payload of Schema.
The `SingleHandler` type is similar one, but it takes a message key and it is specialized for certain key.
The `Router` class is a class that has a `to` method to add a route to the original receiver.

The `Receiver.receive` method takes a message key and it can bind the specific handler.

```typescript
type Handler<
  Schema extends { [Key in keyof Schema]: Duplex<unknown, unknown> },
> = (args: Schema[keyof Schema]["Request"]) => Promise<Schema[keyof Schema]["Response"]> | undefined;

type SingleHandler<
  Key extends keyof Schema,
  Schema extends { [Key in keyof Schema]: Duplex<unknown, unknown> },
> = (
  args: Schema[Key]["Request"],
) => Promise<Schema[Key]["Response"]> | undefined;

export class Router<
  Key extends keyof Schema,
  Schema extends { [Key in keyof Schema]: Duplex<unknown, unknown> },
> {
  constructor(
    private readonly key: Key,
    private readonly routes: Map<keyof Schema, Handler<Schema>>,
  ) {}

  to(handler: SingleHandler<Key, Schema>) {
    this.routes.set(this.key, handler);
  }
}

export class Receiver<
  Schema extends { [Key in keyof Schema]: Duplex<unknown, unknown> },
> {
  private readonly routes: Map<keyof Schema, Handler<Schema>> = new Map();

  route<Key extends keyof Schema>(key: Key): Router<Key, Schema> {
    if (this.routes.has(key)) {
      throw new Error(`The route on "${String(key)}" is already exists`);
    }
    return new Router<Key, Schema>(key, this.routes);
  }

  receive(key: unknown, args: unknown): Schema[keyof Schema]["Response"] {
    const route = this.routes.get(key as keyof Schema);
    if (typeof route === "undefined") {
      return;
    }
    return route(args);
  }
}
```

### Simplify class definitions by using utility types

Finally, we can simplify the class definitions by using following utility types.

The `KeyOf` type is a utility type that extracts a key type from the schema.
The `RequestsOf` type extracts general request payload type of `Schema` and the `RequestOf` type extracts a request payload type of specific key.
The `ResponsesOf` and `ResponseOf` types extract response payload types as well.

```typescript
type BaseSchema<Key extends string | number | symbol> = Record<
  Key,
  Duplex<unknown, unknown>
>;

export type KeyOf<Schema> = keyof Schema;

export type RequestOf<
  Key extends KeyOf<Schema>,
  Schema extends BaseSchema<Key>,
> = Schema[Key]["Request"];

export type ResponseOf<
  Key extends KeyOf<Schema>,
  Schema extends BaseSchema<Key>,
> = Schema[Key]["Response"];

export type RequestsOf<Schema extends BaseSchema<KeyOf<Schema>>> =
  Schema[KeyOf<Schema>]["Request"];

export type ResponsesOf<Schema extends BaseSchema<KeyOf<Schema>>> =
  Schema[KeyOf<Schema>]["Request"];
```

The complete implementations are available in the repository.

- [src/types.ts](src/types.ts): Define utility types
- [src/sender.ts](src/sender.ts): Implement a message sender
- [src/receiver.ts](src/receiver.ts): Implement a message receiver
- [src/receiverWithContext.ts](src/receiverWithContext.ts): Advanced receiver implementation. It provides a context object to handlers. It is convenient to pass a context object which includes a HTTP request object, a WebSocket object, or a database connection object.
