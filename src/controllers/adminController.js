const db = require('../config/db');

// Get system overview statistics
const getSystemOverview = async (req, res) => {
  try {
    // Query manual tanpa stored procedure
    console.log('🔍 Fetching system overview...');
    
    const [adminCount] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = "admin"');
    console.log('👤 Admin count:', adminCount[0]?.total);
    
    const [kreatorCount] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = "kreator"');
    console.log('📝 Kreator count:', kreatorCount[0]?.total);
    
    const [pesertaCount] = await db.query('SELECT COUNT(DISTINCT nama_peserta) as total FROM quiz_session');
    console.log('👥 Peserta count:', pesertaCount[0]?.total);
    
    const [soalCount] = await db.query('SELECT COUNT(*) as total FROM soal');
    console.log('❓ Soal count:', soalCount[0]?.total);
    
    const [quizCount] = await db.query('SELECT COUNT(*) as total FROM hasil_quiz WHERE completed_at IS NOT NULL');
    console.log('✅ Quiz selesai count:', quizCount[0]?.total);
    
    const [kategoriCount] = await db.query('SELECT COUNT(*) as total FROM kategori');
    console.log('📚 Kategori count:', kategoriCount[0]?.total);
    
    const [kumpulanSoalCount] = await db.query('SELECT COUNT(*) as total FROM kumpulan_soal');
    console.log('📦 Kumpulan soal count:', kumpulanSoalCount[0]?.total);

    const responseData = {
      success: true,
      data: {
        overview: {
          total_admin: adminCount[0]?.total || 0,
          total_kreator: kreatorCount[0]?.total || 0,
          total_unique_peserta: pesertaCount[0]?.total || 0,
          total_peserta: pesertaCount[0]?.total || 0,
          total_soal: soalCount[0]?.total || 0,
          total_quiz_selesai: quizCount[0]?.total || 0,
          total_quiz_completed: quizCount[0]?.total || 0,
          total_kategori: kategoriCount[0]?.total || 0,
          total_kumpulan_soal: kumpulanSoalCount[0]?.total || 0
        }
      }
    };
    
    console.log('✅ System overview response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error getting system overview:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil statistik sistem',
      error: error.message
    });
  }
};

// Get health check results
const getHealthCheck = async (req, res) => {
  try {
    const checks = [];
    
    // Database connection check
    try {
      await db.query('SELECT 1');
      checks.push({
        check_name: 'Database Connection',
        status: 'OK',
        message: 'Database terhubung dengan baik'
      });
    } catch (err) {
      checks.push({
        check_name: 'Database Connection',
        status: 'ERROR',
        message: err.message
      });
    }

    // Check tables exist
    try {
      const [tables] = await db.query('SHOW TABLES');
      checks.push({
        check_name: 'Database Tables',
        status: 'OK',
        message: `${tables.length} tables found`
      });
    } catch (err) {
      checks.push({
        check_name: 'Database Tables',
        status: 'ERROR',
        message: err.message
      });
    }

    res.json({
      success: true,
      data: checks
    });
  } catch (error) {
    console.error('❌ Error getting health check:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat health check',
      error: error.message
    });
  }
};

// Get quiz activity - agregasi per kumpulan soal
const getQuizActivity = async (req, res) => {
  try {
    const { days = 30, limit = 100 } = req.query;
    
    const [results] = await db.query(
      `SELECT 
        ks.kumpulan_soal_id,
        ks.judul as kumpulan_soal_judul,
        u.nama as created_by_name,
        u.email as created_by_email,
        COUNT(DISTINCT hq.nama_peserta) as total_peserta,
        AVG(hq.skor) as rata_rata_skor,
        ks.created_at
      FROM kumpulan_soal ks
      LEFT JOIN hasil_quiz hq ON ks.kumpulan_soal_id = hq.kumpulan_soal_id 
        AND hq.completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      LEFT JOIN users u ON ks.created_by = u.id
      GROUP BY ks.kumpulan_soal_id, ks.judul, u.nama, u.email, ks.created_at
      HAVING total_peserta > 0 OR ks.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY ks.created_at DESC
      LIMIT ?`,
      [parseInt(days), parseInt(days), parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: results || []
    });
  } catch (error) {
    console.error('Error getting quiz activity:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil aktivitas quiz',
      error: error.message
    });
  }
};

// Export users data
const exportUsers = async (req, res) => {
  try {
    console.log('📔 Exporting users...');
    const [results] = await db.query(
      'SELECT id, nama, email, role, is_verified, created_at FROM users ORDER BY created_at DESC'
    );
    
    console.log(`✅ Exported ${results?.length || 0} users`);
    res.json({
      success: true,
      status: 'success',
      data: results || []
    });
  } catch (error) {
    console.error('❌ Error exporting users:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat export users',
      error: error.message
    });
  }
};

// Export hasil quiz data
const exportHasilQuiz = async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT 
        hq.hasil_id,
        hq.nama_peserta,
        hq.skor,
        hq.jawaban_benar,
        hq.total_soal,
        hq.waktu_pengerjaan,
        hq.completed_at,
        ks.judul as kumpulan_soal_judul,
        ks.pin_code,
        k.nama_kategori,
        m.judul as materi,
        u.nama as created_by_kreator
      FROM hasil_quiz hq
      JOIN kumpulan_soal ks ON hq.kumpulan_soal_id = ks.kumpulan_soal_id
      JOIN kategori k ON ks.kategori_id = k.id
      LEFT JOIN materi m ON ks.materi_id = m.materi_id
      LEFT JOIN users u ON ks.created_by = u.id
      WHERE hq.completed_at IS NOT NULL
      ORDER BY hq.completed_at DESC`
    );
    
    res.json({
      success: true,
      data: results || []
    });
  } catch (error) {
    console.error('❌ Error exporting hasil quiz:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat export hasil quiz',
      error: error.message
    });
  }
};

// Export soal data
const exportSoal = async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT 
        s.soal_id,
        s.pertanyaan,
        s.pilihan_a,
        s.pilihan_b,
        s.pilihan_c,
        s.pilihan_d,
        s.pilihan_e,
        s.jawaban_benar,
        s.variasi_jawaban,
        ks.judul as kumpulan_soal_judul,
        k.nama_kategori,
        m.judul as materi,
        u.nama as created_by_name,
        s.created_at
      FROM soal s
      JOIN kumpulan_soal ks ON s.kumpulan_soal_id = ks.kumpulan_soal_id
      JOIN kategori k ON ks.kategori_id = k.id
      LEFT JOIN materi m ON ks.materi_id = m.materi_id
      LEFT JOIN users u ON ks.created_by = u.id
      ORDER BY s.created_at DESC`
    );
    
    res.json({
      success: true,
      data: results || []
    });
  } catch (error) {
    console.error('❌ Error exporting soal:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat export soal',
      error: error.message
    });
  }
};

// Get backup info
const getBackupInfo = async (req, res) => {
  try {
    const [tables] = await db.query('SHOW TABLES');
    const [users] = await db.query('SELECT COUNT(*) as total FROM users');
    const [soal] = await db.query('SELECT COUNT(*) as total FROM soal');
    const [hasil] = await db.query('SELECT COUNT(*) as total FROM hasil_quiz');
    
    res.json({
      success: true,
      data: {
        total_tables: tables.length,
        total_users: users[0].total,
        total_soal: soal[0].total,
        total_hasil_quiz: hasil[0].total,
        last_backup: null,
        backup_status: 'Manual backup recommended'
      }
    });
  } catch (error) {
    console.error('Error getting backup info:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil info backup',
      error: error.message
    });
  }
};

// Get all users with statistics (including peserta from quiz_session)
const getAllUsers = async (req, res) => {
  try {
    console.log('📊 Getting all users including peserta...');
    
    // Get registered users (Admin + Kreator)
    const [users] = await db.query(
      `SELECT 
        u.id,
        u.nama,
        u.email,
        u.role,
        u.is_verified,
        u.created_at,
        COUNT(DISTINCT ks.kumpulan_soal_id) as total_kumpulan_soal
      FROM users u
      LEFT JOIN kumpulan_soal ks ON u.id = ks.created_by
      GROUP BY u.id, u.nama, u.email, u.role, u.is_verified, u.created_at
      ORDER BY u.created_at DESC`
    );
    
    // Get unique peserta from quiz_session
    const [peserta] = await db.query(
      `SELECT DISTINCT
        NULL as id,
        qs.nama_peserta as nama,
        '-' as email,
        'peserta' as role,
        1 as is_verified,
        MIN(qs.created_at) as created_at,
        COUNT(DISTINCT qs.kumpulan_soal_id) as total_kumpulan_soal
      FROM quiz_session qs
      WHERE qs.nama_peserta IS NOT NULL AND qs.nama_peserta != ''
      GROUP BY qs.nama_peserta
      ORDER BY MIN(qs.created_at) DESC`
    );
    
    // Combine both lists
    const allUsers = [...users, ...(peserta || [])];
    
    console.log(`✅ Found ${users?.length || 0} registered users (Admin + Kreator)`);
    console.log(`✅ Found ${peserta?.length || 0} unique peserta`);
    console.log(`✅ Total ${allUsers.length} users`);
    
    res.json({
      success: true,
      status: 'success',
      data: allUsers || []
    });
  } catch (error) {
    console.error('❌ Error getting all users:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil data users',
      error: error.message
    });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    
    if (!userId || !newRole) {
      return res.status(400).json({
        success: false,
        message: 'User ID dan role baru harus diisi'
      });
    }

    if (!['admin', 'kreator', 'peserta'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role tidak valid. Harus admin, kreator, atau peserta'
      });
    }

    await db.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [newRole, userId]
    );
    
    res.json({
      success: true,
      message: 'Role user berhasil diupdate'
    });
  } catch (error) {
    console.error('❌ Error updating user role:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat update role user',
      error: error.message
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID harus diisi'
      });
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({
      success: true,
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Terjadi kesalahan saat menghapus user',
      error: error.message
    });
  }
};

// Fix missing creators (assign orphaned data to default kreator)
const fixMissingCreators = async (req, res) => {
  try {
    // Find first kreator to assign orphaned data
    const [kreator] = await db.query(
      "SELECT id FROM users WHERE role = 'kreator' LIMIT 1"
    );
    
    if (kreator.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada kreator untuk assign data'
      });
    }
    
    const kreatorId = kreator[0].id;
    
    // Update kumpulan_soal without creator
    await db.query(
      'UPDATE kumpulan_soal SET created_by = ? WHERE created_by IS NULL',
      [kreatorId]
    );
    
    res.json({
      success: true,
      message: 'Data creator berhasil diperbaiki',
      data: { assigned_to: kreatorId }
    });
  } catch (error) {
    console.error('Error fixing missing creators:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbaiki data creator',
      error: error.message
    });
  }
};

// Get orphaned data (data without valid creator)
const getOrphanedData = async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT 
        ks.kumpulan_soal_id,
        ks.judul,
        ks.created_by,
        ks.created_at
      FROM kumpulan_soal ks
      LEFT JOIN users u ON ks.created_by = u.id
      WHERE u.id IS NULL
      ORDER BY ks.created_at DESC`
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error getting orphaned data:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data orphaned',
      error: error.message
    });
  }
};

module.exports = {
  getSystemOverview,
  getHealthCheck,
  getQuizActivity,
  exportUsers,
  exportHasilQuiz,
  exportSoal,
  getBackupInfo,
  getAllUsers,
  updateUserRole,
  deleteUser,
  fixMissingCreators,
  getOrphanedData
};
