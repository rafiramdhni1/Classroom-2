const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  subject: {
    type: String,
    required: true,
    enum: ['ASJ', 'AIJ', 'TJBL', 'PKDK', 'TJKT'],
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['tugas', 'quiz', 'uts', 'uas'],
    default: 'tugas',
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  maxScore: {
    type: Number,
    default: 100,
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

gradeSchema.index({ studentId: 1, subject: 1 });
gradeSchema.index({ subject: 1, title: 1 });

module.exports = mongoose.model('Grade', gradeSchema);
