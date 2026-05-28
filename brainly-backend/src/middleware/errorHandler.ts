import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { logger } from "../config/logger";

export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({ message: "Not found" });
};

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message });
        return;
    }

    logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

    res.status(500).json({
        message: "Internal server error",
        ...(env.NODE_ENV !== "production" && { detail: err.message }),
    });
};