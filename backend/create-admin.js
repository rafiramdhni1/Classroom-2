require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const NISN = process.env.ADMIN_NISN || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ nisn: NISN });
    if (admin) {
      admin.password = PASSWORD;
      admin.mustChangePassword = false;
      admin.studentId = admin.studentId || new mongoose.Types.ObjectId();
      await admin.save();
      console.log(`✅ Admin "${NISN}" sudah ada, password diperbarui.`);
    } else {
      admin = new User({
        nis: NISN,
        nisn: NISN,
        password: PASSWORD,
        role: 'admin',
        studentId: new mongoose.Types.ObjectId(),
        mustChangePassword: false,
      });
      await admin.save();
      console.log(`✅ Admin "${NISN}" berhasil dibuat (password: ${PASSWORD}).`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Gagal membuat admin:', error.message);
    process.exit(1);
  }
}

createAdmin();