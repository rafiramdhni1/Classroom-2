const mongoose = require('mongoose');

const gradeComponentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  maxScore: { type: Number, default: 100 },
  score: { type: Number },
  isGraded: { type: Boolean, default: false },
}, { _id: false });

const courseworkSchema = new mongoose.Schema({
  classroomCourseId: {
    type: String,
    required: true,
  },
  classroomWorkId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  courseName: {
    type: String,
    required: true,
  },
  courseAlias: {
    type: String,
    enum: ['ASJ', 'AIJ', 'TJBL', 'PKDK', 'TJKT'],
    required: true,
  },
  dueDate: Date,
  maxPoints: Number,
  workType: {
    type: String,
    enum: ['ASSIGNMENT', 'QUIZ', 'SHORT_ANSWER_QUESTION', 'MATERIAL', 'POST'],
    required: true,
  },
  studentSubmissions: [{
    classroomStudentId: String,
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    state: {
      type: String,
      enum: ['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED', 'STUDENT_EDITED'],
      default: 'NEW',
    },
    grade: Number,
    gradeComponents: [gradeComponentSchema],
    late: { type: Boolean, default: false },
    submittedAt: Date,
  }],
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

courseworkSchema.index({ classroomCourseId: 1, classroomWorkId: 1 }, { unique: true });
courseworkSchema.index({ courseAlias: 1 });
courseworkSchema.index({ dueDate: 1 });

module.exports = mongoose.model('CourseworkCache', courseworkSchema);
