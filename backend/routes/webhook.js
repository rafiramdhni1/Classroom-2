const express = require('express');
const { handleTelegramWebhook } = require('../services/telegramBot');
const { syncAllCourses } = require('../services/classroom');
const { sendDailyNotifications } = require('../services/notification');

const router = express.Router();

const N8N_SECRET = process.env.N8N_SECRET || 'smk-tkj-n8n-secret';

function verifyN8nSecret(req, res, next) {
  const token = req.headers['x-webhook-secret'] || req.query.secret;
  if (token !== N8N_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/telegram', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const update = JSON.parse(req.body.toString());
    await handleTelegramWebhook(update);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(200);
  }
});

router.get('/sync-and-notify', verifyN8nSecret, async (req, res) => {
  try {
    console.log('[n8n] Sync + Notifikasi dimulai...');

    let syncResult = null;
    try {
      await syncAllCourses();
      syncResult = 'ok';
    } catch (err) {
      syncResult = 'error: ' + err.message;
      console.error('[n8n] Sync error:', err.message);
    }

    let notifResult = null;
    try {
      await sendDailyNotifications();
      notifResult = 'ok';
    } catch (err) {
      notifResult = 'error: ' + err.message;
      console.error('[n8n] Notif error:', err.message);
    }

    res.json({
      status: 200,
      timestamp: new Date().toISOString(),
      sync: syncResult,
      notification: notifResult,
    });
  } catch (error) {
    console.error('[n8n] Fatal error:', error);
    res.status(500).json({ status: 500, error: error.message });
  }
});

router.post('/sync', verifyN8nSecret, async (req, res) => {
  try {
    await syncAllCourses();
    res.json({ status: 'ok', message: 'Sinkronisasi selesai.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.post('/notify', verifyN8nSecret, async (req, res) => {
  try {
    await sendDailyNotifications();
    res.json({ status: 'ok', message: 'Notifikasi terkirim.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
