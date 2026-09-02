const os = require('os');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const errorLog = [];
const requestStats = { total: 0, errors: 0, byRoute: {} };

function trackRequest(req, res, duration) {
  requestStats.total++;
  const route = req.route?.path || req.url;
  if (!requestStats.byRoute[route]) {
    requestStats.byRoute[route] = { count: 0, errors: 0, avgDuration: 0 };
  }
  const r = requestStats.byRoute[route];
  r.count++;
  r.avgDuration = (r.avgDuration * (r.count - 1) + duration) / r.count;

  if (res.statusCode >= 400) {
    requestStats.errors++;
    r.errors++;
  }
}

function logError(source, message, stack = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    source,
    message,
    stack,
  };
  errorLog.push(entry);
  if (errorLog.length > 500) errorLog.shift();

  const logFile = path.join(LOG_DIR, 'errors.log');
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}

function getSystemStatus() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  const uptime = os.uptime();

  let dbStatus = 'disconnected';
  let dbCollections = 0;
  try {
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'connected';
    }
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }

  let logFiles = [];
  try {
    logFiles = fs.readdirSync(LOG_DIR).map(f => {
      const stat = fs.statSync(path.join(LOG_DIR, f));
      return { name: f, size: stat.size, modified: stat.mtime };
    });
  } catch (e) {}

  return {
    server: {
      uptime: Math.floor(uptime),
      platform: os.platform(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      pid: process.pid,
    },
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      percentage: Math.round((usedMem / totalMem) * 100),
    },
    cpu: {
      model: cpus[0]?.model || 'unknown',
      cores: cpus.length,
      loadAvg: loadAvg.map(l => l.toFixed(2)),
    },
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'unknown',
    },
    requests: {
      total: requestStats.total,
      errors: requestStats.errors,
      errorRate: requestStats.total > 0
        ? ((requestStats.errors / requestStats.total) * 100).toFixed(1) + '%'
        : '0%',
      topRoutes: Object.entries(requestStats.byRoute)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([route, stats]) => ({
          route,
          count: stats.count,
          errors: stats.errors,
          avgDuration: Math.round(stats.avgDuration) + 'ms',
        })),
    },
    errors: {
      recent: errorLog.slice(-20).reverse(),
      total: errorLog.length,
    },
    logs: logFiles,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function readLogFile(filename) {
  const filePath = path.join(LOG_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error('File log tidak ditemukan');
  const stat = fs.statSync(filePath);
  if (stat.size > 1024 * 1024) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    return { lines: lines.slice(-200), totalLines: lines.length, size: formatBytes(stat.size) };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return { lines: content.split('\n').filter(Boolean), totalLines: lines?.length || 0, size: formatBytes(stat.size) };
}

module.exports = { trackRequest, logError, getSystemStatus, readLogFile };
