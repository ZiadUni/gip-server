const Chat = require('../models/Chat');
const User = require('../models/User');

exports.startOrResumeChat = async (req, res) => {
  try {
    const staff = await User.findOne({ role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'No staff available' });

    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, staff._id] },
      status: 'active'
    });

    if (!chat) {
      chat = new Chat({
        participants: [req.user.id, staff._id],
        messages: [],
        lastUpdated: new Date()
      });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    console.error('Start chat error:', err);
    res.status(500).json({ error: 'Failed to start chat' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message cannot be empty' });

    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    chat.messages.push({ sender: req.user.id, text });
    chat.lastUpdated = new Date();
    await chat.save();

    res.json({ message: 'Sent', chat });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id }).sort({ lastUpdated: -1 });
    res.json(chats);
  } catch (err) {
    console.error('Fetch chats error:', err);
    res.status(500).json({ error: 'Failed to load chats' });
  }
};

exports.getActiveChats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'staff') return res.status(403).json({ error: 'Access denied' });

    const chats = await Chat.find({ participants: req.user.id, status: 'active' }).sort({ lastUpdated: -1 });
    res.json(chats);
  } catch (err) {
    console.error('Active chats error:', err);
    res.status(500).json({ error: 'Failed to load active chats' });
  }
};

exports.getClosedChats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'staff') return res.status(403).json({ error: 'Access denied' });

    const chats = await Chat.find({ participants: req.user.id, status: 'closed' }).sort({ lastUpdated: -1 });
    res.json(chats);
  } catch (err) {
    console.error('Closed chats error:', err);
    res.status(500).json({ error: 'Failed to load closed chats' });
  }
};

exports.closeChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    chat.status = 'closed';
    chat.lastUpdated = new Date();
    await chat.save();

    res.json({ message: 'Chat closed' });
  } catch (err) {
    console.error('Close chat error:', err);
    res.status(500).json({ error: 'Failed to close chat' });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    chat.feedback = { rating, comment };
    await chat.save();

    res.json({ message: 'Feedback submitted' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
