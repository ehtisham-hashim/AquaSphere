import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Signs and generates a JSON Web Token (JWT) with the configured secret and expiration.
 *
 * @param {object} payload - Claims to encode in the token.
 * @returns {string} Signed JWT string.
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies a JWT token signature and decodes its payload.
 *
 * @param {string} token - Signed JWT token string.
 * @returns {object|null} Decoded token payload if valid, null otherwise.
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    return null;
  }
};
