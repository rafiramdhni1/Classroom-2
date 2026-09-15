require('dotenv').config();
const mongoose = require('mongoose');

async function resetStudent(nisn) {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const student = await db.collection('students').findOne({ nisn });
  if (!student) { console.log('Siswa tidak ditemukan'); process.exit(1); }
  
  const chatResult = await db.collection('chatids').deleteMany({ studentId: student._id });
  console.log('Chat ID dihapus:', chatResult.deletedCount);
  
  const codeResult = await db.collection('activationcodes').updateMany(
    { studentId: student._id },
    { $set: { isUsed: false, usedAt: null } }
  );
  console.log('Kode aktivasi di-reset:', codeResult.modifiedCount);
  
  console.log('✓ Aktivasi untuk ' + nisn + ' sudah di-reset!');
  process.exit(0);
}

const nisn = process.argv[2] || '00240001';
resetStudent(nisn);
