import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export function createContext({ req, res }: CreateExpressContextOptions) {
  return { req, res, session: req.session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
