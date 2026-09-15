require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const cache = await db.collection('courseworkcaches').find({}).toArray();
  const studentIds = new Set();
  cache.forEach(c => {
    (c.studentSubmissions || []).forEach(s => {
      studentIds.add(s.classroomStudentId);
    });
  });
  
  console.log('Google Classroom Student IDs:', [...studentIds]);
  
  for (const gsId of studentIds) {
    const student = await db.collection('students').findOne({ nis: gsId });
    if (student) {
      await db.collection('students').updateOne(
        { _id: student._id },
        { $set: { classroomId: gsId } }
      );
      console.log('Mapped:', gsId, '->', student.nama, '(' + student.nisn + ')');
    } else {
      console.log('Not found:', gsId);
    }
  }
  
  console.log('\nDone!');
  process.exit(0);
}
run();
