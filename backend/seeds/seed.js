require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const KELAS_LIST = ['X-TKJ1', 'X-TKJ2', 'XI-TKJ1', 'XI-TKJ2', 'XII-TKJ1', 'XII-TKJ2'];
const ANGKATAN_MAP = { X: 2024, XI: 2023, XII: 2022 };

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    await db.collection('users').deleteMany({});
    await db.collection('students').deleteMany({});
    console.log('Cleared existing data');

    console.log('Hashing password...');
    const defaultHash = await bcrypt.hash('240001', 10);

    let nisCounter = 240001;
    const studentsBatch = [];
    const usersBatch = [];

    for (const kelas of KELAS_LIST) {
      const angkatanKey = kelas.split('-')[0];
      const angkatan = ANGKATAN_MAP[angkatanKey];

      for (let i = 1; i <= 36; i++) {
        const nis = String(nisCounter++);
        const nisn = `00${nis}`;
        const studentId = new mongoose.Types.ObjectId();

        studentsBatch.push({
          _id: studentId, nis, nisn,
          nama: `Siswa ${kelas}-${String(i).padStart(2, '0')}`,
          kelas, angkatan,
          orangTuaNama: `Orang Tua ${nis}`,
          orangTuaTelepon: `6281${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          isActive: true,
        });

        usersBatch.push({ nis, nisn, password: defaultHash, mustChangePassword: true, role: 'student', studentId });
        usersBatch.push({ nis: `${nis}-OT`, nisn: `${nisn}-OT`, password: defaultHash, mustChangePassword: true, role: 'parent', studentId });
      }
    }

    const S = 50;
    for (let i = 0; i < studentsBatch.length; i += S) {
      await db.collection('students').insertMany(studentsBatch.slice(i, i + S));
      process.stdout.write(`\rStudents: ${Math.min(i + S, studentsBatch.length)}/${studentsBatch.length}`);
    }
    console.log('');

    for (let i = 0; i < usersBatch.length; i += S) {
      await db.collection('users').insertMany(usersBatch.slice(i, i + S));
      process.stdout.write(`\rUsers: ${Math.min(i + S, usersBatch.length)}/${usersBatch.length}`);
    }
    console.log('');

    console.log(`\n✅ ${studentsBatch.length} siswa, ${usersBatch.length} user`);
    console.log('Login siswa:  NISN=00240001, Password=240001');
    console.log('Login ortu:   NISN=00240001-OT, Password=240001');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
