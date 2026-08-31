import 'dotenv/config';

export const authConfig = {
  secret: process.env.JWT_SECRET || 'secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};
