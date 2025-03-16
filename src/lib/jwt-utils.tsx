import jwt from 'jsonwebtoken';

const SECRET_KEY = Buffer.from(process.env.JWT_SECRET || '', 'base64').toString('utf8');

export function isValidJWT(token: string) {
  if (!token) {
    return false;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded
  } catch (error) {
    console.error('invalid jwt', error)
    return false
  }
}
