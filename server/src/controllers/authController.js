const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerStudent(req.validatedBody);
  res.status(201).json({
    success: true,
    message: 'Student account registered successfully.',
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.validatedBody);
  res.status(200).json({
    success: true,
    message: 'Logged in successfully.',
    data: result,
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.validatedBody);
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: { user },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.validatedBody);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
};
