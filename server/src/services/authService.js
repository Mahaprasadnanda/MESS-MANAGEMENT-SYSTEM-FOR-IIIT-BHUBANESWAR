const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

const BCRYPT_ROUNDS = 12;

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    studentId: user.studentId,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function registerStudent({ fullName, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === env.messEmail) {
    throw new ApiError(403, 'Mess personnel accounts cannot be registered via student signup.');
  }

  const localPart = normalizedEmail.split('@')[0];
  if (!localPart || localPart.toLowerCase() === 'mess') {
    throw new ApiError(400, 'Invalid institutional student email prefix.');
  }

  const studentId = localPart.toUpperCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { studentId }],
    },
    select: { id: true, email: true, studentId: true },
  });

  if (existing) {
    throw new ApiError(
      409,
      'An account with this institutional email or student ID is already registered.'
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      email: normalizedEmail,
      studentId,
      passwordHash,
      role: 'STUDENT',
    },
  });

  const token = signToken(user);
  return {
    user: sanitizeUser(user),
    token,
    redirectTo: '/student/dashboard',
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new ApiError(401, 'Invalid institutional email or password.');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, 'Invalid institutional email or password.');
  }

  const token = signToken(user);
  const redirectTo = user.role === 'MESS' ? '/mess/dashboard' : '/student/dashboard';

  return {
    user: sanitizeUser(user),
    token,
    redirectTo,
  };
}

async function updateProfile(userId, { fullName }) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { fullName: fullName.trim() },
  });
  return sanitizeUser(updated);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { message: 'Password updated successfully.' };
}

module.exports = {
  sanitizeUser,
  registerStudent,
  loginUser,
  updateProfile,
  changePassword,
};
