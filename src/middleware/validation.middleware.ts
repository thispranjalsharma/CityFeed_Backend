import { Response, NextFunction, RequestHandler } from 'express';
import * as expressValidator from 'express-validator';
import { logger } from '../utils/logger.util';

interface ValidationErrorResponse {
  field: string;
  message: string;
  value?: any;
}

export const validate: RequestHandler = (req: any, res: Response, next: NextFunction) => {
  const errors = expressValidator.validationResult(req);
  if (!errors.isEmpty()) {
    logger.debug('Validation errors:', errors.array());
    const formattedErrors: ValidationErrorResponse[] = errors.array().map(error => {
      const validationError = error as any;
      return {
        field: validationError.path || 'unknown',
        message: validationError.msg,
        value: validationError.value
      };
    });
    
    res.status(400).json({ 
      message: 'Validation failed',
      errors: formattedErrors
    });
    return;
  }
  next();
};

export const validateRequest = (validations: any[]): RequestHandler[] => {
  return [...validations.map(v => v as unknown as RequestHandler), validate];
};

export const validateString = (field: string): RequestHandler => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.body[field] || typeof req.body[field] !== 'string') {
      res.status(400).json({
        errors: [{ field, message: `${field} must be a string` }]
      });
      return;
    }
    next();
  };
};

export const validateNumeric = (field: string): RequestHandler => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.body[field] || isNaN(Number(req.body[field]))) {
      res.status(400).json({
        errors: [{ field, message: `${field} must be a number` }]
      });
      return;
    }
    next();
  };
};

export const validateBoolean = (field: string): RequestHandler => {
  return (req: any, res: Response, next: NextFunction) => {
    if (req.body[field] === undefined || typeof req.body[field] !== 'boolean') {
      res.status(400).json({
        errors: [{ field, message: `${field} must be a boolean` }]
      });
      return;
    }
    next();
  };
};

export const validateDate = (field: string): RequestHandler => {
  return (req: any, res: Response, next: NextFunction) => {
    const date = new Date(req.body[field]);
    if (!req.body[field] || isNaN(date.getTime())) {
      res.status(400).json({
        errors: [{ field, message: `${field} must be a valid date` }]
      });
      return;
    }
    next();
  };
}; 

// Custom validator for phone number (exactly 10 digits, no plus sign)
export const isValidPhone = (value: string) => {
  return /^\d{10}$/.test(value);
};

// Custom validator for strong password
export const isStrongPassword = (value: string) => {
  // At least 8 chars, 1 special char, 1 lowercase, 1 digit
  return /^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(value);
}; 