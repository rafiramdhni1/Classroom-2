const { google } = require('googleapis');
const CourseworkCache = require('../models/CourseworkCache');
const Student = require('../models/Student');
const User = require('../models/User');

const SUBJECT_ALIAS_MAP = {
  'ASJ': 'ASJ',
  'AIJ': 'AIJ',
  'TJBL': 'TJBL',
  'PKDK': 'PKDK',
  'TJKT': 'TJKT',
};

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: state || '',
  });
}

async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getAuth(accessToken, refreshToken) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}

function detectSubjectAlias(courseName) {
  const name = courseName.toUpperCase();
  for (const alias of Object.keys(SUBJECT_ALIAS_MAP)) {
    if (name.includes(alias)) return alias;
  }
  return null;
}

async function syncAllCourses(userId) {
  const user = await User.findById(userId);
  if (!user || !user.googleAccessToken) {
    throw new Error('Google token tidak ditemukan. Silakan login Google terlebih dahulu.');
  }

  const auth = getAuth(user.googleAccessToken, user.googleRefreshToken);
  const classroom = google.classroom({ version: 'v1', auth });

  console.log('[Classroom Sync] Mulai sinkronisasi...');

  const coursesRes = await classroom.courses.list({ pageSize: 100 });
  const courses = coursesRes.data.courses || [];

  console.log(`[Classroom Sync] Ditemukan ${courses.length} kursus`);

  let synced = 0;
  for (const course of courses) {
    const alias = detectSubjectAlias(course.name);
    if (!alias) {
      console.log(`[Classroom Sync] Skipping kursus tanpa alias: ${course.name}`);
      continue;
    }

    console.log(`[Classroom Sync] Sinkron kursus: ${course.name} (${alias})`);

    try {
      const courseworkRes = await classroom.courses.courseWork.list({
        courseId: course.id,
        orderBy: 'dueDate desc',
        pageSize: 100,
      });

      const courseworkList = courseworkRes.data.courseWork || [];

      for (const work of courseworkList) {
        let submissions = [];
        try {
          const submissionsRes = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: course.id,
            courseWorkId: work.id,
            pageSize: 100,
          });
          const rawSubs = submissionsRes.data.studentSubmissions || [];

          const classroomUserIds = rawSubs.map(sub => sub.userId).filter(Boolean);
          const linkedStudents = await Student.find({ classroomId: { $in: classroomUserIds } });
          const classroomToStudent = {};
          for (const ls of linkedStudents) {
            classroomToStudent[ls.classroomId] = ls._id;
          }

          submissions = rawSubs.map(sub => ({
            classroomStudentId: sub.userId,
            studentId: classroomToStudent[sub.userId] || null,
            state: sub.state,
            late: sub.late,
            grade: sub.assignedGrade || sub.draftGrade || sub.shortAnswerSubmission?.grade || sub.multipleChoiceSubmission?.grade || undefined,
            submittedAt: sub.updateTime ? new Date(sub.updateTime) : undefined,
            isGraded: (sub.state === 'TURNED_IN' || sub.state === 'RETURNED') && (sub.assignedGrade !== undefined && sub.assignedGrade !== null || sub.draftGrade !== undefined && sub.draftGrade !== null || sub.shortAnswerSubmission?.grade !== undefined || sub.multipleChoiceSubmission?.grade !== undefined),
            gradeComponents: [],
          }));
        } catch (subErr) {
          console.log(`[Classroom Sync] Gagal ambil submissions: ${subErr.message}`);
        }

        const dueDate = work.dueDate
          ? new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day,
            work.dueTime?.hours || 23, work.dueTime?.minutes || 59)
          : undefined;

        await CourseworkCache.findOneAndUpdate(
          { classroomCourseId: course.id, classroomWorkId: work.id },
          {
            classroomCourseId: course.id,
            classroomWorkId: work.id,
            title: work.title,
            description: work.description || '',
            courseName: course.name,
            courseAlias: alias,
            dueDate,
            maxPoints: work.maxPoints || 100,
            workType: work.workType,
            studentSubmissions: submissions,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }
      synced++;
    } catch (err) {
      console.log(`[Classroom Sync] Error kursus ${course.name}: ${err.message}`);
    }
  }

  console.log(`[Classroom Sync] Selesai. ${synced}/${courses.length} kursus berhasil.`);
  return { coursesFound: courses.length, synced };
}

async function syncCourseWork(classroom, course, alias) {
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
    });

    const rawSubs = submissionsRes.data.studentSubmissions || [];
    const classroomUserIds = rawSubs.map(sub => sub.userId).filter(Boolean);
    const linkedStudents = await Student.find({ classroomId: { $in: classroomUserIds } });
    const classroomToStudent = {};
    for (const ls of linkedStudents) {
      classroomToStudent[ls.classroomId] = ls._id;
    }

    const submissions = rawSubs.map(sub => ({
      classroomStudentId: sub.userId,
      studentId: classroomToStudent[sub.userId] || null,
      state: sub.state,
      late: sub.late,
      grade: sub.assignedGrade || sub.draftGrade || sub.shortAnswerSubmission?.grade || sub.multipleChoiceSubmission?.grade || undefined,
      submittedAt: sub.updateTime ? new Date(sub.updateTime) : undefined,
      isGraded: (sub.state === 'TURNED_IN' || sub.state === 'RETURNED') && (sub.assignedGrade !== undefined && sub.assignedGrade !== null || sub.draftGrade !== undefined && sub.draftGrade !== null || sub.shortAnswerSubmission?.grade !== undefined || sub.multipleChoiceSubmission?.grade !== undefined),
      gradeComponents: [],
    }));

    const dueDate = work.dueDate
      ? new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day,
        work.dueTime?.hours || 23, work.dueTime?.minutes || 59)
      : undefined;

    await CourseworkCache.findOneAndUpdate(
      { classroomCourseId: course.id, classroomWorkId: work.id },
      {
        classroomCourseId: course.id,
        classroomWorkId: work.id,
        title: work.title,
        description: work.description || '',
        courseName: course.name,
        courseAlias: alias,
        dueDate,
        maxPoints: work.maxPoints || 100,
        workType: work.workType,
        studentSubmissions: submissions,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }
}

async function getStudentSubmissions(studentId) {
  const student = await Student.findById(studentId);
  if (!student) return null;

  const classroomStudents = await Student.find({
    kelas: student.kelas,
    classroomId: { $exists: true, $ne: null },
  });

  const classroomStudent = classroomStudents.find(s => s._id.toString() === studentId.toString());

  const allCoursework = await CourseworkCache.find({
    'studentSubmissions.classroomStudentId': classroomStudent?.classroomId,
  });

  return allCoursework.map(cw => ({
    courseworkId: cw.classroomWorkId,
    title: cw.title,
    courseAlias: cw.courseAlias,
    dueDate: cw.dueDate,
    submission: cw.studentSubmissions.find(
      s => s.classroomStudentId === classroomStudent?.classroomId
    ),
  }));
}

async function getUnsubmittedForStudent(student) {
  const coursework = await CourseworkCache.find({
    'studentSubmissions.studentId': student._id,
  });

  const unsubmitted = [];
  for (const cw of coursework) {
    const sub = cw.studentSubmissions.find(
      s => s.studentId?.toString() === student._id.toString()
    );

    if (!sub || sub.state !== 'TURNED_IN') {
      unsubmitted.push({
        title: cw.title,
        courseAlias: cw.courseAlias,
        dueDate: cw.dueDate,
        isLate: sub?.late || false,
      });
    }
  }

  return unsubmitted;
}

async function findUnsubmittedWork() {
  const results = [];

  const students = await Student.find({ isActive: true });

  for (const student of students) {
    const unsubmitted = await getUnsubmittedForStudent(student);

    if (unsubmitted.length > 0) {
      results.push({
        studentId: student._id,
        nama: student.nama,
        nis: student.nis,
        kelas: student.kelas,
        unsubmitted,
      });
    }
  }

  return results;
}

module.exports = { getOAuth2Client, getAuthUrl, getTokensFromCode, syncAllCourses, getStudentSubmissions, findUnsubmittedWork, getUnsubmittedForStudent, SCOPES };
