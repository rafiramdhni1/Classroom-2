const mongoose = require('mongoose');

const activationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  chatType: {
    type: String,
    enum: ['student', 'parent'],
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

activationCodeSchema.index({ studentId: 1 });

module.exports = mongoose.model('ActivationCode', activationCodeSchema);
