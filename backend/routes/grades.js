const express = require('express');
const Grade = require('../models/Grade');
const Student = require('../models/Student');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const SUBJECTS = ['ASJ', 'AIJ', 'TJBL', 'PKDK', 'TJKT'];
const TYPES = ['tugas', 'quiz', 'uts', 'uas'];

// GET /api/grades - Get grades for a class + subject
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { kelas, subject } = req.query;
    if (!kelas || !subject) {
      return res.status(400).json({ error: 'kelas dan subject wajib diisi.' });
    }

    const students = await Student.find({ kelas, isActive: true }).sort({ nis: 1 });
    const grades = await Grade.find({ subject }).populate('studentId', 'nis nama kelas');

    const assignments = [...new Set(grades.map(g => g.title))];
    const types = [...new Set(grades.map(g => g.type))];

    const studentGrades = students.map(s => {
      const sGrades = grades.filter(g => g.studentId?._id?.toString() === s._id.toString());
      return {
        student: { _id: s._id, nis: s.nis, nama: s.nama, kelas: s.kelas },
        grades: sGrades.map(g => ({
          _id: g._id,
          title: g.title,
          type: g.type,
          score: g.score,
          maxScore: g.maxScore,
          notes: g.notes,
        })),
      };
    });

    res.json({ students: studentGrades, assignments, types, subjects: SUBJECTS });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: 'Gagal mengambil data nilai.' });
  }
});

// POST /api/grades - Create or update a single grade
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { studentId, subject, title, type, score, maxScore, notes } = req.body;

    if (!studentId || !subject || !title || score === undefined) {
      return res.status(400).json({ error: 'studentId, subject, title, dan score wajib diisi.' });
    }

    let grade = await Grade.findOne({ studentId, subject, title });

    if (grade) {
      grade.score = score;
      grade.type = type || grade.type;
      grade.maxScore = maxScore || grade.maxScore;
      grade.notes = notes || grade.notes;
      grade.gradedBy = req.userId;
      await grade.save();
    } else {
      grade = await Grade.create({
        studentId,
        subject,
        title,
        type: type || 'tugas',
        score,
        maxScore: maxScore || 100,
        gradedBy: req.userId,
        notes,
      });
    }

    res.json({ message: 'Nilai tersimpan.', grade });
  } catch (error) {
    console.error('Save grade error:', error);
    res.status(500).json({ error: 'Gagal menyimpan nilai.' });
  }
});

// POST /api/grades/bulk - Bulk save grades (spreadsheet mode)
router.post('/bulk', auth, adminOnly, async (req, res) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'grades harus berupa array.' });
    }

    let created = 0;
    let updated = 0;

    for (const g of grades) {
      if (!g.studentId || !g.subject || !g.title || g.score === undefined) continue;

      const existing = await Grade.findOne({ studentId: g.studentId, subject: g.subject, title: g.title });

      if (existing) {
        existing.score = g.score;
        existing.type = g.type || existing.type;
        existing.maxScore = g.maxScore || existing.maxScore;
        existing.notes = g.notes || existing.notes;
        existing.gradedBy = req.userId;
        await existing.save();
        updated++;
      } else {
        await Grade.create({
          studentId: g.studentId,
          subject: g.subject,
          title: g.title,
          type: g.type || 'tugas',
          score: g.score,
          maxScore: g.maxScore || 100,
          gradedBy: req.userId,
          notes: g.notes,
        });
        created++;
      }
    }

    res.json({ message: `${created} nilai dibuat, ${updated} diperbarui.`, created, updated });
  } catch (error) {
    console.error('Bulk grade error:', error);
    res.status(500).json({ error: 'Gagal menyimpan nilai massal.' });
  }
});

// DELETE /api/grades/:id - Delete a grade
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const grade = await Grade.findByIdAndDelete(req.params.id);
    if (!grade) return res.status(404).json({ error: 'Nilai tidak ditemukan.' });
    res.json({ message: 'Nilai dihapus.' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus nilai.' });
  }
});

// DELETE /api/grades - Delete all grades for a subject + title
router.delete('/', auth, adminOnly, async (req, res) => {
  try {
    const { subject, title } = req.query;
    if (!subject || !title) {
      return res.status(400).json({ error: 'subject dan title wajib diisi.' });
    }
    const result = await Grade.deleteMany({ subject, title });
    res.json({ message: `${result.deletedCount} nilai dihapus.` });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus nilai.' });
  }
});

module.exports = router;
