import { prisma } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export const loginUser = async (email, password, company) => {
  if (!['aquasphere', 'wadaana'].includes(company)) {
    throw { status: 400, message: 'Invalid company context' };
  }

  let user;
  if (company === 'aquasphere') {
    user = await prisma.aquasphereUser.findUnique({ where: { email } });
  } else {
    user = await prisma.wadaanaUser.findUnique({ where: { email } });
  }
  
  if (!user || !user.isActive) throw { status: 401, message: 'Invalid credentials or inactive account' };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email, company }, JWT_SECRET, { expiresIn: '12h' });
  return { user: { id: user.id, email: user.email, role: user.role, company }, token };
};

export const requestPasswordReset = async (adminId, accountantId) => {
  throw { status: 501, message: 'Two-step password reset not fully implemented yet' };
};
