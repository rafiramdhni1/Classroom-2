import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function Login() {
  const [nis, setNis] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotNis, setForgotNis] = useState('');
  const [forgotStep, setForgotStep] = useState(0);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(nis, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal login. Periksa NIS dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { nis: forgotNis });
      setSuccess('OTP berhasil dikirim ke Telegram Anda.');
      setForgotStep(1);
    } catch (err) {
      if (err.response?.data?.fallback) {
        setForgotStep(2);
        setError('');
      } else {
        setError(err.response?.data?.error || 'Gagal mengirim OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const nisn = e.target.nisn?.value;
      const orangTuaNama = e.target.orangTuaNama?.value;

      await api.post('/auth/fallback-verify', {
        nis: forgotNis,
        nisn,
        orangTuaNama,
      });

      setSuccess('Verifikasi berhasil. OTP dikirim ke Telegram.');
      setForgotStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Verifikasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/verify-otp', {
        nis: forgotNis,
        otp,
        newPassword,
      });

      setSuccess('Password berhasil direset! Silakan login.');
      setShowForgot(false);
      setForgotStep(0);
      setForgotNis('');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Sistem Akademik</h1>
          <p className="text-primary-100 mt-1">SMK Jurusan TKJ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {!showForgot ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Login</h2>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIS</label>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                    placeholder="Masukkan NIS"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                    placeholder="Masukkan password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition disabled:opacity-50"
                >
                  {loading ? 'Masuk...' : 'Masuk'}
                </button>
              </form>

              <button
                onClick={() => {
                  setShowForgot(true);
                  setError('');
                  setSuccess('');
                  setForgotStep(0);
                }}
                className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700 text-center"
              >
                Lupa Password?
              </button>

              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  Login sebagai orang tua? Gunakan NIS dengan akhiran <code className="bg-gray-100 px-1 rounded">-OT</code>
                </p>
              </div>
            </>
          ) : (
            <>
              {forgotStep === 0 && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Lupa Password</h2>
                  <p className="text-sm text-gray-500 mb-4">Masukkan NIS Anda untuk menerima OTP via Telegram.</p>

                  {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <input
                      type="text"
                      value={forgotNis}
                      onChange={(e) => setForgotNis(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Masukkan NIS"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                    >
                      {loading ? 'Mengirim...' : 'Kirim OTP'}
                    </button>
                  </form>

                  <button
                    onClick={() => { setShowForgot(false); setError(''); setSuccess(''); }}
                    className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Kembali ke Login
                  </button>
                </>
              )}

              {forgotStep === 1 && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Masukkan OTP</h2>
                  <p className="text-sm text-gray-500 mb-4">Kode OTP telah dikirim ke Telegram Anda.</p>

                  {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                      {success}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-center text-lg tracking-widest"
                      placeholder="6 digit OTP"
                      maxLength={6}
                      required
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Password baru (min. 6 karakter)"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                    >
                      {loading ? 'Memproses...' : 'Reset Password'}
                    </button>
                  </form>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifikasi Identitas</h2>
                  <p className="text-sm text-gray-500 mb-4">Lengkapi data berikut untuk verifikasi.</p>

                  {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleFallbackVerify} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NISN</label>
                      <input
                        type="text"
                        name="nisn"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Masukkan NISN"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Orang Tua</label>
                      <input
                        type="text"
                        name="orangTuaNama"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Nama lengkap orang tua"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                    >
                      {loading ? 'Memverifikasi...' : 'Verifikasi'}
                    </button>
                  </form>

                  <button
                    onClick={() => { setForgotStep(0); setError(''); }}
                    className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Kembali
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
