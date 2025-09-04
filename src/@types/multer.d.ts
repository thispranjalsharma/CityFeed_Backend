declare module 'multer' {
  import { Request } from 'express';

  export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  export interface StorageEngine {
    _handleFile(req: Request, file: File, callback: (error: any, info: Partial<File>) => void): void;
    _removeFile(req: Request, file: File, callback: (error: Error) => void): void;
  }

  export interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    preservePath?: boolean;
    fileFilter?(req: Request, file: File, callback: (error: Error | null, acceptFile: boolean) => void): void;
  }

  export interface Instance {
    single(fieldname: string): any;
    array(fieldname: string, maxCount?: number): any;
    fields(fields: Array<{ name: string; maxCount?: number }>): any;
    none(): any;
    any(): any;
  }

  export function diskStorage(options: {
    destination?: string | ((req: Request, file: File, callback: (error: Error | null, destination: string) => void) => void);
    filename?(req: Request, file: File, callback: (error: Error | null, filename: string) => void): void;
  }): StorageEngine;

  export function memoryStorage(): StorageEngine;

  export default function(options?: Options): Instance;
} 