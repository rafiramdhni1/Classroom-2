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
      `Untuk mengaktifkan notifikasi, kirim NISN kamu:\n\n` +
      `📌 <b>Siswa:</b> <code>00240001</code>\n\n` +
      `📌 <b>Orang Tua:</b> <code>00240001-OT</code>`
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
      await sendTelegramMessage(chatId, '⚠️ Akun Anda belum teraktivasi. Kirim NISN kamu.');
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

  if (text.startsWith('AKTIF ') || /^\d{7,8}(-OT)?$/i.test(text)) {
    const code = text.replace('AKTIF ', '').trim().toUpperCase();

    let studentId = null;
    let chatType = 'student';
    let student = null;

    const activationCode = await ActivationCode.findOne({
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (activationCode) {
      studentId = activationCode.studentId;
      chatType = activationCode.chatType;
    } else {
      if (code.endsWith('-OT')) {
        chatType = 'parent';
        const nisn = code.replace('-OT', '');
        student = await Student.findOne({ nisn });
      } else {
        student = await Student.findOne({ nisn: code });
      }

      if (student) {
        studentId = student._id;
      }
    }

    if (!studentId) {
      await sendTelegramMessage(chatId,
        '❌ <b>Kode Aktivasi Tidak Valid</b>\n\n' +
        'NISN tidak ditemukan. Pastikan NISN yang kamu kirim sudah benar.\n\n' +
        '📌 Contoh: <code>00240001</code>'
      );
      return;
    }

    const existingChat = await ChatId.findOne({
      studentId,
      chatType,
      isActive: true,
    });

    if (existingChat) {
      if (existingChat.chatId !== chatId) {
        await sendTelegramMessage(chatId,
          '❌ <b>NISN Sudah Digunakan</b>\n\n' +
          'NISN ini sudah teraktivasi oleh akun Telegram lain.\n' +
          'Jika ini adalah akun kamu, silakan hubungi admin.'
        );
        return;
      }
      existingChat.activatedAt = new Date();
      await existingChat.save();
    } else {
      const chat = new ChatId({
        studentId,
        chatId,
        chatType,
      });
      await chat.save();
    }

    if (activationCode) {
      activationCode.isUsed = true;
      activationCode.usedAt = new Date();
      await activationCode.save();
    }

    if (!student) {
      student = await Student.findById(studentId);
    }
    const chatTypeLabel = chatType === 'parent' ? 'Orang Tua' : 'Siswa';

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
