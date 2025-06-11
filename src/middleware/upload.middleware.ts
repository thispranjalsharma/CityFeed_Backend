import multer, { StorageEngine } from 'multer';
import { Request } from 'express';

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void
) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Configure multer
export const upload = multer({
  storage: multer.memoryStorage() as StorageEngine,
  fileFilter: fileFilter as any,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}); 