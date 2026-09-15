const express = require('express');
const crypto = require('crypto');
const { auth, adminOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const AdminMessage = require('../models/AdminMessage');
const ActivationCode = require('../models/ActivationCode');
const User = require('../models/User');
const ChatId = require('../models/ChatId');
const {
  validate,
  createMessageSchema,
  createActivationCodeSchema,
  bulkCreateSchema,
} = require('../middleware/validation');

const router = express.Router();

router.use(auth);

// GET /api/admin/students
router.get('/students', adminOnly, async (req, res) => {
  try {
    const { kelas, angkatan, search, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };

    if (kelas) filter.kelas = kelas;
    if (angkatan) filter.angkatan = parseInt(angkatan);
    if (search) {
      filter.$or = [
        { nama: { $regex: search, $options: 'i' } },
        { nis: { $regex: search, $options: 'i' } },
        { nisn: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .sort({ kelas: 1, nama: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ students, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// PUT /api/admin/students/:id
router.put('/students/:id', adminOnly, async (req, res) => {
  try {
    const { nama, kelas, nisn, nis, orangTuaNama, orangTuaTelepon, classroomId } = req.body;
    const updateData = { nama, kelas, nisn, nis, orangTuaNama, orangTuaTelepon };
    if (classroomId !== undefined) updateData.classroomId = classroomId;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan.' });

    if (nisn) {
      await User.findOneAndUpdate(
        { studentId: student._id, role: 'student' },
        { nisn, nis: nis || nisn }
      );
      await User.findOneAndUpdate(
        { studentId: student._id, role: 'parent' },
        { nisn: `${nisn}-OT`, nis: `${nis || nisn}-OT` }
      );
    }

    res.json({ message: 'Data siswa diperbarui.', student });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', adminOnly, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    res.json({ message: 'Siswa dinonaktifkan.' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/admin/messages
router.post('/messages', adminOnly, validate(createMessageSchema), async (req, res) => {
  try {
    const { title, content, targetStudents, targetKelas, targetAngkatan, isGlobal, priority, expiresAt } = req.body;

    const message = new AdminMessage({
      title,
      content,
      targetStudents: targetStudents || [],
      targetKelas: targetKelas || [],
      targetAngkatan: targetAngkatan || [],
      isGlobal: isGlobal || false,
      priority: priority || 'normal',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    await message.save();
    res.status(201).json({ message: 'Pesan berhasil dikirim.', data: message });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/admin/messages
router.get('/messages', adminOnly, async (req, res) => {
  try {
    const messages = await AdminMessage.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// DELETE /api/admin/messages/:id
router.delete('/messages/:id', adminOnly, async (req, res) => {
  try {
    await AdminMessage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Pesan dihapus.' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/admin/activation-codes
router.post('/activation-codes', adminOnly, validate(createActivationCodeSchema), async (req, res) => {
  try {
    const { studentId, chatType } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    const code = `${student.nisn}-${chatType === 'parent' ? 'OT' : 'ST'}-${cryptoRandom(6)}`;
    const activationCode = new ActivationCode({
      code,
      studentId,
      chatType: chatType || 'student',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await activationCode.save();
    res.status(201).json({
      message: 'Kode aktivasi berhasil dibuat.',
      code,
      studentNama: student.nama,
      kelas: student.kelas,
      expiresAt: activationCode.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/admin/activation-codes/bulk
router.post('/activation-codes/bulk', adminOnly, async (req, res) => {
  try {
    const { kelas, chatType } = req.body;

    const filter = { isActive: true };
    if (kelas) filter.kelas = kelas;

    const students = await Student.find(filter);
    const codes = [];

    for (const student of students) {
      const code = `${student.nisn}-${chatType === 'parent' ? 'OT' : 'ST'}-${cryptoRandom(6)}`;
      const activationCode = new ActivationCode({
        code,
        studentId: student._id,
        chatType: chatType || 'student',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await activationCode.save();
      codes.push({ code, nama: student.nama, nisn: student.nisn, kelas: student.kelas });
    }

    res.status(201).json({
      message: `${codes.length} kode aktivasi berhasil dibuat.`,
      codes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/admin/activation-codes
router.get('/activation-codes', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await ActivationCode.countDocuments();
    const codes = await ActivationCode.find()
      .populate('studentId', 'nama nis kelas')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ codes, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/admin/activation-codes/export
router.get('/activation-codes/export', adminOnly, async (req, res) => {
  try {
    const { kelas, status = 'pending' } = req.query;

    let filter = {};
    if (status === 'pending') filter.isUsed = false;
    else if (status === 'used') filter.isUsed = true;

    const codes = await ActivationCode.find(filter)
      .populate('studentId', 'nama nisn kelas')
      .sort({ createdAt: -1 });

    let filteredCodes = codes;
    if (kelas) {
      filteredCodes = codes.filter(c => c.studentId?.kelas === kelas);
    }

    const groupedByStudent = {};
    for (const c of filteredCodes) {
      const studentId = c.studentId?._id?.toString() || 'unknown';
      if (!groupedByStudent[studentId]) {
        groupedByStudent[studentId] = {
          nama: c.studentId?.nama || '-',
          nisn: c.studentId?.nisn || '-',
          kelas: c.studentId?.kelas || '-',
          studentCode: null,
          parentCode: null,
        };
      }
      if (c.chatType === 'student' && !groupedByStudent[studentId].studentCode) {
        groupedByStudent[studentId].studentCode = c.code;
      } else if (c.chatType === 'parent' && !groupedByStudent[studentId].parentCode) {
        groupedByStudent[studentId].parentCode = c.code;
      }
    }

    const exportData = Object.values(groupedByStudent);

    res.json({ codes: exportData, total: exportData.length });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/admin/students/bulk-create
router.post('/students/bulk-create', adminOnly, validate(bulkCreateSchema), async (req, res) => {
  try {
    const { students, defaultPassword } = req.body;

    const results = [];
    const angkatanMap = { X: 10, XI: 11, XII: 12 };

    for (const s of students) {
      const existing = await Student.findOne({ nisn: s.nisn });
      if (existing) {
        results.push({ nisn: s.nisn, status: 'sudah_ada' });
        continue;
      }

      const angkatanMatch = s.kelas?.match(/^(\w+)-TKJ/);

      const student = new Student({
        nis: s.nis || s.nisn,
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        angkatan: angkatanMap[angkatanMatch?.[1]] || s.angkatan || 2024,
        orangTuaNama: s.orangTuaNama,
        orangTuaTelepon: s.orangTuaTelepon,
      });
      await student.save();

      const plainPassword = defaultPassword || s.nisn;

      const user = new User({
        nis: s.nis || s.nisn,
        nisn: s.nisn,
        password: plainPassword,
        role: 'student',
        studentId: student._id,
      });
      await user.save();

      if (s.orangTuaNama) {
        const parentUser = new User({
          nis: `${s.nisn}-OT`,
          nisn: `${s.nisn}-OT`,
          password: plainPassword,
          role: 'parent',
          studentId: student._id,
        });
        await parentUser.save();
      }

      const activationCode = `${s.nisn}-ST-${cryptoRandom(6)}`;
      const actCode = new ActivationCode({
        code: activationCode,
        studentId: student._id,
        chatType: 'student',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await actCode.save();

      let parentActivationCode = null;
      if (s.orangTuaNama) {
        parentActivationCode = `${s.nisn}-OT-${cryptoRandom(6)}`;
        const parentActCode = new ActivationCode({
          code: parentActivationCode,
          studentId: student._id,
          chatType: 'parent',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        await parentActCode.save();
      }

      results.push({
        nisn: s.nisn,
        nama: s.nama,
        status: 'berhasil',
        activationCode,
        parentActivationCode,
      });
    }

    const berhasil = results.filter(r => r.status === 'berhasil').length;
    const sudahAda = results.filter(r => r.status === 'sudah_ada').length;

    const codes = results
      .filter(r => r.activationCode)
      .map(r => ({
        nama: r.nama,
        nisn: r.nisn,
        studentCode: r.activationCode,
        parentCode: r.parentActivationCode,
      }));

    res.json({
      message: `Selesai: ${berhasil} dibuat, ${sudahAda} sudah ada.`,
      results,
      codes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', adminOnly, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    const activatedChats = await ChatId.countDocuments({ isActive: true });
    const pendingCodes = await ActivationCode.countDocuments({ isUsed: false });

    const kelasCount = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$kelas', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalStudents,
      totalUsers,
      activatedChats,
      pendingCodes,
      kelasCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

function cryptoRandom(length) {
  const crypto = require('crypto');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
}

module.exports = router;
