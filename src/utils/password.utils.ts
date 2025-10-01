import bcryptjs from 'bcryptjs';

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcryptjs.compare(password, hashedPassword);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcryptjs.hash(password, 10);
}; 