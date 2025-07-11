import multer from 'multer';
import type { Request } from 'express';

// File filter to only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF images are allowed.'), false);
  }
};

// Configure multer upload with memory storage
const upload = multer({
  storage: (multer as any).memoryStorage(),
  fileFilter: fileFilter as any,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}); 

export default upload; 