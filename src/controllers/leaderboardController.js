const db = require('../config/db');

// Ensure we have a place to record leaderboard resets (soft reset markers)
const ensureLeaderboardResetTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS leaderboard_resets (
      reset_id INT AUTO_INCREMENT PRIMARY KEY,
      created_by INT NULL,
      kategori_id INT NULL,
      materi_id INT NULL,
      kumpulan_soal_id INT NULL,
      reset_scope VARCHAR(50) NOT NULL,
      reset_by INT NOT NULL,
      reset_role VARCHAR(20) NOT NULL,
      reset_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_by (created_by),
      INDEX idx_scope (reset_scope),
      INDEX idx_kategori (kategori_id),
      INDEX idx_materi (materi_id),
      INDEX idx_kumpulan (kumpulan_soal_id),
      INDEX idx_reset_at (reset_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

// Build correlated subquery that returns the latest reset timestamp affecting a quiz result
const buildResetCutoffSubquery = (hqAlias = 'hq', ksAlias = 'ks') => `
  SELECT MAX(lr.reset_at)
  FROM leaderboard_resets lr
  WHERE (lr.created_by IS NULL OR lr.created_by = ${ksAlias}.created_by)
    AND (lr.kumpulan_soal_id IS NULL OR lr.kumpulan_soal_id = ${hqAlias}.kumpulan_soal_id)
    AND (lr.materi_id IS NULL OR lr.materi_id = ${ksAlias}.materi_id)
    AND (lr.kategori_id IS NULL OR lr.kategori_id = ${ksAlias}.kategori_id)
`;

const getResetScopeLabel = (filters = {}) => {
  if (filters.kumpulan_soal_id) return 'kumpulan_soal';
  if (filters.materi_id) return 'materi';
  if (filters.kategori_id) return 'kategori';
  if (filters.created_by) return 'creator';
  return 'all';
};

const recordResetMarker = async ({ filters = {}, resetBy, resetRole }) => {
  await ensureLeaderboardResetTable();

  const scope = getResetScopeLabel(filters);

  await db.query(
    `INSERT INTO leaderboard_resets (created_by, kategori_id, materi_id, kumpulan_soal_id, reset_scope, reset_by, reset_role)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      filters.created_by || null,
      filters.kategori_id || null,
      filters.materi_id || null,
      filters.kumpulan_soal_id || null,
      scope,
      resetBy,
      resetRole || 'unknown'
    ]
  );

  return scope;
};

const buildLeaderboardFilter = (filters = {}, includeResetWindow = true) => {
  const clauses = ['hq.completed_at IS NOT NULL'];
  const params = [];

  if (filters.created_by) {
    clauses.push('ks.created_by = ?');
    params.push(filters.created_by);
  }

  if (filters.kategori_id) {
    clauses.push('ks.kategori_id = ?');
    params.push(filters.kategori_id);
  }

  if (filters.materi_id) {
    clauses.push('ks.materi_id = ?');
    params.push(filters.materi_id);
  }

  if (filters.kumpulan_soal_id) {
    clauses.push('hq.kumpulan_soal_id = ?');
    params.push(filters.kumpulan_soal_id);
  }

  if (includeResetWindow) {
    const cutoffSubquery = buildResetCutoffSubquery('hq', 'ks');
    clauses.push(`hq.completed_at > COALESCE((${cutoffSubquery}), '1970-01-01')`);
  }

  return { clauses, params };
};

const countVisibleLeaderboardRows = async (filters = {}) => {
  const { clauses, params } = buildLeaderboardFilter(filters, true);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT COUNT(*) as total
     FROM hasil_quiz hq
     JOIN kumpulan_soal ks ON hq.kumpulan_soal_id = ks.kumpulan_soal_id
     ${whereClause}`,
    params
  );

  return rows?.[0]?.total || 0;
};

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

    await ensureLeaderboardResetTable();

    const resetCutoffSubquery = buildResetCutoffSubquery('hq', 'ks');

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
        AND hq.completed_at > COALESCE((${resetCutoffSubquery}), '1970-01-01')
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

    console.log('✅ Found', results.length, 'leaderboard entries (after reset window)');

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

    await ensureLeaderboardResetTable();
    const resetCutoffSubquery = buildResetCutoffSubquery('ha', 'ks');
    
    const [results] = await db.query(`
      SELECT 
        k.id as kategori_id,
        k.nama_kategori,
        COUNT(DISTINCT ks.kumpulan_soal_id) as total_kumpulan_soal,
        COUNT(DISTINCT CASE 
          WHEN ha.completed_at IS NOT NULL 
            AND ha.completed_at > COALESCE((${resetCutoffSubquery}), '1970-01-01')
          THEN ha.hasil_id END
        ) as total_hasil
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
    
    await ensureLeaderboardResetTable();
    const resetCutoffSubquery = buildResetCutoffSubquery('ha', 'ks');

    let query = `
      SELECT 
        m.materi_id,
        m.judul,
        k.nama_kategori,
        k.id as kategori_id,
        COUNT(DISTINCT ks.kumpulan_soal_id) as total_kumpulan_soal,
        COUNT(DISTINCT CASE 
          WHEN ha.completed_at IS NOT NULL 
            AND ha.completed_at > COALESCE((${resetCutoffSubquery}), '1970-01-01')
          THEN ha.hasil_id END
        ) as total_hasil
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
    await ensureLeaderboardResetTable();

    const { kategori_id, materi_id, kumpulan_soal_id, created_by } = req.body || {};
    const filters = {
      kategori_id: kategori_id || null,
      materi_id: materi_id || null,
      kumpulan_soal_id: kumpulan_soal_id || null,
      created_by: created_by || null
    };

    const affected = await countVisibleLeaderboardRows(filters);
    const scope = await recordResetMarker({
      filters,
      resetBy: req.user?.id || req.user?.userId,
      resetRole: req.user?.role || 'admin'
    });

    res.json({
      status: 'success',
      message: 'Leaderboard berhasil dibersihkan. Data historis tetap aman.',
      data: {
        scope,
        hiddenRows: affected,
        filters
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
      'SELECT created_by, kategori_id, materi_id FROM kumpulan_soal WHERE kumpulan_soal_id = ?',
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

    await ensureLeaderboardResetTable();

    const filters = {
      created_by: userId,
      kumpulan_soal_id,
      kategori_id: kumpulanSoal[0].kategori_id || null,
      materi_id: kumpulanSoal[0].materi_id || null
    };

    const affected = await countVisibleLeaderboardRows(filters);
    const scope = await recordResetMarker({
      filters,
      resetBy: userId,
      resetRole: req.user?.role || 'kreator'
    });

    res.json({
      status: 'success',
      message: 'Leaderboard untuk kumpulan soal ini dibersihkan tanpa menghapus data historis.',
      data: {
        scope,
        hiddenRows: affected,
        filters
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
    await ensureLeaderboardResetTable();

    const { kategori_id, materi_id, kumpulan_soal_id } = req.body || {};

    const filters = {
      created_by: userId,
      kategori_id: kategori_id || null,
      materi_id: materi_id || null,
      kumpulan_soal_id: kumpulan_soal_id || null
    };

    const affected = await countVisibleLeaderboardRows(filters);
    const scope = await recordResetMarker({
      filters,
      resetBy: userId,
      resetRole: req.user?.role || 'kreator'
    });

    res.json({
      status: 'success',
      message: 'Leaderboard Anda dibersihkan sesuai filter. Data lama tetap tersimpan.',
      data: {
        scope,
        hiddenRows: affected,
        filters
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
