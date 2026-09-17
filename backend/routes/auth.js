const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const ChatId = require('../models/ChatId');
const { auth } = require('../middleware/auth');
const { sendTelegramMessage } = require('../services/telegram');
const { getAuthUrl, getTokensFromCode, syncAllCourses } = require('../services/classroom');
const {
  validate,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  fallbackVerifySchema,
} = require('../middleware/validation');

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { nis, password } = req.body;

    if (!nis || !password) {
      return res.status(400).json({ error: 'Nomor Induk dan password harus diisi.' });
    }

    const user = await User.findOne({ nis });
    if (!user) {
      return res.status(401).json({ error: 'Nomor Induk atau password salah.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'NISN atau password salah.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    if (user.role === 'admin') {
      return res.json({
        token,
        user: {
          id: user._id,
          nis: user.nis,
          nisn: user.nisn,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      });
    }

    const student = await Student.findById(user.studentId);

    res.json({
      token,
      user: {
        id: user._id,
        nis: user.nis,
        nisn: user.nisn,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        student: student ? {
          id: student._id,
          nama: student.nama,
          kelas: student.kelas,
          angkatan: student.angkatan,
        } : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', auth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password lama salah.' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password berhasil diubah.' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/forgot-password - kirim OTP ke Telegram
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { nis } = req.body;

    const user = await User.findOne({ nis });
    if (!user) {
      return res.status(404).json({ error: 'Nomor Induk tidak ditemukan.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 menit
    await user.save();

    const student = await Student.findById(user.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
    }

    const chatIds = await ChatId.find({ studentId: student._id, isActive: true });

    let sent = false;
    for (const chat of chatIds) {
      try {
        await sendTelegramMessage(chat.chatId,
          `🔐 *Reset Password*\n\nKode OTP Anda: \`${otp}\`\n\nKode ini berlaku selama 10 menit.\nJangan bagikan kode ini ke siapapun.`
        );
        sent = true;
        break;
      } catch (err) {
        console.log(`Gagal kirim ke chatId ${chat.chatId}, mencoba yang lain...`);
      }
    }

    if (!sent) {
      return res.status(500).json({
        error: 'Gagal mengirim OTP ke Telegram. Silakan hubungi admin.',
        fallback: true,
        hint: 'Verifikasi NISN diperlukan sebagai fallback.',
      });
    }

    res.json({ message: 'OTP berhasil dikirim ke Telegram.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
  try {
    const { nis, otp, newPassword } = req.body;

    const user = await User.findOne({ nis });
    if (!user) {
      return res.status(404).json({ error: 'Nomor Induk tidak ditemukan.' });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ error: 'OTP tidak valid.' });
    }

    if (user.resetPasswordOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP sudah kedaluwarsa.' });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password berhasil direset.' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/fallback-verify - verifikasi NISN + faktor tambahan
router.post('/fallback-verify', validate(fallbackVerifySchema), async (req, res) => {
  try {
    const { nis, orangTuaNama } = req.body;

    const student = await Student.findOne({ nis });
    if (!student) {
      return res.status(404).json({ error: 'Nomor Induk tidak ditemukan.' });
    }

    if (student.orangTuaNama?.toLowerCase().trim() !== orangTuaNama.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Nama orang tua tidak cocok.' });
    }

    const user = await User.findOne({ studentId: student._id });
    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const chatIds = await ChatId.find({ studentId: student._id, isActive: true });
    for (const chat of chatIds) {
      try {
        await sendTelegramMessage(chat.chatId,
          `🔐 *Reset Password (Fallback)*\n\nKode OTP Anda: \`${otp}\`\nBerlaku 10 menit.`
        );
      } catch (err) { /* skip */ }
    }

    res.json({ message: 'Verifikasi berhasil. OTP dikirim ke Telegram.' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.studentId);
    res.json({
      user: {
        id: req.user._id,
        nis: req.user.nis,
        nisn: req.user.nisn,
        role: req.user.role,
        mustChangePassword: req.user.mustChangePassword,
        hasGoogleAuth: !!req.user.googleAccessToken,
      },
      student: student ? {
        id: student._id,
        nama: student.nama,
        kelas: student.kelas,
        angkatan: student.angkatan,
        orangTuaNama: student.orangTuaNama,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/auth/google - redirect ke Google Login
router.get('/google', auth, (req, res) => {
  try {
    const state = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const url = getAuthUrl(state);
    res.json({ url });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({ error: 'Gagal membuat URL autentikasi.' });
  }
});

// GET /api/auth/google/callback - handle callback dari Google
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    const tokens = await getTokensFromCode(code);

    // state berisi userId yang diencode
    let userId;
    try {
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      return res.status(400).send('Invalid state parameter');
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.googleAccessToken = tokens.access_token;
    user.googleRefreshToken = tokens.refresh_token;
    user.googleTokenExpiry = new Date(tokens.expiry_date);
    await user.save();

    // Redirect ke frontend dengan status sukses
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?google_auth=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?google_auth=error`);
  }
});

// POST /api/auth/google/sync - trigger sync Google Classroom
router.post('/google/sync', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ error: 'Belum terhubung dengan Google Classroom.' });
    }

    const result = await syncAllCourses(req.userId);
    res.json({ message: 'Sinkronisasi berhasil.', data: result });
  } catch (error) {
    console.error('Google sync error:', error);
    res.status(500).json({ error: 'Gagal sinkronisasi: ' + error.message });
  }
});

// DELETE /api/auth/google/disconnect - putuskan koneksi Google
router.delete('/google/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    user.googleAccessToken = undefined;
    user.googleRefreshToken = undefined;
    user.googleTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Koneksi Google Classroom diputus.' });
  } catch (error) {
    console.error('Google disconnect error:', error);
    res.status(500).json({ error: 'Gagal memutus koneksi.' });
  }
});

module.exports = router;
