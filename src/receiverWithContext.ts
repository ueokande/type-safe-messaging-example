import type {
  Duplex,
  KeyOf,
  RequestOf,
  RequestsOf,
  ResponseOf,
  ResponsesOf,
} from "./types";

type HandlerWithContext<
  Context,
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> = (
  ctx: Context,
  args: RequestsOf<Schema>,
) => Promise<ResponsesOf<Schema>> | undefined;

type SingleHandlerWithContext<
  Context,
  Key extends KeyOf<Schema>,
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> = (
  ctx: Context,
  args: RequestOf<Key, Schema>,
) => Promise<ResponseOf<Key, Schema>> | undefined;

export class RouterWithContext<
  Key extends KeyOf<Schema>,
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
  Context,
> {
  constructor(
    private readonly key: Key,
    private readonly routes: Map<
      KeyOf<Schema>,
      HandlerWithContext<Context, Schema>
    >,
  ) {}

  to(handler: SingleHandlerWithContext<Context, Key, Schema>) {
    this.routes.set(this.key, handler);
  }
}

export class ReceiverWithContext<
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
  Context,
> {
  private readonly routes: Map<
    KeyOf<Schema>,
    HandlerWithContext<Context, Schema>
  > = new Map();

  route<Key extends KeyOf<Schema>>(
    key: Key,
  ): RouterWithContext<Key, Schema, Context> {
    if (this.routes.has(key)) {
      throw new Error(`The route on "${String(key)}" is already exists`);
    }
    return new RouterWithContext<Key, Schema, Context>(key, this.routes);
  }

  receive(ctx: Context, key: unknown, args: unknown): ResponsesOf<Schema> {
    const route = this.routes.get(key as KeyOf<Schema>);
    if (typeof route === "undefined") {
      return;
    }
    return route(ctx, args);
  }
}
