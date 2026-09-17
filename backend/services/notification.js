const ChatId = require('../models/ChatId');
const Student = require('../models/Student');
const { findUnsubmittedWork } = require('./classroom');
const { sendTelegramMessageWithButton } = require('./telegram');

const DASHBOARD_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function sendDailyNotifications() {
  console.log('[Notifikasi] Mulai cek tugas kurang...');

  const unsubmitted = await findUnsubmittedWork();

  if (unsubmitted.length === 0) {
    console.log('[Notifikasi] Semua siswa sudah mengumpulkan tugas.');
    return;
  }

  console.log(`[Notifikasi] Ditemukan ${unsubmitted.length} siswa dengan tugas kurang.`);

  for (const entry of unsubmitted) {
    const chatIds = await ChatId.find({ studentId: entry.studentId, isActive: true });

    if (chatIds.length === 0) {
      console.log(`[Notifikasi] Tidak ada chatId aktif untuk ${entry.nama}`);
      continue;
    }

    const message = formatNotification(entry);

  const dashboardUrl = `${DASHBOARD_URL}/login?nis=${entry.nis}`;

  for (const chat of chatIds) {
    try {
      await sendTelegramMessageWithButton(chat.chatId, message, '📊 Buka Dashboard', dashboardUrl);
      console.log(`[Notifikasi] Terkirim ke ${entry.nama} (${chat.chatType})`);
    } catch (error) {
      console.error(`[Notifikasi] Gagal kirim ke chatId ${chat.chatId}:`, error.message);
    }
  }
  }

  console.log('[Notifikasi] Selesai.');
}

function formatNotification(entry) {
  const grouped = {};
  for (const item of entry.unsubmitted) {
    if (!grouped[item.courseAlias]) {
      grouped[item.courseAlias] = [];
    }
    grouped[item.courseAlias].push(item);
  }

  const totalTasks = entry.unsubmitted.length;

  let text = `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 TUGAS BELUM DIKUMPULKAN\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `👤 Siswa: ${entry.nama}\n`;
  text += `🏫 Kelas: ${entry.kelas}\n`;
  text += `📝 Total kurang: ${totalTasks} tugas\n\n`;

  for (const [subject, items] of Object.entries(grouped)) {
    text += `📚 ${subject}:\n`;
    for (const item of items) {
      const dueStr = item.dueDate
        ? `⏰ ${new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`
        : '⏰ Tidak ada tenggat';
      const status = item.isLate ? ' ⚠️ TERLAMBAT' : '';
      text += `  ▸ ${item.title} ${dueStr}${status}\n`;
    }
    text += '\n';
  }

  text += `💡 Login dengan NIS: ${entry.nis}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Sistem Akademik SMK TKJ`;

  return text;
}

module.exports = { sendDailyNotifications, formatNotification };
