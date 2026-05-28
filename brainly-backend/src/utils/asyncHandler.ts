import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (req: Request<any, any, any, any>, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
