export type Duplex<Req = undefined, Resp = void> = {
  Request: Req;
  Response: Resp;
};

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
