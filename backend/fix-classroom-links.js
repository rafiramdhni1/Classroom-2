require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const students = await mongoose.connection.db.collection('students').find({
    classroomId: { $exists: true, $ne: null }
  }).toArray();
  console.log('Students with classroomId:', students.length);

  const map = {};
  students.forEach(s => { map[s.classroomId] = s._id; });

  const cw = await mongoose.connection.db.collection('courseworkcaches').find({}).toArray();
  let fixed = 0;

  for (const c of cw) {
    let changed = false;
    for (const sub of c.studentSubmissions) {
      if (!sub.studentId && sub.classroomStudentId && map[sub.classroomStudentId]) {
        sub.studentId = map[sub.classroomStudentId];
        changed = true;
        fixed++;
      }
    }
    if (changed) {
      await mongoose.connection.db.collection('courseworkcaches').updateOne(
        { _id: c._id },
        { $set: { studentSubmissions: c.studentSubmissions } }
      );
    }
  }

  console.log('Fixed submissions:', fixed);

  // Verify
  const rafi = await mongoose.connection.db.collection('students').findOne({ nisn: '0013697' });
  const rafiCw = await mongoose.connection.db.collection('courseworkcaches').find({
    'studentSubmissions.studentId': rafi._id
  }).toArray();
  console.log('Rafi coursework after fix:', rafiCw.length);
  rafiCw.forEach(c => {
    const sub = c.studentSubmissions.find(s => s.studentId?.toString() === rafi._id.toString());
    console.log(' -', c.title, '| grade:', sub?.grade, '| isGraded:', sub?.isGraded);
  });

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
