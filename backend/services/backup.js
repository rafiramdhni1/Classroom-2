const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 30;

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

async function createBackup(label = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = label ? `${label}_${timestamp}` : timestamp;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.mkdirSync(backupPath, { recursive: true });

  const collections = await mongoose.connection.db.listCollections().toArray();
  const manifest = {
    name: backupName,
    createdAt: new Date().toISOString(),
    collections: [],
    size: 0,
  };

  for (const col of collections) {
    const data = await mongoose.connection.db.collection(col.name).find({}).toArray();
    const filePath = path.join(backupPath, `${col.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    manifest.collections.push({ name: col.name, documents: data.length });
  }

  const manifestPath = path.join(backupPath, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const totalSize = getDirSize(backupPath);
  manifest.size = totalSize;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  cleanupOldBackups();

  return { name: backupName, path: backupPath, ...manifest };
}

function getDirSize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const stat = fs.statSync(path.join(dir, f));
    if (stat.isDirectory()) {
      size += getDirSize(path.join(dir, f));
    } else {
      size += stat.size;
    }
  }
  return size;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const dirs = fs.readdirSync(BACKUP_DIR).filter(f => {
    const fp = path.join(BACKUP_DIR, f);
    return fs.statSync(fp).isDirectory();
  });

  return dirs.map(d => {
    const manifestPath = path.join(BACKUP_DIR, d, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath));
    }
    return { name: d, createdAt: 'unknown', collections: [], size: 0 };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function restoreBackup(backupName) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) throw new Error('Backup tidak ditemukan');

  const manifestPath = path.join(backupPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('Manifest backup tidak ditemukan');

  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const restored = [];

  for (const col of manifest.collections) {
    const filePath = path.join(backupPath, `${col.name}.json`);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath));
    const collection = mongoose.connection.db.collection(col.name);

    await collection.deleteMany({});
    if (data.length > 0) {
      await collection.insertMany(data);
    }
    restored.push({ name: col.name, documents: data.length });
  }

  return { name: backupName, restored };
}

function deleteBackup(backupName) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) throw new Error('Backup tidak ditemukan');
  fs.rmSync(backupPath, { recursive: true, force: true });
  return { deleted: backupName };
}

function cleanupOldBackups() {
  const backups = listBackups();
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    for (const b of toDelete) {
      const bp = path.join(BACKUP_DIR, b.name);
      if (fs.existsSync(bp)) fs.rmSync(bp, { recursive: true, force: true });
    }
  }
}

module.exports = { createBackup, listBackups, restoreBackup, deleteBackup, formatSize };
