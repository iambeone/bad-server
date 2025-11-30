declare module 'express-mongo-sanitize' {
  import { RequestHandler } from 'express';

  interface Options {
    replaceWith?: string;
    onSanitize?: (args: { req: unknown; key: string }) => void;
    dryRun?: boolean;
  }

  function expressMongoSanitize(options?: Options): RequestHandler;

  export = expressMongoSanitize;
}