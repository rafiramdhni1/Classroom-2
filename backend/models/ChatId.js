const mongoose = require('mongoose');

const chatIdSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  chatId: {
    type: Number,
    required: true,
  },
  chatType: {
    type: String,
    enum: ['student', 'parent'],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  activatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

chatIdSchema.index({ studentId: 1, chatType: 1 });
chatIdSchema.index({ chatId: 1 });

module.exports = mongoose.model('ChatId', chatIdSchema);
