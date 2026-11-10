const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { authRateLimiter } = require('../middleware/rateLimitMiddleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../utils/validators');

const router = express.Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), authController.updateProfile);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
