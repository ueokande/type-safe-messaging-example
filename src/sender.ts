import type {
  Duplex,
  KeyOf,
  RequestOf,
  RequestsOf,
  ResponseOf,
  ResponsesOf,
} from "./types";

export type SenderHandler<
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> = (
  key: KeyOf<Schema>,
  args: RequestsOf<Schema>,
) => Promise<ResponsesOf<Schema>>;

export class Sender<
  Schema extends { [Key in KeyOf<Schema>]: Duplex<unknown, unknown> },
> {
  private readonly sender: SenderHandler<Schema>;

  constructor(sender: SenderHandler<Schema>) {
    this.sender = sender;
  }

  send<Key extends KeyOf<Schema>>(
    key: Key,
    ...[args]: RequestOf<Key, Schema> extends undefined
      ? [undefined?]
      : [RequestOf<Key, Schema>]
  ): Promise<ResponseOf<Key, Schema>> {
    return this.sender(key, args);
  }
}
