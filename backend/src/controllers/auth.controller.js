import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');
  
  const { user, token } = await authService.loginUser(email, password);
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  res.status(200).json(new ApiResponse(200, { user }, 'Logged in'));
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.status(200).json(new ApiResponse(200, null, 'Logged out'));
});
