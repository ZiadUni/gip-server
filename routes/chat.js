const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.get('/', verifyToken, chatController.getUserChats);
router.post('/start', verifyToken, chatController.startOrResumeChat);
router.post('/:id/message', verifyToken, chatController.sendMessage);
router.patch('/:id/close', verifyToken, chatController.closeChat);
router.patch('/:id/feedback', verifyToken, chatController.submitFeedback);


router.get('/staff/active', verifyToken, chatController.getActiveChats);
router.get('/staff/history', verifyToken, chatController.getClosedChats);

module.exports = router;
