require('dotenv').config();
const mongoose = require('mongoose');
const fetch = require('node-fetch');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;
let offset = 0;

const ActivationCode = require('./models/ActivationCode');
const ChatId = require('./models/ChatId');
const Student = require('./models/Student');

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from?.first_name || 'User';

  console.log(`[Pesan] ${firstName} (chatId:${chatId}): ${text}`);

  if (text === '/start') {
    await sendMessage(chatId,
      `Selamat Datang di Sistem Akademik SMK TKJ!\n\n` +
      `Untuk mengaktifkan notifikasi, kirim kode aktivasi:\n` +
      `AKTIF <kode>\n\n` +
      `Contoh: AKTIF X-TKJ1-001-ST-A1B2C3`
    );
  } else if (text === '/help') {
    await sendMessage(chatId,
      `Bantuan:\n` +
      `/start - Mulai aktivasi\n` +
      `/status - Cek status akun\n` +
      `/help - Tampilkan bantuan`
    );
  } else if (text === '/status') {
    const chat = await ChatId.findOne({ chatId, isActive: true });
    if (!chat) {
      await sendMessage(chatId, 'Akun Anda belum teraktivasi. Kirim: AKTIF <kode>');
    } else {
      const student = await Student.findById(chat.studentId);
      if (student) {
        await sendMessage(chatId,
          `Status Akun:\nNama: ${student.nama}\nKelas: ${student.kelas}\nStatus: Aktif`
        );
      } else {
        await sendMessage(chatId, 'Data siswa tidak ditemukan.');
      }
    }
  } else if (text.startsWith('AKTIF ')) {
    const code = text.replace('AKTIF ', '').trim().toUpperCase();
    console.log(`[Aktivasi] Kode: ${code}`);

    const activationCode = await ActivationCode.findOne({
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!activationCode) {
      await sendMessage(chatId, 'Kode Aktivasi Tidak Valid atau sudah dipakai.');
      return;
    }

    let existingChat = await ChatId.findOne({
      studentId: activationCode.studentId,
      chatType: activationCode.chatType,
      isActive: true,
    });

    if (existingChat) {
      existingChat.chatId = chatId;
      existingChat.activatedAt = new Date();
      await existingChat.save();
    } else {
      await new ChatId({
        studentId: activationCode.studentId,
        chatId,
        chatType: activationCode.chatType,
      }).save();
    }

    activationCode.isUsed = true;
    activationCode.usedAt = new Date();
    await activationCode.save();

    const student = await Student.findById(activationCode.studentId);
    if (student) {
      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?nis=${student.nis}`;
      await sendMessage(chatId,
        `✅ <b>Aktivasi Berhasil!</b>\n\n` +
        `Selamat datang, <b>${student.nama}</b>!\n` +
        `Kelas: ${student.kelas}\n\n` +
        `Anda akan menerima notifikasi tugas harian.\n\n` +
        `📊 <a href="${dashboardUrl}">Buka Dashboard Akademik</a>`
      );
    }
  } else {
    await sendMessage(chatId, 'Pesan tidak dikenali. Kirim /help untuk bantuan.');
  }
}

async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Kirim Gagal]', data.description);
    } else {
      console.log(`[Terkirim] chatId:${chatId}`);
    }
  } catch (err) {
    console.error('[Kirim Error]', err.message);
  }
}

let pollCount = 0;
let errorCount = 0;
const MAX_ERRORS = 10;

async function poll() {
  pollCount++;
  try {
    const url = `${API}/getUpdates?offset=${offset}&timeout=30`;
    const res = await fetch(url, { timeout: 60000 });
    const data = await res.json();

    if (!data.ok) {
      errorCount++;
      console.error(`[Poll Error #${errorCount}]`, data.description);
      if (errorCount >= MAX_ERRORS) {
        console.error('[Poll] Terlalu banyak error, reconnect dalam 30 detik...');
        await new Promise(r => setTimeout(r, 30000));
        errorCount = 0;
      } else {
        await new Promise(r => setTimeout(r, 5000));
      }
      poll();
      return;
    }

    errorCount = 0;

    if (data.result.length > 0) {
      console.log(`[Poll] ${data.result.length} update diterima`);
      for (const update of data.result) {
        offset = update.update_id + 1;
        try {
          await handleUpdate(update);
        } catch (err) {
          console.error('[Handle Error]', err.message);
        }
      }
    }
  } catch (err) {
    errorCount++;
    console.error(`[Poll Error #${errorCount}]`, err.message);
    const delay = Math.min(errorCount * 2000, 30000);
    console.log(`[Poll] Reconnect dalam ${delay / 1000} detik...`);
    await new Promise(r => setTimeout(r, delay));
  }
  poll();
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected for bot');
  console.log('Bot polling dimulai...');
  console.log('Kirim pesan ke @smktkj_akademik_bot untuk test.');
  poll();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
