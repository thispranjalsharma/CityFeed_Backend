// /**
//  * Validation decorators and utilities for DTOs
//  * This file provides validation decorators that can be used with DTOs
//  */

// import { Request, Response, NextFunction } from 'express';

// /**
//  * Validation middleware factory for DTOs
//  * This can be used to validate request bodies against DTO interfaces
//  */
// export function validateDTO<T>(dtoClass: new () => T) {
//   return (req: Request, res: Response, next: NextFunction) => {
//     try {
//       // Basic validation - in a real implementation, you'd use a library like class-validator
//       // This is a simplified example
//       const dto = new dtoClass();
//       const errors: string[] = [];

//       // You can add more sophisticated validation here
//       // For now, this is a placeholder for the validation logic

//       if (errors.length > 0) {
//         return res.status(400).json({
//           success: false,
//           message: 'Validation failed',
//           errors
//         });
//       }

//       // Attach validated data to request
//       req.validatedData = dto;
//       next();
//     } catch (error) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid request data',
//         error: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   };
// }

// /**
//  * Type augmentation for Express Request to include validated data
//  */
// declare global {
//   namespace Express {
//     interface Request {
//       validatedData?: any;
//     }
//   }
// }

// /**
//  * Common validation patterns
//  */
// export const ValidationPatterns = {
//   email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
//   phone: /^[6-9]\d{9}$/,
//   password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
//   objectId: /^[0-9a-fA-F]{24}$/
// };

// /**
//  * Validation error messages
//  */
// export const ValidationMessages = {
//   required: (field: string) => `${field} is required`,
//   invalid: (field: string) => `Invalid ${field} format`,
//   minLength: (field: string, min: number) => `${field} must be at least ${min} characters long`,
//   maxLength: (field: string, max: number) => `${field} must be no more than ${max} characters long`,
//   min: (field: string, min: number) => `${field} must be at least ${min}`,
//   max: (field: string, max: number) => `${field} must be no more than ${max}`,
//   enum: (field: string, values: string[]) => `${field} must be one of: ${values.join(', ')}`
// };
