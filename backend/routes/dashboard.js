const express = require('express');
const { auth } = require('../middleware/auth');
const Student = require('../models/Student');
const CourseworkCache = require('../models/CourseworkCache');
const Grade = require('../models/Grade');
const AdminMessage = require('../models/AdminMessage');

const router = express.Router();

const SUBJECTS = ['ASJ', 'AIJ', 'TJBL', 'PKDK', 'TJKT'];

function getRank(averages, studentId) {
  const sorted = Object.entries(averages)
    .sort((a, b) => b[1] - a[1]);

  const rank = sorted.findIndex(([id]) => id === studentId.toString()) + 1;
  return { rank, total: sorted.length };
}

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
    }

    const messages = await AdminMessage.find({
      $or: [
        { targetStudents: student._id },
        { targetKelas: student.kelas },
        { targetAngkatan: student.angkatan },
        { isGlobal: true },
      ],
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).sort({ createdAt: -1 }).limit(20);

    const allCoursework = await CourseworkCache.find({
      'studentSubmissions.studentId': student._id,
    });

    const manualGrades = await Grade.find({ studentId: student._id });

    const subjectGrades = {};
    let totalScore = 0;
    let totalSubjects = 0;

    for (const subject of SUBJECTS) {
      const subjectWorks = allCoursework.filter(w => w.courseAlias === subject);
      const subjectManual = manualGrades.filter(g => g.subject === subject);
      let subjectTotal = 0;
      let subjectCount = 0;
      const components = [];

      for (const work of subjectWorks) {
        const submission = work.studentSubmissions.find(
          s => s.studentId?.toString() === student._id.toString()
        );

        if (submission && submission.isGraded && submission.grade !== undefined) {
          subjectTotal += submission.grade;
          subjectCount++;
          components.push({
            title: work.title,
            score: submission.grade,
            maxScore: work.maxPoints || 100,
            isGraded: true,
            type: work.workType,
          });
        } else {
          components.push({
            title: work.title,
            score: null,
            maxScore: work.maxPoints || 100,
            isGraded: false,
            type: work.workType,
          });
        }
      }

      for (const mg of subjectManual) {
        subjectTotal += mg.score;
        subjectCount++;
        components.push({
          title: mg.title,
          score: mg.score,
          maxScore: mg.maxScore || 100,
          isGraded: true,
          type: mg.type,
        });
      }

      const avgScore = subjectCount > 0 ? Math.round(subjectTotal / subjectCount * 100) / 100 : null;

      if (avgScore !== null) {
        totalScore += avgScore;
        totalSubjects++;
      }

      subjectGrades[subject] = {
        average: avgScore,
        components,
        totalAssignments: subjectWorks.length,
        gradedCount: subjectCount,
      };
    }

    const overallAverage = totalSubjects > 0
      ? Math.round(totalScore / totalSubjects * 100) / 100
      : null;

    // --- RANKING OPTIMIZED ---
    const [studentsInClass, studentsInAngkatan] = await Promise.all([
      Student.find({ kelas: student.kelas, isActive: true }).select('_id'),
      Student.find({ angkatan: student.angkatan, isActive: true }).select('_id'),
    ]);

    const classIds = studentsInClass.map(s => s._id);
    const angkatanIds = studentsInAngkatan.map(s => s._id);

    const [classCoursework, angkatanCoursework, classManualGrades, angkatanManualGrades] = await Promise.all([
      CourseworkCache.find({
        'studentSubmissions.studentId': { $in: classIds },
      }).select('studentSubmissions.studentId studentSubmissions.isGraded studentSubmissions.grade'),
      angkatanIds.length !== classIds.length
        ? CourseworkCache.find({
            'studentSubmissions.studentId': { $in: angkatanIds },
          }).select('studentSubmissions.studentId studentSubmissions.isGraded studentSubmissions.grade')
        : null,
      Grade.find({ studentId: { $in: classIds } }).select('studentId score'),
      angkatanIds.length !== classIds.length
        ? Grade.find({ studentId: { $in: angkatanIds } }).select('studentId score')
        : null,
    ]);

    function calculateAveragesWithManual(ids, coursework, manualGrades) {
      const averages = {};
      for (const sid of ids) {
        let total = 0;
        let count = 0;
        for (const cw of coursework) {
          const sub = cw.studentSubmissions.find(
            s => s.studentId?.toString() === sid.toString()
          );
          if (sub && sub.isGraded && sub.grade !== undefined) {
            total += sub.grade;
            count++;
          }
        }
        if (manualGrades) {
          for (const mg of manualGrades) {
            if (mg.studentId?.toString() === sid.toString()) {
              total += mg.score;
              count++;
            }
          }
        }
        averages[sid.toString()] = count > 0 ? total / count : 0;
      }
      return averages;
    }

    const classAverages = calculateAveragesWithManual(classIds, classCoursework, classManualGrades);
    const angkatanAverages = calculateAveragesWithManual(
      angkatanIds,
      angkatanCoursework || classCoursework,
      angkatanManualGrades || classManualGrades
    );

    // 4. Cari rank
    const classRank = getRank(classAverages, student._id);
    const angkatanRank = getRank(angkatanAverages, student._id);

    const waLink = `https://wa.me/${process.env.ADMIN_PHONE}?text=${encodeURIComponent('Halo Admin, saya ingin bertanya tentang sistem akademik.')}`;

    res.json({
      student: {
        nama: student.nama,
        kelas: student.kelas,
        angkatan: student.angkatan,
      },
      adminContact: waLink,
      messages,
      subjectGrades,
      overallAverage,
      classRank,
      angkatanRank,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// PUT /api/dashboard/messages/:messageId/read
router.put('/messages/:messageId/read', auth, async (req, res) => {
  try {
    const message = await AdminMessage.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
    }

    const alreadyRead = message.isReadBy.some(
      r => r.studentId.toString() === req.user.studentId.toString()
    );

    if (!alreadyRead) {
      message.isReadBy.push({
        studentId: req.user.studentId,
        readAt: new Date(),
      });
      await message.save();
    }

    res.json({ message: 'Pesan ditandai sudah dibaca.' });
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/dashboard/export-csv
router.get('/export-csv', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.user.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
    }

    const allCoursework = await CourseworkCache.find({
      'studentSubmissions.studentId': student._id,
    });

    const rows = [['Mata Pelajaran', 'Tugas', 'Tipe', 'Nilai', 'Max', 'Status', 'Tenggat']];

    for (const cw of allCoursework) {
      const sub = cw.studentSubmissions.find(
        s => s.studentId?.toString() === student._id.toString()
      );

      const score = sub && sub.isGraded && sub.grade !== undefined ? sub.grade : '-';
      const status = sub && sub.state === 'TURNED_IN' ? 'Terkumpul' : 'Belum';
      const due = cw.dueDate
        ? new Date(cw.dueDate).toLocaleDateString('id-ID')
        : '-';

      rows.push([
        cw.courseAlias,
        cw.title,
        cw.workType,
        score,
        cw.maxPoints || 100,
        status,
        due,
      ]);
    }

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nilai-${student.nis}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
