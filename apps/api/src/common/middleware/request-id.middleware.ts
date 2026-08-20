import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ulid } from "ulid";

export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * بند ۱۱.۹۰ برند بوک — هر درخواست یک requestId می‌گیرد که هم در Response Header
 * و هم در ساختار خطای بند ۸.۹۳ استفاده می‌شود، برای ردیابی پشتیبانی و لاگ.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    req.requestId = `req_${ulid()}`;
    res.setHeader("X-Request-Id", req.requestId);
    next();
  }
}
