const db = require('../config/db');

// Get leaderboard data - MUST filter by created_by for data isolation
exports.getLeaderboard = async (req, res) => {
  try {
    const { kategori_id, materi_id, kumpulan_soal_id, created_by } = req.query;
    
    console.log('📊 getLeaderboard called with filters:', { kategori_id, materi_id, kumpulan_soal_id, created_by });

    // 🔒 SECURITY: created_by is REQUIRED to prevent data leakage between creators
    if (!created_by) {
      return res.status(400).json({
        status: 'error',
        message: 'created_by parameter is required for data security'
      });
    }

    // Updated SQL query - Include detail fields for frontend display
    let query = `
      SELECT 
        hq.hasil_id,
        hq.nama_peserta,
        hq.skor,
        hq.jawaban_benar,
        hq.total_soal,
        hq.waktu_pengerjaan,
        hq.completed_at,
        hq.pin_code,
        k.nama_kategori as kategori,
        m.judul as materi,
        ks.judul as kumpulan_soal_judul
      FROM hasil_quiz hq
      JOIN kumpulan_soal ks ON hq.kumpulan_soal_id = ks.kumpulan_soal_id
      LEFT JOIN kategori k ON ks.kategori_id = k.id
      LEFT JOIN materi m ON ks.materi_id = m.materi_id
      WHERE hq.completed_at IS NOT NULL
        AND ks.created_by = ?
    `;
    
    const params = [created_by];
    console.log('🔒 Filtering leaderboard by created_by:', created_by);
    
    // Filter by kategori_id
    if (kategori_id) {
      query += ' AND ks.kategori_id = ?';
      params.push(kategori_id);
    }
    
    // Filter by materi_id
    if (materi_id) {
      query += ' AND ks.materi_id = ?';
      params.push(materi_id);
    }
    
    // Filter by kumpulan_soal_id
    if (kumpulan_soal_id) {
      query += ' AND hq.kumpulan_soal_id = ?';
      params.push(kumpulan_soal_id);
    }
    
    query += `
      ORDER BY hq.skor DESC, hq.jawaban_benar DESC, hq.waktu_pengerjaan ASC
      LIMIT 100
    `;
    
    const [rows] = await db.query(query, params);
    const results = rows || [];

    console.log('✅ Found', results.length, 'leaderboard entries');

    res.json({
      status: 'success',
      data: results,
      filters: {
        kategori_id: kategori_id || null,
        materi_id: materi_id || null,
        kumpulan_soal_id: kumpulan_soal_id || null,
        created_by: created_by || null
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil data leaderboard'
    });
  }
};

// Get kategori list with quiz count - FILTERED BY CREATOR
exports.getKategoriWithStats = async (req, res) => {
  try {
    const { created_by } = req.query;
    
    console.log('📋 getKategoriWithStats - created_by:', created_by);
    
    if (!created_by) {
      return res.status(400).json({
        status: 'error',
        message: 'created_by parameter is required'
      });
    }
    
    const [results] = await db.query(`
      SELECT 
        k.id as kategori_id,
        k.nama_kategori,
        COUNT(DISTINCT ks.kumpulan_soal_id) as total_kumpulan_soal,
        COUNT(DISTINCT ha.hasil_id) as total_hasil
      FROM kategori k
      LEFT JOIN kumpulan_soal ks ON k.id = ks.kategori_id AND ks.created_by = ?
      LEFT JOIN hasil_quiz ha ON ks.kumpulan_soal_id = ha.kumpulan_soal_id
      GROUP BY k.id, k.nama_kategori
      HAVING total_kumpulan_soal > 0
      ORDER BY k.nama_kategori ASC
    `, [created_by]);

    res.json({
      status: 'success',
      data: results
    });
  } catch (error) {
    console.error('Error fetching kategori stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil data kategori'
    });
  }
};

// Get materi list by kategori with quiz count - FILTERED BY CREATOR
exports.getMateriByKategori = async (req, res) => {
  try {
    const { kategori_id, created_by } = req.query;
    
    console.log('📋 getMateriByKategori - created_by:', created_by, 'kategori_id:', kategori_id);
    
    if (!created_by) {
      return res.status(400).json({
        status: 'error',
        message: 'created_by parameter is required'
      });
    }
    
    let query = `
      SELECT 
        m.materi_id,
        m.judul,
        k.nama_kategori,
        k.id as kategori_id,
        COUNT(DISTINCT ks.kumpulan_soal_id) as total_kumpulan_soal,
        COUNT(DISTINCT ha.hasil_id) as total_hasil
      FROM materi m
      JOIN kategori k ON m.kategori_id = k.id
      LEFT JOIN kumpulan_soal ks ON m.materi_id = ks.materi_id AND ks.created_by = ?
      LEFT JOIN hasil_quiz ha ON ks.kumpulan_soal_id = ha.kumpulan_soal_id
    `;

    const params = [created_by];

    if (kategori_id) {
      query += ` WHERE k.id = ?`;
      params.push(kategori_id);
    }

    query += `
      GROUP BY m.materi_id, m.judul, k.nama_kategori, k.id
      HAVING total_kumpulan_soal > 0
      ORDER BY m.judul ASC
    `;

    const [results] = await db.query(query, params);

    res.json({
      status: 'success',
      data: results
    });
  } catch (error) {
    console.error('Error fetching materi by kategori:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil data materi'
    });
  }
};

// Reset leaderboard (delete all data from hasil_quiz)
exports.resetLeaderboard = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM hasil_quiz');

    res.json({
      status: 'success',
      message: 'Leaderboard berhasil direset',
      data: {
        deletedRows: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mereset leaderboard'
    });
  }
};

// Reset leaderboard untuk kumpulan soal tertentu (kreator only)
exports.resetLeaderboardByKumpulanSoal = async (req, res) => {
  try {
    const { kumpulan_soal_id } = req.params;
    const userId = req.user.userId || req.user.id;

    // Verify kreator owns this kumpulan_soal
    const [kumpulanSoal] = await db.query(
      'SELECT created_by FROM kumpulan_soal WHERE kumpulan_soal_id = ?',
      [kumpulan_soal_id]
    );

    if (kumpulanSoal.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Kumpulan soal tidak ditemukan'
      });
    }

    if (kumpulanSoal[0].created_by !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses untuk reset leaderboard ini'
      });
    }

    // Delete quiz_session (akan cascade delete hasil_quiz & user_answers)
    const [deleteResult] = await db.query(
      'DELETE FROM quiz_session WHERE kumpulan_soal_id = ?',
      [kumpulan_soal_id]
    );

    res.json({
      status: 'success',
      message: `Leaderboard berhasil direset. ${deleteResult.affectedRows} session dihapus.`,
      data: {
        sessions_deleted: deleteResult.affectedRows
      }
    });
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat reset leaderboard'
    });
  }
};

// Reset ALL leaderboard for kreator's own quizzes (kreator only)
exports.resetLeaderboardByCreator = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    console.log('🗑️ Kreator resetting all their leaderboard data. User ID:', userId);

    // Delete all quiz_session for this kreator's kumpulan_soal (cascade delete hasil_quiz & user_answers)
    const [deleteResult] = await db.query(
      `DELETE qs FROM quiz_session qs
       INNER JOIN kumpulan_soal ks ON qs.kumpulan_soal_id = ks.kumpulan_soal_id
       WHERE ks.created_by = ?`,
      [userId]
    );

    console.log('✅ Deleted sessions:', deleteResult.affectedRows);

    res.json({
      status: 'success',
      message: `Semua leaderboard Anda berhasil direset. ${deleteResult.affectedRows} session dihapus.`,
      data: {
        sessions_deleted: deleteResult.affectedRows
      }
    });
  } catch (error) {
    console.error('❌ Error resetting kreator leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat reset leaderboard'
    });
  }
};

// Get quiz sessions dengan info lengkap untuk admin/kreator
exports.getQuizSessions = async (req, res) => {
  try {
    const { kumpulan_soal_id, created_by } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId || req.user.id;

    let query = `
      SELECT 
        qs.session_id,
        qs.nama_peserta,
        qs.email_peserta,
        qs.kumpulan_soal_id,
        ks.judul as kumpulan_soal_judul,
        ks.pin_code,
        qs.waktu_mulai,
        qs.waktu_selesai,
        qs.waktu_batas,
        qs.is_active,
        hq.hasil_id,
        hq.skor,
        hq.jawaban_benar,
        hq.total_soal,
        hq.completed_at,
        u.nama as nama_kreator,
        u.email as email_kreator
      FROM quiz_session qs
      LEFT JOIN kumpulan_soal ks ON qs.kumpulan_soal_id = ks.kumpulan_soal_id
      LEFT JOIN hasil_quiz hq ON qs.session_id = hq.session_id
      LEFT JOIN users u ON ks.created_by = u.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by kumpulan_soal_id
    if (kumpulan_soal_id) {
      query += ' AND qs.kumpulan_soal_id = ?';
      params.push(kumpulan_soal_id);
    }

    // Kreator only see their own data
    if (userRole === 'kreator') {
      query += ' AND ks.created_by = ?';
      params.push(userId);
    }

    // Admin can filter by creator
    if (userRole === 'admin' && created_by) {
      query += ' AND ks.created_by = ?';
      params.push(created_by);
    }

    query += ' ORDER BY qs.created_at DESC LIMIT 100';

    const [sessions] = await db.query(query, params);

    res.json({
      status: 'success',
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching quiz sessions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil data quiz session'
    });
  }
};
