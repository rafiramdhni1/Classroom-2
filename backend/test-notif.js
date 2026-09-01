require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const { sendDailyNotifications } = require('./services/notification');

  console.log('Mengirim notifikasi...');
  await sendDailyNotifications();
  console.log('Selesai!');
  process.exit(0);
}

run();
