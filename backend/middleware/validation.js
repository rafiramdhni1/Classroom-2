const { z } = require('zod');

const loginSchema = z.object({
  nisn: z.string().min(1, 'NISN harus diisi'),
  password: z.string().min(1, 'Password harus diisi'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

const forgotPasswordSchema = z.object({
  nisn: z.string().min(1, 'NISN harus diisi'),
});

const verifyOtpSchema = z.object({
  nisn: z.string().min(1),
  otp: z.string().length(6, 'OTP harus 6 digit'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

const fallbackVerifySchema = z.object({
  nisn: z.string().min(1, 'NISN harus diisi'),
  orangTuaNama: z.string().min(1, 'Nama orang tua harus diisi'),
});

const createMessageSchema = z.object({
  title: z.string().min(1, 'Judul pesan harus diisi').max(100),
  content: z.string().min(1, 'Isi pesan harus diisi').max(1000),
  targetStudents: z.array(z.string()).optional(),
  targetKelas: z.array(z.string()).optional(),
  targetAngkatan: z.array(z.number()).optional(),
  isGlobal: z.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  expiresAt: z.string().optional(),
});

const createActivationCodeSchema = z.object({
  studentId: z.string().min(1, 'Student ID harus diisi'),
  chatType: z.enum(['student', 'parent']),
});

const bulkCreateSchema = z.object({
  students: z.array(z.object({
    nis: z.string().optional(),
    nisn: z.string().min(1, 'NISN harus diisi'),
    nama: z.string().min(1),
    kelas: z.string(),
    angkatan: z.number().optional(),
    orangTuaNama: z.string().optional(),
    orangTuaTelepon: z.string().optional(),
  })).min(1, 'Minimal 1 siswa'),
  defaultPassword: z.string().min(6).optional(),
});

function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      const errors = err.errors?.map(e => e.message) || [err.message];
      res.status(400).json({ error: errors.join(', ') });
    }
  };
}

module.exports = {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  fallbackVerifySchema,
  createMessageSchema,
  createActivationCodeSchema,
  bulkCreateSchema,
  validate,
};
