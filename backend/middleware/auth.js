const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan.' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token tidak valid.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin.' });
  }
  next();
};

module.exports = { auth, adminOnly };
