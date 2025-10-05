import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const APP_PORT = Number(process.env.PORT || 3002);

// When serving frontend from the same container in production, same-origin is used.
// If FRONTEND_URL is provided, we will restrict CORS to that value; otherwise reflect origin.
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const CORS_ORIGIN: boolean | string = IS_PRODUCTION
  ? (FRONTEND_URL || true)
  : 'http://localhost:3000';
