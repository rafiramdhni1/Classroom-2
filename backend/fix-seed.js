require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const r1 = await db.collection('students').updateMany(
    { isActive: { $ne: true } },
    { $set: { isActive: true } }
  );
  console.log('Fixed students isActive:', r1.modifiedCount);

  const activeStudents = await db.collection('students').countDocuments({ isActive: true });
  const totalStudents = await db.collection('students').countDocuments();
  console.log('Active:', activeStudents, '/', totalStudents);

  process.exit(0);
}

fix();
