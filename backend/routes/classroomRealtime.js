const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const Student = require('../models/Student');
const User = require('../models/User');
const { google } = require('googleapis');

const router = express.Router();

const SUBJECT_ALIAS_MAP = {
  'ASJ': 'ASJ',
  'AIJ': 'AIJ',
  'TJBL': 'TJBL',
  'PKDK': 'PKDK',
  'TJKT': 'TJKT',
};

function detectSubjectAlias(courseName) {
  const name = courseName.toUpperCase();
  for (const alias of Object.keys(SUBJECT_ALIAS_MAP)) {
    if (name.includes(alias)) return alias;
  }
  return null;
}

function getAuth(accessToken, refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      try {
        const User = require('../models/User');
        const user = await User.findOne({ googleAccessToken: accessToken });
        if (user) {
          user.googleAccessToken = tokens.access_token;
          if (tokens.expiry_date) user.googleTokenExpiry = new Date(tokens.expiry_date);
          await user.save();
          console.log('[Google] Token refreshed and saved');
        }
      } catch (err) {
        console.error('[Google] Gagal simpan token baru:', err.message);
      }
    }
  });
  return oauth2Client;
}

// GET /api/classroom-realtime/grades - Real-time grades from Google Classroom
router.get('/grades', auth, adminOnly, async (req, res) => {
  try {
    const { kelas, subject } = req.query;
    
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ error: 'Google Classroom belum terhubung.' });
    }

    const authClient = getAuth(user.googleAccessToken, user.googleRefreshToken);
    const classroom = google.classroom({ version: 'v1', auth: authClient });

    const coursesRes = await classroom.courses.list({ pageSize: 100 });
    const courses = coursesRes.data.courses || [];

    const results = [];
    
    for (const course of courses) {
      const alias = detectSubjectAlias(course.name);
      if (subject && alias !== subject) continue;

      const courseworkRes = await classroom.courses.courseWork.list({
        courseId: course.id,
        orderBy: 'dueDate desc',
        pageSize: 100,
      });

      const courseworkList = courseworkRes.data.courseWork || [];

      for (const work of courseworkList) {
        const submissionsRes = await classroom.courses.courseWork.studentSubmissions.list({
          courseId: course.id,
          courseWorkId: work.id,
          pageSize: 100,
          fields: 'studentSubmissions(userId,state,late,updateTime,draftGrade,assignedGrade,shortAnswerSubmission,multipleChoiceSubmission)',
        });

        const submissions = submissionsRes.data.studentSubmissions || [];

        const dueDate = work.dueDate
          ? new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day,
            work.dueTime?.hours || 23, work.dueTime?.minutes || 59)
          : undefined;

        results.push({
          courseId: course.id,
          courseName: course.name,
          courseAlias: alias,
          courseworkId: work.id,
          title: work.title,
          description: work.description || '',
          dueDate,
          maxPoints: work.maxPoints || 100,
          submissions: submissions.map(sub => ({
            classroomStudentId: sub.userId,
            state: sub.state,
            late: sub.late,
            grade: sub.assignedGrade || sub.draftGrade || sub.shortAnswerSubmission?.grade || sub.multipleChoiceSubmission?.grade || undefined,
            submittedAt: sub.updateTime ? new Date(sub.updateTime) : undefined,
          })),
        });
      }
    }

    if (kelas) {
      const students = await Student.find({ kelas, isActive: true });
      const classroomIds = students.map(s => s.classroomId).filter(Boolean);
      
      const filteredResults = results.map(r => ({
        ...r,
        submissions: r.submissions.filter(s => classroomIds.includes(s.classroomStudentId)),
      }));

      return res.json({ 
        data: filteredResults, 
        students,
        totalCoursework: filteredResults.length,
        isRealtime: true,
      });
    }

    res.json({ data: results, totalCoursework: results.length, isRealtime: true });
  } catch (error) {
    console.error('Realtime grades error:', error);
    res.status(500).json({ error: 'Gagal mengambil data dari Google Classroom: ' + error.message });
  }
});

// POST /api/classroom-realtime/sync-students - Sync classroomId dari Google Classroom
router.post('/sync-students', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ error: 'Google Classroom belum terhubung.' });
    }

    const authClient = getAuth(user.googleAccessToken, user.googleRefreshToken);
    const classroom = google.classroom({ version: 'v1', auth: authClient });

    const coursesRes = await classroom.courses.list({ pageSize: 100 });
    const courses = coursesRes.data.courses || [];

    let synced = 0;
    let matched = 0;
    const details = [];

    for (const course of courses) {
      try {
        const studentsRes = await classroom.courses.students.list({
          courseId: course.id,
          pageSize: 100,
        });

        const gcStudents = studentsRes.data.students || [];

        for (const gcStudent of gcStudents) {
          const gcUserId = gcStudent.userId;
          const gcName = gcStudent.profile?.name?.fullName || '';
          const email = gcStudent.profile?.emailAddress || '';
          const emailPrefix = email.split('@')[0];

          // 1. Cari siswa yang sudah punya classroomId ini
          let dbStudent = await Student.findOne({ classroomId: gcUserId });

          // 2. Match by email prefix (nisn)
          if (!dbStudent && emailPrefix) {
            dbStudent = await Student.findOne({ nisn: emailPrefix });
          }

          // 3. Fuzzy match by name (konten)

          if (!dbStudent && gcName) {
            const cleanGcName = gcName.replace(/\d+$/, '').trim().toLowerCase();
            const allStudents = await Student.find({ classroomId: { $exists: false } });
            for (const s of allStudents) {
              const cleanDbName = s.nama.toLowerCase();
              if (cleanDbName.includes(cleanGcName) || cleanGcName.includes(cleanDbName.split(' ').pop())) {
                dbStudent = s;
                break;
              }
            }
          }

          if (dbStudent) {
            const isNew = !dbStudent.classroomId || dbStudent.classroomId !== gcUserId;
            dbStudent.classroomId = gcUserId;
            await dbStudent.save();
            matched++;
            if (isNew) {
              details.push({ nama: dbStudent.nama, nisn: dbStudent.nisn, classroomId: gcUserId, course: course.name });
            }
          }
        }
        synced++;
      } catch (err) {
        console.log(`[Sync Students] Error course ${course.name}: ${err.message}`);
      }
    }

    res.json({
      message: `Sinkron selesai. ${matched} siswa dicocokkan dari ${synced} kelas.`,
      matched,
      synced,
      details,
    });
  } catch (error) {
    console.error('Sync students error:', error);
    res.status(500).json({ error: 'Gagal sinkron siswa: ' + error.message });
  }
});

// GET /api/classroom-realtime/students/:courseId - List students in a course
router.get('/students/:courseId', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ error: 'Google Classroom belum terhubung.' });
    }

    const authClient = getAuth(user.googleAccessToken, user.googleRefreshToken);
    const classroom = google.classroom({ version: 'v1', auth: authClient });

    const studentsRes = await classroom.courses.students.list({
      courseId: req.params.courseId,
      pageSize: 100,
    });

    const students = (studentsRes.data.students || []).map(s => ({
      userId: s.userId,
      name: s.profile?.name?.fullName || '',
      email: s.profile?.emailAddress || '',
    }));

    res.json({ students });
  } catch (error) {
    console.error('Get course students error:', error);
    res.status(500).json({ error: 'Gagal mengambil siswa: ' + error.message });
  }
});

// GET /api/classroom-realtime/courses - List all courses
router.get('/courses', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.googleAccessToken) {
      return res.status(400).json({ error: 'Google Classroom belum terhubung.' });
    }

    const authClient = getAuth(user.googleAccessToken, user.googleRefreshToken);
    const classroom = google.classroom({ version: 'v1', auth: authClient });

    const coursesRes = await classroom.courses.list({ pageSize: 100 });
    const courses = (coursesRes.data.courses || []).map(c => ({
      id: c.id,
      name: c.name,
      alias: detectSubjectAlias(c.name),
      section: c.section,
    }));

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar kelas.' });
  }
});

module.exports = router;
