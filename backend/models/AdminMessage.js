const mongoose = require('mongoose');

const adminMessageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  }],
  targetKelas: [String],
  targetAngkatan: [Number],
  isGlobal: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  isReadBy: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    readAt: Date,
  }],
  expiresAt: Date,
}, { timestamps: true });

adminMessageSchema.index({ targetStudents: 1 });
adminMessageSchema.index({ targetKelas: 1 });
adminMessageSchema.index({ isGlobal: 1 });

module.exports = mongoose.model('AdminMessage', adminMessageSchema);
