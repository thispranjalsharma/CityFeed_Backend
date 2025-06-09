declare module 'express-validator' {
  import { RequestHandler } from 'express';

  export function body(field: string): ValidationChain;
  export function check(field: string): ValidationChain;
  export function param(field: string): ValidationChain;
  export function query(field: string): ValidationChain;

  export interface ValidationChain {
    isString(): ValidationChain;
    isNumeric(): ValidationChain;
    isInt(options?: { min?: number; max?: number }): ValidationChain;
    isFloat(options?: { min?: number; max?: number }): ValidationChain;
    isISO8601(): ValidationChain;
    isBoolean(): ValidationChain;
    isEmail(): ValidationChain;
    isLength(options: { min?: number; max?: number }): ValidationChain;
    isIn(values: string[]): ValidationChain;
    isObject(): ValidationChain;
    isArray(): ValidationChain;
    isURL(): ValidationChain;
    optional(): ValidationChain;
    notEmpty(): ValidationChain;
    withMessage(message: string): ValidationChain;
    equals(value: string): ValidationChain;
  }

  export function validationResult(req: Request): Result;
  export interface Result {
    isEmpty(): boolean;
    array(): ValidationError[];
  }

  export interface ValidationError {
    param: string;
    msg: string;
    value: any;
  }
} 