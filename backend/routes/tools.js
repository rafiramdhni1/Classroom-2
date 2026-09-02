const express = require('express');
const { createBackup, listBackups, restoreBackup, deleteBackup, formatSize } = require('../services/backup');
const { getSystemStatus, readLogFile } = require('../services/monitoring');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Backup routes
router.get('/backup/list', auth, adminOnly, async (req, res) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/backup/create', auth, adminOnly, async (req, res) => {
  try {
    const { label } = req.body || {};
    const backup = await createBackup(label);
    res.json({
      message: 'Backup berhasil dibuat',
      backup: { ...backup, sizeFormatted: formatSize(backup.size) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat backup: ' + error.message });
  }
});

router.post('/backup/restore/:name', auth, adminOnly, async (req, res) => {
  try {
    const result = await restoreBackup(req.params.name);
    res.json({ message: 'Restore berhasil', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/backup/:name', auth, adminOnly, async (req, res) => {
  try {
    const result = deleteBackup(req.params.name);
    res.json({ message: 'Backup dihapus', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monitoring routes
router.get('/monitoring/status', auth, adminOnly, async (req, res) => {
  try {
    const status = getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/monitoring/logs/:filename', auth, adminOnly, async (req, res) => {
  try {
    const result = readLogFile(req.params.filename);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
