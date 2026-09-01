import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('students');
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [codes, setCodes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [messageForm, setMessageForm] = useState({
    title: '', content: '', targetKelas: [], targetAngkatan: [], isGlobal: true, priority: 'normal'
  });
  const [messageSuccess, setMessageSuccess] = useState('');
  const [generatingCode, setGeneratingCode] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [googleAuth, setGoogleAuth] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const KELAS_LIST = ['X-TKJ1', 'X-TKJ2', 'XI-TKJ1', 'XI-TKJ2', 'XII-TKJ1', 'XII-TKJ2'];

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadStudents(); }, [page, filterKelas, search]);

  const loadData = async () => {
    try {
      const [statsRes, codesRes, msgsRes, meRes] = await Promise.all([
        api.get('/admin/dashboard-stats'),
        api.get('/admin/activation-codes'),
        api.get('/admin/messages'),
        api.get('/auth/me'),
      ]);
      setStats(statsRes.data);
      setCodes(codesRes.data.codes);
      setMessages(msgsRes.data.messages);
      setGoogleAuth(meRes.data.user?.hasGoogleAuth || false);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filterKelas) params.append('kelas', filterKelas);
      if (search) params.append('search', search);
      const { data } = await api.get(`/admin/students?${params}`);
      setStudents(data.students);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Gagal memuat siswa:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/messages', messageForm);
      setMessageSuccess('Pesan berhasil dikirim!');
      setMessageForm({ title: '', content: '', targetKelas: [], targetAngkatan: [], isGlobal: true, priority: 'normal' });
      loadData();
      setTimeout(() => setMessageSuccess(''), 3000);
    } catch (err) {
      console.error('Gagal mengirim pesan:', err);
    }
  };

  const generateCode = async (studentId, chatType) => {
    setGeneratingCode(studentId + chatType);
    try {
      const { data } = await api.post('/admin/activation-codes', { studentId, chatType });
      alert(`Kode: ${data.code}\nBerlaku hingga: ${new Date(data.expiresAt).toLocaleDateString('id-ID')}`);
      loadData();
    } catch (err) {
      alert('Gagal membuat kode.');
    } finally {
      setGeneratingCode(null);
    }
  };

  const bulkGenerateCodes = async (chatType) => {
    if (!confirm(`Buat kode aktivasi ${chatType} untuk semua siswa${filterKelas ? ' kelas ' + filterKelas : ''}?`)) return;
    try {
      const body = { chatType };
      if (filterKelas) body.kelas = filterKelas;
      const { data } = await api.post('/admin/activation-codes/bulk', body);
      alert(`${data.codes.length} kode berhasil dibuat!`);
      loadData();
    } catch (err) {
      alert('Gagal generate kode.');
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = bulkText.trim().split('\n');
      const students = lines.map(line => {
        const [nis, nisn, nama, kelas] = line.split(',').map(s => s.trim());
        return { nis, nisn, nama, kelas };
      }).filter(s => s.nis && s.nama && s.kelas);

      const { data } = await api.post('/admin/students/bulk-create', {
        students,
        defaultPassword: 'smk123',
      });
      setBulkResult(data);
      loadData();
    } catch (err) {
      alert('Gagal import.');
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm('Hapus pesan ini?')) return;
    try {
      await api.delete(`/admin/messages/${id}`);
      loadData();
    } catch (err) {
      console.error('Gagal hapus:', err);
    }
  };

  const filteredStudents = students;

  const connectGoogle = async () => {
    try {
      const { data } = await api.get('/auth/google');
      window.location.href = data.url;
    } catch (err) {
      alert('Gagal membuat link Google Auth.');
    }
  };

  const syncClassroom = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/auth/google/sync');
      setSyncResult({ success: true, message: data.message, courses: data.data?.coursesFound || 0 });
    } catch (err) {
      setSyncResult({ success: false, message: err.response?.data?.error || 'Gagal sinkronisasi' });
    } finally {
      setSyncing(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm('Putuskan koneksi Google Classroom?')) return;
    try {
      await api.delete('/auth/google/disconnect');
      setGoogleAuth(false);
    } catch (err) {
      alert('Gagal memutus koneksi.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Panel Admin</h1>
            <p className="text-gray-300 text-sm">SMK TKJ - Sistem Akademik</p>
          </div>
          <button onClick={logout} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm">Logout</button>
        </div>
      </div>

      {stats && (
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.totalStudents}</div>
            <div className="text-xs text-gray-500">Total Siswa</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activatedChats}</div>
            <div className="text-xs text-gray-500">Teraktivasi</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingCodes}</div>
            <div className="text-xs text-gray-500">Kode Pending</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.totalUsers}</div>
            <div className="text-xs text-gray-500">Total Users</div>
          </div>
        </div>
      )}

      <div className="px-4 flex gap-2 overflow-x-auto pb-2 mt-2">
        {[
          { key: 'students', label: 'Siswa' },
          { key: 'messages', label: 'Pesan' },
          { key: 'codes', label: 'Kode Aktivasi' },
          { key: 'import', label: 'Import' },
          { key: 'google', label: 'Google Classroom' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Students Tab */}
        {tab === 'students' && (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Cari nama/NIS..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <select
                value={filterKelas}
                onChange={(e) => { setFilterKelas(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Semua Kelas</option>
                {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              {filteredStudents.map(s => (
                <div key={s._id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.nama}</p>
                    <p className="text-xs text-gray-500">{s.nis} - {s.kelas}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => generateCode(s._id, 'student')}
                      disabled={generatingCode === s._id + 'student'}
                      className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-200"
                    >
                      {generatingCode === s._id + 'student' ? '...' : 'Siswa'}
                    </button>
                    <button
                      onClick={() => generateCode(s._id, 'parent')}
                      disabled={generatingCode === s._id + 'parent'}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200"
                    >
                      {generatingCode === s._id + 'parent' ? '...' : 'Ortu'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg bg-gray-200 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-lg bg-gray-200 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {tab === 'messages' && (
          <div className="space-y-4">
            {messageSuccess && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">{messageSuccess}</div>
            )}

            <form onSubmit={handleSendMessage} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-800">Kirim Pesan Baru</h3>
              <input
                type="text"
                placeholder="Judul pesan"
                value={messageForm.title}
                onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
              <textarea
                placeholder="Isi pesan..."
                value={messageForm.content}
                onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">Prioritas:</label>
                <select
                  value={messageForm.priority}
                  onChange={(e) => setMessageForm({ ...messageForm, priority: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="low">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="high">Tinggi</option>
                  <option value="urgent">Mendesak</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={messageForm.isGlobal}
                  onChange={(e) => setMessageForm({ ...messageForm, isGlobal: e.target.checked })}
                  className="rounded"
                />
                Kirim ke semua siswa
              </label>
              {!messageForm.isGlobal && (
                <div className="flex flex-wrap gap-1">
                  {KELAS_LIST.map(k => (
                    <label key={k} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={messageForm.targetKelas.includes(k)}
                        onChange={(e) => {
                          const kelas = e.target.checked
                            ? [...messageForm.targetKelas, k]
                            : messageForm.targetKelas.filter(x => x !== k);
                          setMessageForm({ ...messageForm, targetKelas: kelas });
                        }}
                      />
                      {k}
                    </label>
                  ))}
                </div>
              )}
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 text-sm">
                Kirim Pesan
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase">Riwayat Pesan</h3>
              {messages.map(msg => (
                <div key={msg._id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-gray-800">{msg.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.createdAt).toLocaleDateString('id-ID')} - {msg.isGlobal ? 'Global' : msg.targetKelas?.join(', ')}
                      </p>
                    </div>
                    <button onClick={() => deleteMessage(msg._id)} className="text-red-400 hover:text-red-600 text-xs">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activation Codes Tab */}
        {tab === 'codes' && (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => bulkGenerateCodes('student')}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Generate Semua (Siswa)
              </button>
              <button
                onClick={() => bulkGenerateCodes('parent')}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Generate Semua (Ortu)
              </button>
            </div>

            <div className="space-y-2">
              {codes.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">Belum ada kode aktivasi.</p>
              ) : (
                codes.slice(0, 100).map(c => (
                  <div key={c._id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-bold text-gray-800">{c.code}</p>
                        <p className="text-xs text-gray-500">
                          {c.studentId?.nama} - {c.studentId?.kelas} ({c.chatType === 'parent' ? 'Orang Tua' : 'Siswa'})
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        c.isUsed ? 'bg-gray-100 text-gray-500' :
                        new Date(c.expiresAt) < new Date() ? 'bg-red-100 text-red-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {c.isUsed ? 'Terpakai' : new Date(c.expiresAt) < new Date() ? 'Kadaluarsa' : 'Aktif'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Import Tab */}
        {tab === 'import' && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">Import Siswa dari CSV</h3>
            <p className="text-xs text-gray-500">Format: NIS, NISN, Nama, Kelas (satu baris per siswa)</p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"240101, 00240101, Ahmad Fauzi, X-TKJ1\n240102, 00240102, Budi Santoso, X-TKJ1"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono h-40 resize-none focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button
              onClick={handleBulkImport}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 text-sm"
            >
              Import Sekarang
            </button>
            {bulkResult && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                {bulkResult.message}
              </div>
            )}
            <p className="text-xs text-gray-400">Password default: smk123</p>
          </div>
        )}

        {/* Google Classroom Tab */}
        {tab === 'google' && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800">Google Classroom Sync</h3>
            
            {!googleAuth ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Hubungkan akun Google Guru untuk mengakses Google Classroom.
                </p>
                <button
                  onClick={connectGoogle}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Hubungkan dengan Google
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Terhubung dengan Google Classroom</span>
                </div>

                <button
                  onClick={syncClassroom}
                  disabled={syncing}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 text-sm disabled:opacity-50"
                >
                  {syncing ? 'Sinkronisasi...' : 'Sinkronisasi Sekarang'}
                </button>

                {syncResult && (
                  <div className={`px-4 py-3 rounded-lg text-sm ${
                    syncResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {syncResult.success 
                      ? `Berhasil! ${syncResult.courses} kelas ditemukan.`
                      : syncResult.message
                    }
                  </div>
                )}

                <button
                  onClick={disconnectGoogle}
                  className="w-full bg-red-100 text-red-600 py-2 rounded-lg text-sm hover:bg-red-200"
                >
                  Putuskan Koneksi
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
