const express = require('express');
const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const messRoutes = require('./messRoutes');
const webhookRoutes = require('./webhookRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'IIIT Bhubaneswar Mess Management API',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/mess', messRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
