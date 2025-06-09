import { IUser } from '../interfaces/user.interface';
import { IMerchant } from '../interfaces/merchant.interface';
import { IAdmin } from '../interfaces/admin.interface';
import { AuthUser } from '../interfaces/auth.interface';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      user?: AuthUser;
      userId?: string;
      merchantId?: string;
      adminId?: string;
      ip?: string;
    }
    interface Response extends ExpressResponse {}
  }
}

declare module 'express' {
  export interface Application {
    use: any;
    get: any;
    post: any;
    put: any;
    delete: any;
    listen: any;
    options: any;
  }

  export interface Request {
    userId?: string;
    merchantId?: string;
    adminId?: string;
    method: string;
    url: string;
    ip?: string;
    get(header: string): string | undefined;
    headers: { [key: string]: string | string[] | undefined };
    body: any;
    params: any;
    query: any;
  }

  export interface Response {
    status: (code: number) => Response;
    json: (body: any) => Response;
    send: (body: any) => Response;
    statusCode: number;
    on(event: string, listener: (...args: any[]) => void): this;
    end(): this;
    setHeader(name: string, value: string): this;
    getHeader(name: string): string | number | string[] | undefined;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface Router {
    use: any;
    get: any;
    post: any;
    put: any;
    delete: any;
    options: any;
  }

  export interface Express {
    (): Application;
    json(options?: { limit?: string | number }): any;
    urlencoded(options: { extended: boolean; limit?: string | number }): any;
    static(root: string): any;
    Router(): Router;
  }

  export type RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>;

  export const Router: () => Router;

  const express: Express;
  export default express;
} 