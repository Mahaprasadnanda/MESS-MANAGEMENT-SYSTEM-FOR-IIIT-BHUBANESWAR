const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

router.post('/razorpay', webhookController.handleRazorpayWebhook);

module.exports = router;
