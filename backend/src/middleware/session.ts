import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const SESSION_COOKIE = "ytt_sid";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

/**
 * Assigns every visitor a random, httpOnly "remember this device" cookie.
 * No login involved -- this just gives anonymous history a stable key.
 */
export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  let sessionId = req.cookies?.[SESSION_COOKIE];

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: ONE_YEAR_MS,
      sameSite: "lax",
    });
  }

  req.sessionId = sessionId;
  next();
}
