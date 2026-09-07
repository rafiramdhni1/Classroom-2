const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'parent', 'admin'],
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  mustChangePassword: {
    type: Boolean,
    default: true,
  },
  resetPasswordOtp: String,
  resetPasswordOtpExpiry: Date,
  lastLogin: Date,
  googleAccessToken: String,
  googleRefreshToken: String,
  googleTokenExpiry: Date,
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
