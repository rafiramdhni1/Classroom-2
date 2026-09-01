require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const result = await db.collection('students').updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  console.log('Updated:', result.modifiedCount, 'siswa');

  const total = await db.collection('students').countDocuments({ isActive: true });
  console.log('Total aktif:', total);

  process.exit(0);
}

run();
