const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const CourseworkCache = require('../models/CourseworkCache');

const router = express.Router();

// GET /api/classroom-grades - Get grades by class and subject
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { kelas, subject } = req.query;
    
    let filter = {};
    if (subject) filter.courseAlias = subject;

    const coursework = await CourseworkCache.find(filter).sort({ dueDate: -1 });
    
    let students = await Student.find({ kelas, isActive: true }).sort({ nis: 1 });
    
    if (kelas) {
      const classroomIds = students.map(s => s.classroomId).filter(Boolean);
      const filteredCoursework = coursework.filter(cw => 
        cw.studentSubmissions.some(s => classroomIds.includes(s.classroomStudentId))
      );
      
      const result = students.map(student => {
        const submissions = [];
        for (const cw of filteredCoursework) {
          const sub = cw.studentSubmissions.find(
            s => s.classroomStudentId === student.classroomId
          );
          if (sub) {
            submissions.push({
              courseworkId: cw.classroomWorkId,
              title: cw.title,
              courseAlias: cw.courseAlias,
              courseName: cw.courseName,
              dueDate: cw.dueDate,
              maxPoints: cw.maxPoints,
              state: sub.state,
              grade: sub.grade,
              late: sub.late,
              submittedAt: sub.submittedAt,
              isGraded: sub.isGraded,
            });
          }
        }
        return {
          student: { _id: student._id, nis: student.nis, nisn: student.nisn, nama: student.nama, kelas: student.kelas },
          submissions,
        };
      });

      return res.json({ students: result, totalCoursework: filteredCoursework.length });
    }

    res.json({ students: [], totalCoursework: 0 });
  } catch (error) {
    console.error('Get classroom grades error:', error);
    res.status(500).json({ error: 'Gagal mengambil data nilai classroom.' });
  }
});

// GET /api/classroom-grades/student/:id - Get grades for a single student
router.get('/student/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan.' });

    const coursework = await CourseworkCache.find({
      'studentSubmissions.classroomStudentId': student.classroomId,
    }).sort({ dueDate: -1 });

    const submissions = coursework.map(cw => {
      const sub = cw.studentSubmissions.find(
        s => s.classroomStudentId === student.classroomId
      );
      return {
        courseworkId: cw.classroomWorkId,
        title: cw.title,
        courseAlias: cw.courseAlias,
        courseName: cw.courseName,
        dueDate: cw.dueDate,
        maxPoints: cw.maxPoints,
        state: sub?.state,
        grade: sub?.grade,
        late: sub?.late,
        submittedAt: sub?.submittedAt,
        isGraded: sub?.isGraded,
      };
    });

    res.json({ student, submissions });
  } catch (error) {
    console.error('Get student classroom grades error:', error);
    res.status(500).json({ error: 'Gagal mengambil data nilai.' });
  }
});

// GET /api/classroom-grades/subjects - Get list of subjects with coursework
router.get('/subjects', auth, adminOnly, async (req, res) => {
  try {
    const subjects = await CourseworkCache.aggregate([
      { $group: { _id: '$courseAlias', count: { $sum: 1 }, courseName: { $first: '$courseName' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data mata pelajaran.' });
  }
});

module.exports = router;
