const ActivationCode = require('../models/ActivationCode');
const ChatId = require('../models/ChatId');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendTelegramMessage } = require('./telegram');

const DASHBOARD_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const userSessions = new Map();

async function handleTelegramWebhook(update) {
  const message = update.message || update.callback_query?.message;
  if (!message) return;

  const chatId = message.chat.id;
  const text = message.text?.trim();
  const userId = message.from?.id;

  if (!text) return;

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      `🎓 <b>Selamat Datang di Sistem Akademik SMK TKJ</b>\n\n` +
      `Untuk mengaktifkan notifikasi, kirim kode aktivasi yang telah diberikan sekolah.\n\n` +
      `Format: <code>AKTIF &lt;kode&gt;</code>\n\n` +
      `Contoh: <code>AKTIF X-TKJ1-001-ST-A1B2C3</code>`
    );
    return;
  }

  if (text === '/help') {
    await sendTelegramMessage(chatId,
      `📖 <b>Bantuan</b>\n\n` +
      `• /start - Mulai aktivasi\n` +
      `• /status - Cek status akun\n` +
      `• /help - Tampilkan bantuan ini\n\n` +
      `Untuk pertanyaan lain, silakan hubungi admin sekolah.`
    );
    return;
  }

  if (text === '/status') {
    const chat = await ChatId.findOne({ chatId, isActive: true });
    if (!chat) {
      await sendTelegramMessage(chatId, '⚠️ Akun Anda belum teraktivasi. Kirim kode aktivasi dengan format: <code>AKTIF &lt;kode&gt;</code>');
      return;
    }
    const student = await Student.findById(chat.studentId);
    await sendTelegramMessage(chatId,
      `✅ <b>Status Akun</b>\n\n` +
      `Nama: ${student.nama}\n` +
      `Kelas: ${student.kelas}\n` +
      `Status: Aktif\n\n` +
      `<a href="${DASHBOARD_URL}">📊 Buka Dashboard</a>`
    );
    return;
  }

  if (text.startsWith('AKTIF ')) {
    const code = text.replace('AKTIF ', '').trim().toUpperCase();

    const activationCode = await ActivationCode.findOne({
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!activationCode) {
      await sendTelegramMessage(chatId,
        '❌ <b>Kode Aktivasi Tidak Valid</b>\n\nKode tidak ditemukan, sudah dipakai, atau sudah kedaluwarsa. Silakan hubungi admin sekolah untuk mendapatkan kode baru.'
      );
      return;
    }

    const existingChat = await ChatId.findOne({
      studentId: activationCode.studentId,
      chatType: activationCode.chatType,
      isActive: true,
    });

    if (existingChat) {
      existingChat.chatId = chatId;
      existingChat.activatedAt = new Date();
      await existingChat.save();
    } else {
      const chat = new ChatId({
        studentId: activationCode.studentId,
        chatId,
        chatType: activationCode.chatType,
      });
      await chat.save();
    }

    activationCode.isUsed = true;
    activationCode.usedAt = new Date();
    await activationCode.save();

    const student = await Student.findById(activationCode.studentId);
    const chatTypeLabel = activationCode.chatType === 'parent' ? 'Orang Tua' : 'Siswa';

    await sendTelegramMessage(chatId,
      `🎉 <b>Aktivasi Berhasil!</b>\n\n` +
      `Selamat datang, ${chatTypeLabel} dari <b>${student.nama}</b>!\n` +
      `Kelas: ${student.kelas}\n\n` +
      `Anda akan menerima notifikasi harian mengenai:\n` +
      `• Tugas yang belum dikumpulkan\n` +
      `• Info penting dari sekolah\n\n` +
      `<a href="${DASHBOARD_URL}">📊 Buka Dashboard</a>\n\n` +
      `Gunakan /status untuk cek akun, /help untuk bantuan.`
    );
    return;
  }

  await sendTelegramMessage(chatId,
    '❓ Pesan tidak dikenali.\n\nKirim /help untuk melihat command yang tersedia.'
  );
}

module.exports = { handleTelegramWebhook };
