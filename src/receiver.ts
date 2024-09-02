import type {
  Duplex,
  KeyOf,
  RequestOf,
  RequestsOf,
  ResponseOf,
  ResponsesOf,
} from "./types";

type Handler<
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> = (args: RequestsOf<Schema>) => Promise<ResponsesOf<Schema>> | undefined;

type SingleHandler<
  Key extends KeyOf<Schema>,
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> = (
  args: RequestOf<Key, Schema>,
) => Promise<ResponseOf<Key, Schema>> | undefined;

export class Router<
  Key extends KeyOf<Schema>,
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> {
  constructor(
    private readonly key: Key,
    private readonly routes: Map<KeyOf<Schema>, Handler<Schema>>,
  ) {}

  to(handler: SingleHandler<Key, Schema>) {
    this.routes.set(this.key, handler);
  }
}

export class Receiver<
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> {
  private readonly routes: Map<KeyOf<Schema>, Handler<Schema>> = new Map();

  route<Key extends KeyOf<Schema>>(key: Key): Router<Key, Schema> {
    if (this.routes.has(key)) {
      throw new Error(`The route on "${String(key)}" is already exists`);
    }
    return new Router<Key, Schema>(key, this.routes);
  }

  receive(key: unknown, args: unknown): Schema[KeyOf<Schema>]["Response"] {
    const route = this.routes.get(key as KeyOf<Schema>);
    if (typeof route === "undefined") {
      return;
    }
    return route(args);
  }
}
