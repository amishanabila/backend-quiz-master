const db = require('../config/db');

// Helper function to generate 6 digit PIN
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to check if PIN exists
async function isPinExists(pin) {
  const [result] = await db.query('SELECT quiz_id FROM quiz WHERE pin_code = ?', [pin]);
  return result.length > 0;
}

const quizController = {
  // Generate PIN for new quiz
  async generatePin(req, res) {
    try {
      const { judul, deskripsi, kumpulan_soal_id, user_id, durasi, tanggal_mulai, tanggal_selesai } = req.body;

      // Validasi input
      if (!judul || !kumpulan_soal_id || !user_id || !durasi || !tanggal_mulai || !tanggal_selesai) {
        return res.status(400).json({
          status: 'error',
          message: 'Semua field wajib diisi (judul, kumpulan_soal_id, user_id, durasi, tanggal_mulai, tanggal_selesai)'
        });
      }

      // Generate unique PIN
      let pin;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        pin = generatePin();
        attempts++;
        if (attempts > maxAttempts) {
          return res.status(500).json({
            status: 'error',
            message: 'Gagal membuat PIN unik, silakan coba lagi'
          });
        }
      } while (await isPinExists(pin));

      // Create quiz with PIN
      const [result] = await db.query(
        `INSERT INTO quiz 
         (judul, deskripsi, kumpulan_soal_id, created_by, pin_code, durasi, tanggal_mulai, tanggal_selesai, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [judul, deskripsi, kumpulan_soal_id, user_id, pin, durasi, tanggal_mulai, tanggal_selesai]
      );

      res.json({
        status: 'success',
        data: {
          quiz_id: result.insertId,
          pin_code: pin,
          judul,
          message: 'Quiz berhasil dibuat dengan PIN'
        }
      });
    } catch (error) {
      console.error('Error generating PIN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat membuat quiz'
      });
    }
  },

  // Validate PIN and get quiz info (PIN selalu aktif selama soal ada)
  async validatePin(req, res) {
    try {
      console.log('📍 validatePin called with body:', req.body);
      const { pin } = req.body;

      // Validasi format PIN
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        console.log('❌ Invalid PIN format:', pin);
        return res.status(400).json({
          status: 'error',
          message: 'PIN harus 6 digit angka'
        });
      }

      console.log('🔍 Searching for PIN:', pin);

      // Raw SQL query to validate PIN
      const query = `SELECT kumpulan_soal_id, judul, kategori_id, materi_id, pin_code, 
                     waktu_per_soal, waktu_keseluruhan, tipe_waktu, created_by 
                     FROM kumpulan_soal WHERE pin_code = ? LIMIT 1`;
      const [rows] = await db.query(query, [pin]);
      
      let result;
      if (!rows || rows.length === 0) {
        result = [];
      } else {
        const ks = rows[0];
            
        // Count soal
        const [countResult] = await db.query(
          'SELECT COUNT(*) as cnt FROM soal WHERE kumpulan_soal_id = ?',
          [ks.kumpulan_soal_id]
        );
        
        const jumlahSoal = countResult && countResult.length > 0 ? countResult[0].cnt : 0;
        
        result = [{
          kumpulan_soal_id: ks.kumpulan_soal_id,
          judul: ks.judul,
          kategori: null,
          materi: null,
          jumlah_soal: jumlahSoal,
          waktu_per_soal: ks.waktu_per_soal || 0,
          waktu_keseluruhan: ks.waktu_keseluruhan || 0,
          tipe_waktu: ks.tipe_waktu || 'per_soal',
          created_by: ks.created_by,
          pin_code: ks.pin_code
        }];
      }

      console.log('📦 Found kumpulan_soal:', result.length);

      if (result.length === 0) {
        console.log('❌ PIN not found in database');
        return res.status(404).json({
          status: 'error',
          message: 'PIN tidak valid. Pastikan PIN yang Anda masukkan benar.'
        });
      }

      const ks = result[0];
      console.log('✅ Kumpulan soal found:', ks.kumpulan_soal_id, '- Jumlah soal:', ks.jumlah_soal);

      // Cek apakah ada soal di kumpulan ini
      if (ks.jumlah_soal === 0 || ks.jumlah_soal === null) {
        console.log('⚠️ No soal in this kumpulan');
        return res.status(400).json({
          status: 'error',
          message: 'Belum ada soal dalam kumpulan ini. Silakan hubungi kreator.'
        });
      }

      const responseData = {
        status: 'success',
        message: 'PIN valid. Quiz siap dimulai.',
        data: {
          kumpulan_soal_id: ks.kumpulan_soal_id,
          judul: ks.judul,
          kategori: ks.kategori,
          materi: ks.materi,
          jumlah_soal: ks.jumlah_soal,
          waktu_per_soal: ks.waktu_per_soal,
          waktu_keseluruhan: ks.waktu_keseluruhan,
          tipe_waktu: ks.tipe_waktu,
          created_by: ks.created_by,
          pin_code: ks.pin_code
        }
      };

      console.log('✅ Sending success response');
      res.json(responseData);
    } catch (error) {
      console.error('❌ Error validating PIN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat memvalidasi PIN'
      });
    }
  },

  // Start a new quiz (untuk peserta) - dengan session tracking
  async startQuiz(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { kumpulan_soal_id, nama_peserta, pin_code } = req.body;

      // Validasi input
      if (!kumpulan_soal_id || !nama_peserta) {
        return res.status(400).json({
          status: 'error',
          message: 'Kumpulan soal ID dan nama peserta wajib diisi'
        });
      }

      await connection.beginTransaction();

      // Check if session already exists (termasuk session yang is_active = FALSE)
      const [existingSession] = await connection.query(
        `SELECT * FROM quiz_session 
         WHERE nama_peserta = ? AND kumpulan_soal_id = ? AND pin_code = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [nama_peserta, kumpulan_soal_id, pin_code]
      );

      let sessionData;
      const serverTime = new Date();

      if (existingSession.length > 0) {
        // Session sudah ada
        sessionData = existingSession[0];
        const existingWaktuBatas = new Date(sessionData.waktu_batas);
        
        // Jika session tidak aktif atau waktu habis, hapus session lama agar bisa buat baru
        if (!sessionData.is_active || serverTime > existingWaktuBatas) {
          // Delete old session completely to avoid unique constraint issue
          await connection.query(
            'DELETE FROM quiz_session WHERE session_id = ?',
            [sessionData.session_id]
          );
          
          // Flow will continue to create new session below
          console.log('🗑️  Old session deleted, creating new session');
        } else {
          // Session masih aktif dan valid, return data yang ada
          const sisaWaktu = Math.floor((existingWaktuBatas - serverTime) / 1000); // dalam detik

          // Get soal
          const [soal] = await connection.query(
            `SELECT soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, variasi_jawaban 
             FROM soal 
             WHERE kumpulan_soal_id = ?
             ORDER BY soal_id`,
            [kumpulan_soal_id]
          );

          await connection.commit();

          return res.json({
            status: 'success',
            message: 'Melanjutkan quiz yang sedang berjalan',
            data: {
              session_id: sessionData.session_id,
              soal: soal,
              waktu_mulai: sessionData.waktu_mulai,
              waktu_batas: sessionData.waktu_batas,
              sisa_waktu: sisaWaktu,
              current_soal_index: sessionData.current_soal_index,
              server_time: serverTime.toISOString(),
              is_resume: true
            }
          });
        }
      }

      // Buat session baru
      // Get info kumpulan_soal untuk hitung waktu
      const [kumpulanSoal] = await connection.query(
        `SELECT jumlah_soal, waktu_per_soal, waktu_keseluruhan, tipe_waktu 
         FROM kumpulan_soal 
         WHERE kumpulan_soal_id = ?`,
        [kumpulan_soal_id]
      );

      if (kumpulanSoal.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Kumpulan soal tidak ditemukan'
        });
      }

      const ks = kumpulanSoal[0];

      // Hitung waktu batas berdasarkan tipe waktu
      let totalWaktuDetik;
      if (ks.tipe_waktu === 'keseluruhan' && ks.waktu_keseluruhan) {
        totalWaktuDetik = ks.waktu_keseluruhan;
      } else {
        // Default: waktu per soal * jumlah soal
        totalWaktuDetik = ks.waktu_per_soal * ks.jumlah_soal;
      }

      const waktuMulai = new Date();
      const waktuBatas = new Date(waktuMulai.getTime() + (totalWaktuDetik * 1000));

      // Create quiz session
      const [sessionResult] = await connection.query(
        `INSERT INTO quiz_session 
         (nama_peserta, kumpulan_soal_id, pin_code, waktu_mulai, waktu_batas, current_soal_index, is_active) 
         VALUES (?, ?, ?, ?, ?, 0, TRUE)`,
        [nama_peserta, kumpulan_soal_id, pin_code, waktuMulai, waktuBatas]
      );

      const sessionId = sessionResult.insertId;

      // Get soal
      const [soal] = await connection.query(
        `SELECT soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar, variasi_jawaban 
         FROM soal 
         WHERE kumpulan_soal_id = ?
         ORDER BY soal_id`,
        [kumpulan_soal_id]
      );

      if (soal.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Tidak ada soal tersedia untuk kumpulan soal ini'
        });
      }

      await connection.commit();

      res.json({
        status: 'success',
        message: 'Quiz berhasil dimulai',
        data: {
          session_id: sessionId,
          soal: soal,
          waktu_mulai: waktuMulai.toISOString(),
          waktu_batas: waktuBatas.toISOString(),
          total_waktu: totalWaktuDetik,
          sisa_waktu: totalWaktuDetik,
          tipe_waktu: ks.tipe_waktu,
          waktu_per_soal: ks.waktu_per_soal,
          server_time: serverTime.toISOString(),
          is_resume: false
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error starting quiz:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat memulai quiz'
      });
    } finally {
      connection.release();
    }
  },

  // Get remaining time for active session
  async getRemainingTime(req, res) {
    try {
      const { session_id } = req.params;

      const [session] = await db.query(
        `SELECT * FROM quiz_session WHERE session_id = ? AND is_active = TRUE`,
        [session_id]
      );

      if (session.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Session tidak ditemukan atau sudah tidak aktif'
        });
      }

      const sessionData = session[0];
      const serverTime = new Date();
      const waktuBatas = new Date(sessionData.waktu_batas);
      const sisaWaktu = Math.floor((waktuBatas - serverTime) / 1000);

      if (sisaWaktu <= 0) {
        // Waktu habis, update session
        await db.query(
          'UPDATE quiz_session SET is_active = FALSE, waktu_selesai = ? WHERE session_id = ?',
          [serverTime, session_id]
        );

        return res.json({
          status: 'success',
          data: {
            sisa_waktu: 0,
            time_expired: true,
            server_time: serverTime.toISOString()
          }
        });
      }

      res.json({
        status: 'success',
        data: {
          sisa_waktu: sisaWaktu,
          time_expired: false,
          waktu_batas: sessionData.waktu_batas,
          server_time: serverTime.toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting remaining time:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil sisa waktu'
      });
    }
  },

  // Update current soal index (tracking progress)
  async updateProgress(req, res) {
    try {
      const { session_id } = req.params;
      const { current_soal_index } = req.body;

      await db.query(
        'UPDATE quiz_session SET current_soal_index = ? WHERE session_id = ?',
        [current_soal_index, session_id]
      );

      res.json({
        status: 'success',
        message: 'Progress berhasil disimpan'
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menyimpan progress'
      });
    }
  },

  // Submit quiz answers
  async submitQuiz(req, res) {
    try {
      const { hasilId } = req.params;
      const { jawaban, waktu_selesai } = req.body;

      // Get correct answers
      const answeredSoalIds = Object.keys(jawaban);
      const [soal] = await db.query(
        'SELECT soal_id, jawaban_benar FROM soal WHERE soal_id IN (?)',
        [answeredSoalIds]
      );

      // Calculate score
      let totalBenar = 0;
      soal.forEach(s => {
        if (jawaban[s.soal_id] === s.jawaban_benar) {
          totalBenar++;
        }
      });

      const skor = Math.round((totalBenar / soal.length) * 100);

      // Update hasil_quiz dengan data lengkap
      await db.query(
        'UPDATE hasil_quiz SET skor = ?, jawaban_benar = ?, waktu_selesai = ?, completed_at = NOW() WHERE hasil_id = ?',
        [skor, totalBenar, waktu_selesai, hasilId]
      );

      res.json({
        status: 'success',
        data: {
          skor,
          jawaban_benar: totalBenar,
          total_soal: soal.length
        }
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengirim jawaban quiz'
      });
    }
  },

  // Submit quiz result directly (simplified endpoint) - dengan session validation
  async submitQuizResult(req, res) {
    const connection = await db.getConnection();
    
    try {
      console.log('📥 Received quiz submission request:', {
        session_id: req.body.session_id,
        nama_peserta: req.body.nama_peserta,
        kumpulan_soal_id: req.body.kumpulan_soal_id,
        skor: req.body.skor,
        jawaban_benar: req.body.jawaban_benar,
        total_soal: req.body.total_soal,
        waktu_pengerjaan: req.body.waktu_pengerjaan, // 🔥 Added for debug
        pin_code: req.body.pin_code,
        jawaban_detail_count: req.body.jawaban_detail?.length || 0
      });
      
      const { session_id, nama_peserta, kumpulan_soal_id, skor, jawaban_benar, total_soal, waktu_pengerjaan, pin_code, jawaban_detail } = req.body;
      
      // 🔥 CRITICAL DEBUG: Check waktu_pengerjaan value
      console.log('🔍 DEBUG waktu_pengerjaan:', {
        type: typeof waktu_pengerjaan,
        value: waktu_pengerjaan,
        isNull: waktu_pengerjaan === null,
        isUndefined: waktu_pengerjaan === undefined,
        isNumber: !isNaN(waktu_pengerjaan)
      });

      // Validasi input
      if (!nama_peserta || !kumpulan_soal_id || skor === undefined) {
        console.log('❌ Validation failed: Missing required fields');
        return res.status(400).json({
          status: 'error',
          message: 'Data tidak lengkap'
        });
      }

      // Start transaction
      await connection.beginTransaction();

      try {
        // Validate session jika ada
        if (session_id) {
          const [session] = await connection.query(
            'SELECT * FROM quiz_session WHERE session_id = ?',
            [session_id]
          );

          if (session.length > 0) {
            const sessionData = session[0];
            const waktuBatas = new Date(sessionData.waktu_batas);
            const serverTime = new Date();

            // Cek apakah submit masih dalam batas waktu
            if (serverTime > waktuBatas) {
              await connection.rollback();
              return res.status(400).json({
                status: 'error',
                message: 'Waktu pengerjaan sudah habis',
                timeExpired: true
              });
            }

            // Update session menjadi tidak aktif
            await connection.query(
              'UPDATE quiz_session SET is_active = FALSE, waktu_selesai = NOW() WHERE session_id = ?',
              [session_id]
            );
          }
        }

        // Insert hasil quiz langsung tanpa stored procedure
        const [insertResult] = await connection.query(
          `INSERT INTO hasil_quiz 
           (session_id, nama_peserta, kumpulan_soal_id, skor, jawaban_benar, total_soal, waktu_pengerjaan, pin_code, completed_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [session_id || null, nama_peserta, kumpulan_soal_id, skor, jawaban_benar, total_soal, waktu_pengerjaan || 0, pin_code]
        );

        const hasil_id = insertResult.insertId;

        console.log('✅ Quiz result saved to database:', {
          hasil_id,
          session_id,
          nama_peserta,
          skor,
          jawaban_benar,
          total_soal
        });

        // Insert user_answers if provided
        if (jawaban_detail && Array.isArray(jawaban_detail) && jawaban_detail.length > 0) {
          for (const jawab of jawaban_detail) {
            await connection.query(
              `INSERT INTO user_answers (hasil_id, soal_id, jawaban, is_correct) 
               VALUES (?, ?, ?, ?)`,
              [hasil_id, jawab.soal_id, jawab.jawaban, jawab.is_correct]
            );
          }
          console.log('✅ User answers saved:', jawaban_detail.length, 'answers');
        }

        // Commit transaction
        await connection.commit();

        res.json({
          status: 'success',
          message: 'Hasil quiz berhasil disimpan',
          data: {
            hasil_id,
            skor,
            jawaban_benar,
            total_soal
          }
        });
      } catch (error) {
        // Rollback on error
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error submitting quiz result:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menyimpan hasil quiz'
      });
    } finally {
      connection.release();
    }
  },

  // Get quiz results
  async getQuizResults(req, res) {
    try {
      const { hasilId } = req.params;

      const [hasil] = await db.query(
        `SELECT hq.*, k.nama_kategori, m.judul as materi_judul
         FROM hasil_quiz hq 
         LEFT JOIN kumpulan_soal ks ON hq.kumpulan_soal_id = ks.kumpulan_soal_id
         LEFT JOIN kategori k ON ks.kategori_id = k.id 
         LEFT JOIN materi m ON ks.materi_id = m.materi_id
         WHERE hq.hasil_id = ?`,
        [hasilId]
      );

      if (hasil.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Hasil quiz tidak ditemukan'
        });
      }

      res.json({
        status: 'success',
        data: hasil[0]
      });
    } catch (error) {
      console.error('Error getting quiz results:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil hasil quiz'
      });
    }
  }
};

module.exports = quizController;