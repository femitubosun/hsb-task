export type FetchInput<TResult> = {
  key: string;
  resolver: () => Promise<TResult>;
  tags?: string[];
  ttlSeconds?: number;
};
