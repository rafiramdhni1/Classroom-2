require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const fs = require('fs');
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhook');

connectDB();

const app = express();

app.use(cors({ origin: [process.env.FRONTEND_URL, 'http://localhost:5000', 'http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use('/api/', globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url !== '/api/health') {
      logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhook', webhookRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

cron.schedule('0 7 * * 1-5', async () => {
  logger.info('[CRON] Sync Classroom mulai...');
  try {
    const { syncAllCourses } = require('./services/classroom');
    await syncAllCourses();
    logger.info('[CRON] Sync Classroom selesai.');
  } catch (err) {
    logger.error('[CRON] Sync Classroom error:', err.message);
  }
});

cron.schedule('0 17 * * 1-5', async () => {
  logger.info('[CRON] Notifikasi harian mulai...');
  try {
    const { sendDailyNotifications } = require('./services/notification');
    await sendDailyNotifications();
    logger.info('[CRON] Notifikasi harian selesai.');
  } catch (err) {
    logger.error('[CRON] Notifikasi error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
