const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  nis: {
    type: String,
    required: true,
    trim: true,
  },
  nisn: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  nama: {
    type: String,
    required: true,
    trim: true,
  },
  kelas: {
    type: String,
    required: true,
    enum: ['X-TKJ1', 'X-TKJ2', 'XI-TKJ1', 'XI-TKJ2', 'XII-TKJ1', 'XII-TKJ2'],
  },
  angkatan: {
    type: Number,
    required: true,
  },
  orangTuaNama: {
    type: String,
    trim: true,
  },
  orangTuaTelepon: {
    type: String,
    trim: true,
  },
  classroomId: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

studentSchema.index({ kelas: 1 });
studentSchema.index({ angkatan: 1 });
studentSchema.index({ classroomId: 1 });

module.exports = mongoose.model('Student', studentSchema);
