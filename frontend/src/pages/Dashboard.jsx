import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const SUBJECT_LABELS = {
  ASJ: 'Administrasi Sistem Jaringan',
  AIJ: 'Administrasi Infrastruktur Jaringan',
  TJBL: 'Tata Jaringan Berbasis Luas',
  PKDK: 'Pemodelan dan Komunikasi Data',
  TJKT: 'Teknologi Jaringan Komputer dan Telekomunikasi',
};

export default function Dashboard() {
  const { user, student, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [rankMode, setRankMode] = useState('class');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/dashboard');
      setData(data);
    } catch (err) {
      setError('Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.put(`/dashboard/messages/${messageId}/read`);
      setData(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m._id === messageId
            ? { ...m, isReadBy: [...(m.isReadBy || []), { studentId: user.studentId, readAt: new Date() }] }
            : m
        ),
      }));
    } catch (err) { /* silent */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchDashboard} className="text-primary-600 underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  const rank = rankMode === 'class' ? data.classRank : data.angkatanRank;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-4 rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{data.student?.nama}</h1>
            <p className="text-primary-100 text-sm">{data.student?.kelas} • Angkatan {data.student?.angkatan}</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/dashboard/export-csv"
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition text-sm"
              title="Export Nilai"
            >
              📥
            </a>
            <a
              href={data.adminContact}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition text-sm"
              title="Hubungi Admin"
            >
              💬
            </a>
            <button
              onClick={logout}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition text-sm"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pesan dari Admin */}
        {data.messages && data.messages.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pesan dari Admin</h2>
            {data.messages.map((msg) => {
              const isRead = msg.isReadBy?.some(r => r.studentId === user.studentId);
              return (
                <div
                  key={msg._id}
                  className={`rounded-xl p-4 shadow-sm border-l-4 ${
                    msg.priority === 'urgent' ? 'bg-red-50 border-red-500' :
                    msg.priority === 'high' ? 'bg-orange-50 border-orange-500' :
                    'bg-white border-primary-500'
                  } ${!isRead ? 'ring-2 ring-primary-200' : ''}`}
                  onClick={() => !isRead && markAsRead(msg._id)}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-800">{msg.title}</h3>
                    {!isRead && <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">Baru</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(msg.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Ranking */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Peringkat</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setRankMode('class')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  rankMode === 'class' ? 'bg-primary-600 text-white' : 'text-gray-600'
                }`}
              >
                Kelas
              </button>
              <button
                onClick={() => setRankMode('angkatan')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  rankMode === 'angkatan' ? 'bg-primary-600 text-white' : 'text-gray-600'
                }`}
              >
                Angkatan
              </button>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600">{rank?.rank || '-'}</div>
            <div className="text-sm text-gray-500">dari {rank?.total || 0} siswa</div>
          </div>
        </div>

        {/* Rata-rata */}
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Rata-rata Nilai</h2>
          <div className="text-4xl font-bold text-gray-800">
            {data.overallAverage !== null ? data.overallAverage.toFixed(1) : '-'}
          </div>
        </div>

        {/* Mata Pelajaran */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mata Pelajaran</h2>

          {Object.entries(data.subjectGrades || {}).map(([alias, info]) => (
            <div
              key={alias}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedSubject(expandedSubject === alias ? null : alias)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                    info.average >= 80 ? 'bg-green-500' :
                    info.average >= 60 ? 'bg-yellow-500' :
                    info.average !== null ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {info.average !== null ? info.average.toFixed(0) : '-'}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800 text-sm">{alias}</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{SUBJECT_LABELS[alias]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">
                    {info.gradedCount}/{info.totalAssignments} dinilai
                  </span>
                  <div className={`text-sm font-medium ${
                    expandedSubject === alias ? 'text-primary-600' : 'text-gray-400'
                  }`}>
                    {expandedSubject === alias ? '▲' : '▼'}
                  </div>
                </div>
              </button>

              {expandedSubject === alias && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {info.components.map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{comp.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{comp.type?.toLowerCase()?.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        {comp.isGraded ? (
                          <span className={`text-sm font-bold ${
                            comp.score >= 80 ? 'text-green-600' :
                            comp.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {comp.score}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                            Belum ada nilai
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {info.components.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">Belum ada tugas/ujian</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
