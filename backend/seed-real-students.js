require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const KELAS = 'X-TKJ2';
const ANGKATAN = 2024;
const PASSWORD = '123456';

const SISWA = [
  { induk: 13667, nama: 'Adrian Firmansyah' },
  { induk: 13668, nama: 'Ahmad Farel Baihaqi' },
  { induk: 13669, nama: 'Ahmad Maullana Dwi Nur Ikhsan' },
  { induk: 13670, nama: 'Ahnaf Farras Nugraha' },
  { induk: 13671, nama: 'Alfian Rifqi Radista' },
  { induk: 13672, nama: 'Anantama Vulvian Ka Prasetya' },
  { induk: 13673, nama: 'Andi Kurniawan' },
  { induk: 13674, nama: 'Angger Dimas Prasetyo' },
  { induk: 13675, nama: 'Ardito Hafidh Razka Saputra' },
  { induk: 13676, nama: 'Arif Nurcahyo' },
  { induk: 13677, nama: 'Arsya Naryama Balakosa Koeswidyo' },
  { induk: 13678, nama: 'Clarinta Puri Anindya Zeta' },
  { induk: 13679, nama: 'Dihandre Bagus Ridho Riyadi' },
  { induk: 13680, nama: 'Ernesto Favian Cesario Yoofi Wahyudianto' },
  { induk: 13681, nama: 'Fikri Lianita Nuraini' },
  { induk: 13682, nama: 'Fulvian Zaki' },
  { induk: 13683, nama: 'Hernawan Fariyanto' },
  { induk: 13684, nama: 'Iffat Firas Heriyanto' },
  { induk: 13685, nama: 'Jasmin Dwi Nurani' },
  { induk: 13686, nama: 'Kevin Rizki Pratama' },
  { induk: 13687, nama: 'Mahadma Arya Irza Wibowo' },
  { induk: 13688, nama: 'Mickala Saka Pandia Syah Putra' },
  { induk: 13689, nama: 'Mufti Aulia Nurfadhilah' },
  { induk: 13690, nama: 'Muhamad Fakhri Fatkhurahman' },
  { induk: 13691, nama: 'Muhammad Daffa Maulana' },
  { induk: 13692, nama: 'Muhammad Jafar Umar Asyidiq' },
  { induk: 13693, nama: 'Muhammad Nuril Arifin' },
  { induk: 13694, nama: 'Okta Kurniawan Dika Saputra' },
  { induk: 13695, nama: 'Pandu Eka Prasetya' },
  { induk: 13696, nama: 'Rafi Ahmad Wibowo' },
  { induk: 13697, nama: 'Rafi Ramdhani Dzaki Susilo' },
  { induk: 13698, nama: 'Rahma Juliyani' },
  { induk: 13699, nama: 'Rasya Kavia Nanda' },
  { induk: 13700, nama: 'Rezha Nur Saputra' },
  { induk: 13701, nama: 'Riko Dwy Januanto' },
  { induk: 13702, nama: 'Siti Nur Fitriasari' },
];

async function seedRealStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    await db.collection('students').deleteMany({});
    await db.collection('users').deleteMany({ role: { $ne: 'admin' } });
    console.log('Data lama dibersihkan (admin dipertahankan)');

    console.log('Hashing password...');
    const defaultHash = await bcrypt.hash(PASSWORD, 10);

    const studentsBatch = [];
    const usersBatch = [];

    for (const s of SISWA) {
      const studentId = new mongoose.Types.ObjectId();
      const nis = String(s.induk);
      const nisn = '00' + s.induk;

      studentsBatch.push({
        _id: studentId,
        nis,
        nisn,
        nama: s.nama,
        kelas: KELAS,
        angkatan: ANGKATAN,
        isActive: true,
      });

      usersBatch.push({ nis, nisn, password: defaultHash, role: 'student', studentId, mustChangePassword: true });
    }

    const S = 50;
    for (let i = 0; i < studentsBatch.length; i += S) {
      await db.collection('students').insertMany(studentsBatch.slice(i, i + S));
    }
    for (let i = 0; i < usersBatch.length; i += S) {
      await db.collection('users').insertMany(usersBatch.slice(i, i + S));
    }

    console.log(`\n✅ ${studentsBatch.length} siswa ${KELAS} dimasukkan, ${usersBatch.length} akun user`);
    console.log(`Login: Masukkan nomor induk, password=${PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedRealStudents();
