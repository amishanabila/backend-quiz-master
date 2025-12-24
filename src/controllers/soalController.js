const db = require('../config/db');

const soalController = {
  // Create kumpulan soal
  async createKumpulanSoal(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { kategori_id, soal_list, waktu_per_soal, waktu_keseluruhan, tipe_waktu, materi_id } = req.body;
      
      // 🔥 DEBUG: Log req.user untuk debugging
      console.log('🔍 DEBUG - req.user:', req.user);
      console.log('🔍 DEBUG - req.user.id:', req.user?.id);
      console.log('🔍 DEBUG - req.user.userId:', req.user?.userId);
      
      const created_by = req.user.id || req.user.userId; // From auth middleware
      const updated_by = req.user.id || req.user.userId;
      
      console.log('🔍 DEBUG - created_by value:', created_by);
      console.log('🔍 DEBUG - updated_by value:', updated_by);

      // Get judul from materi if materi_id is provided
      let judul = req.body.judul || null;
      if (materi_id && !judul) {
        const [materiRows] = await connection.query('SELECT judul FROM materi WHERE materi_id = ?', [materi_id]);
        if (materiRows.length > 0) {
          judul = materiRows[0].judul;
        }
      }

      // Start transaction
      await connection.beginTransaction();

      try {
        // 🔥 DEBUG: Log SQL parameters
        console.log('🔍 DEBUG - SQL INSERT parameters:', {
          judul,
          kategori_id,
          materi_id: materi_id || null,
          created_by,
          updated_by,
          waktu_per_soal: waktu_per_soal || 60,
          waktu_keseluruhan: waktu_keseluruhan || null,
          tipe_waktu: tipe_waktu || 'per_soal'
        });
        
        // Create kumpulan_soal entry dengan timing options
        const [kumpulanResult] = await connection.query(
          'INSERT INTO kumpulan_soal (judul, kategori_id, materi_id, created_by, updated_by, waktu_per_soal, waktu_keseluruhan, tipe_waktu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [judul, kategori_id, materi_id || null, created_by, updated_by, waktu_per_soal || 60, waktu_keseluruhan || null, tipe_waktu || 'per_soal']
        );
        
        console.log('✅ DEBUG - INSERT success, insertId:', kumpulanResult.insertId);

        const kumpulan_soal_id = kumpulanResult.insertId;

        // Insert individual soal dengan validasi
        for (const soal of soal_list) {
          // Handle array jawaban (untuk isian singkat) atau string (untuk pilihan ganda/essay)
          let jawabanBenar;
          let variasiJawaban = null;
          
          if (Array.isArray(soal.jawaban_benar)) {
            // Isian singkat: filter jawaban yang valid dan normalize ke lowercase
            const validAnswers = soal.jawaban_benar
              .filter(j => j && typeof j === 'string' && j.trim() !== '')
              .map(j => j.trim().toLowerCase()); // Normalize ke lowercase untuk case-insensitive
            
            if (validAnswers.length === 0) {
              throw new Error(`Soal "${soal.pertanyaan}" memiliki jawaban yang tidak valid. Minimal 1 jawaban harus diisi.`);
            }
            jawabanBenar = validAnswers[0]; // Jawaban utama (lowercase)
            variasiJawaban = JSON.stringify(validAnswers); // Simpan semua variasi sebagai JSON (lowercase)
          } else {
            // Pilihan ganda atau essay
            jawabanBenar = soal.jawaban_benar?.trim();
            if (!jawabanBenar || jawabanBenar === '-' || jawabanBenar.length === 0) {
              throw new Error(`Soal "${soal.pertanyaan}" memiliki jawaban yang tidak valid. Jawaban benar tidak boleh kosong.`);
            }
          }
          
          // Validasi: Untuk pilihan ganda, jawaban harus salah satu dari pilihan
          if (soal.pilihan_a && soal.pilihan_b) {
            const pilihan = [soal.pilihan_a, soal.pilihan_b, soal.pilihan_c, soal.pilihan_d].filter(p => p);
            if (!pilihan.includes(jawabanBenar)) {
              throw new Error(`Soal "${soal.pertanyaan}" memiliki jawaban benar yang tidak sesuai dengan pilihan. Jawaban harus salah satu dari: ${pilihan.join(', ')}`);
            }
          }
          
          await connection.query(
            'INSERT INTO soal (kumpulan_soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, variasi_jawaban) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [kumpulan_soal_id, soal.pertanyaan, soal.gambar || null, soal.pilihan_a, soal.pilihan_b, soal.pilihan_c, soal.pilihan_d, jawabanBenar, variasiJawaban]
          );
        }

        // Update jumlah_soal
        await connection.query(
          'UPDATE kumpulan_soal SET jumlah_soal = ? WHERE kumpulan_soal_id = ?',
          [soal_list.length, kumpulan_soal_id]
        );

        // Commit transaction
        await connection.commit();

        // Get the generated PIN code
        const [kumpulanData] = await connection.query(
          'SELECT pin_code FROM kumpulan_soal WHERE kumpulan_soal_id = ?',
          [kumpulan_soal_id]
        );

        res.status(201).json({
          status: 'success',
          message: 'Kumpulan soal berhasil dibuat. PIN telah di-generate otomatis.',
          data: {
            kumpulan_soal_id: kumpulan_soal_id,
            kategori_id,
            soal_count: soal_list.length,
            pin_code: kumpulanData[0]?.pin_code
          }
        });
      } catch (error) {
        // Rollback in case of error
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating kumpulan soal:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat membuat kumpulan soal'
      });
    } finally {
      connection.release();
    }
  },

  // Get kumpulan soal by id
  async getKumpulanSoal(req, res) {
    try {
      const { id } = req.params;

      // Get kumpulan_soal info
      const [kumpulan] = await db.query(
        'SELECT ks.*, k.nama_kategori FROM kumpulan_soal ks JOIN kategori k ON ks.kategori_id = k.id WHERE ks.kumpulan_soal_id = ?',
        [id]
      );

      if (kumpulan.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Kumpulan soal tidak ditemukan'
        });
      }

      // Get soal list dengan gambar dan variasi_jawaban
      const [soal] = await db.query(
        'SELECT soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, variasi_jawaban FROM soal WHERE kumpulan_soal_id = ?',
        [id]
      );

      // Parse variasi_jawaban jika ada (MySQL2 returns JSON as string or object)
      const soalParsed = soal.map(s => {
        let jawabanBenar = s.jawaban_benar;
        
        // Jika ada variasi_jawaban, gunakan itu (untuk isian singkat)
        if (s.variasi_jawaban) {
          try {
            jawabanBenar = typeof s.variasi_jawaban === 'string' 
              ? JSON.parse(s.variasi_jawaban) 
              : s.variasi_jawaban;
          } catch (e) {
            console.log('Failed to parse variasi_jawaban:', e);
          }
        }
        
        return {
          ...s,
          jawaban_benar: jawabanBenar,
          variasi_jawaban: s.variasi_jawaban
        };
      });

      res.json({
        status: 'success',
        data: {
          ...kumpulan[0],
          soal_list: soalParsed
        }
      });
    } catch (error) {
      console.error('Error getting kumpulan soal:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data kumpulan soal'
      });
    }
  },

  // Update kumpulan soal
  async updateKumpulanSoal(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const { kategori_id, soal_list, waktu_per_soal, waktu_keseluruhan, tipe_waktu, materi_id } = req.body;
      const updated_by = req.user.id || req.user.userId; // From auth middleware

      // Get judul from materi if materi_id is provided
      let judul = req.body.judul || null;
      if (materi_id && !judul) {
        const [materiRows] = await connection.query('SELECT judul FROM materi WHERE materi_id = ?', [materi_id]);
        if (materiRows.length > 0) {
          judul = materiRows[0].judul;
        }
      }

      // Start transaction
      await connection.beginTransaction();

      try {
        // Update kumpulan_soal dengan timing options
        const [kumpulanResult] = await connection.query(
          'UPDATE kumpulan_soal SET judul = ?, kategori_id = ?, materi_id = ?, updated_by = ?, waktu_per_soal = ?, waktu_keseluruhan = ?, tipe_waktu = ? WHERE kumpulan_soal_id = ?',
          [judul, kategori_id, materi_id || null, updated_by, waktu_per_soal || 60, waktu_keseluruhan || null, tipe_waktu || 'per_soal', id]
        );

        if (kumpulanResult.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
            status: 'error',
            message: 'Kumpulan soal tidak ditemukan'
          });
        }

        // Delete existing soal
        await connection.query('DELETE FROM soal WHERE kumpulan_soal_id = ?', [id]);

        // Insert updated soal dengan validasi
        for (const soal of soal_list) {
          // Handle array jawaban (untuk isian singkat) atau string (untuk pilihan ganda/essay)
          let jawabanBenar;
          let variasiJawaban = null;
          
          if (Array.isArray(soal.jawaban_benar)) {
            // Isian singkat: filter jawaban yang valid dan normalize ke lowercase
            const validAnswers = soal.jawaban_benar
              .filter(j => j && typeof j === 'string' && j.trim() !== '')
              .map(j => j.trim().toLowerCase()); // Normalize ke lowercase untuk case-insensitive
            
            if (validAnswers.length === 0) {
              throw new Error(`Soal "${soal.pertanyaan}" memiliki jawaban yang tidak valid. Minimal 1 jawaban harus diisi.`);
            }
            jawabanBenar = validAnswers[0]; // Jawaban utama (lowercase)
            variasiJawaban = JSON.stringify(validAnswers); // Simpan semua variasi sebagai JSON (lowercase)
          } else {
            // Pilihan ganda atau essay
            jawabanBenar = soal.jawaban_benar?.trim();
            if (!jawabanBenar || jawabanBenar === '-' || jawabanBenar.length === 0) {
              throw new Error(`Soal "${soal.pertanyaan}" memiliki jawaban yang tidak valid. Jawaban benar tidak boleh kosong.`);
            }
          }
          
          // Validasi: Untuk pilihan ganda, jawaban harus salah satu dari pilihan
          if (soal.pilihan_a && soal.pilihan_b) {
            const pilihan = [soal.pilihan_a, soal.pilihan_b, soal.pilihan_c, soal.pilihan_d].filter(p => p);
            if (!pilihan.includes(jawabanBenar)) {
              throw new Error(`Soal "${soal.pertanyaan}" memiliki jawaban benar yang tidak sesuai dengan pilihan. Jawaban harus salah satu dari: ${pilihan.join(', ')}`);
            }
          }
          
          await connection.query(
            'INSERT INTO soal (kumpulan_soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, variasi_jawaban) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, soal.pertanyaan, soal.gambar || null, soal.pilihan_a, soal.pilihan_b, soal.pilihan_c, soal.pilihan_d, jawabanBenar, variasiJawaban]
          );
        }

        // Update jumlah_soal
        await connection.query(
          'UPDATE kumpulan_soal SET jumlah_soal = ? WHERE kumpulan_soal_id = ?',
          [soal_list.length, id]
        );

        // Commit transaction
        await connection.commit();

        res.json({
          status: 'success',
          message: 'Kumpulan soal berhasil diperbarui',
          data: {
            id,
            kategori_id,
            soal_count: soal_list.length
          }
        });
      } catch (error) {
        // Rollback in case of error
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating kumpulan soal:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat memperbarui kumpulan soal'
      });
    } finally {
      connection.release();
    }
  },

  // Delete kumpulan soal
  async deleteKumpulanSoal(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;

      // Start transaction
      await connection.beginTransaction();

      try {
        // Delete soal first (foreign key constraint)
        await connection.query('DELETE FROM soal WHERE kumpulan_soal_id = ?', [id]);

        // Delete kumpulan_soal
        const [result] = await connection.query(
          'DELETE FROM kumpulan_soal WHERE kumpulan_soal_id = ?',
          [id]
        );

        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
            status: 'error',
            message: 'Kumpulan soal tidak ditemukan'
          });
        }

        // Commit transaction
        await connection.commit();

        res.json({
          status: 'success',
          message: 'Kumpulan soal berhasil dihapus'
        });
      } catch (error) {
        // Rollback in case of error
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error deleting kumpulan soal:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menghapus kumpulan soal'
      });
    } finally {
      connection.release();
    }
  },

  // Get soal by kategori
  async getSoalByKategori(req, res) {
    try {
      const { kategoriId } = req.params;

      const [soal] = await db.query(
        `SELECT s.* 
         FROM soal s 
         JOIN kumpulan_soal ks ON s.kumpulan_soal_id = ks.kumpulan_soal_id 
         WHERE ks.kategori_id = ?`,
        [kategoriId]
      );

      res.json({
        status: 'success',
        data: soal
      });
    } catch (error) {
      console.error('Error getting soal by kategori:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data soal'
      });
    }
  },

  // Get soal by materi_id
  async getSoalByMateri(req, res) {
    try {
      const { materiId } = req.params;
      console.log('🔍 getSoalByMateri called with materiId:', materiId);

      // Get kumpulan_soal with soal for this materi
      const [kumpulanSoal] = await db.query(
        `SELECT ks.kumpulan_soal_id, ks.kategori_id, k.nama_kategori, ks.materi_id, ks.pin_code, ks.created_at
         FROM kumpulan_soal ks 
         JOIN kategori k ON ks.kategori_id = k.id
         WHERE ks.materi_id = ?
         LIMIT 1`,
        [materiId]
      );

      console.log('📦 Kumpulan soal found:', kumpulanSoal.length);

      if (kumpulanSoal.length === 0) {
        console.log('❌ No kumpulan_soal found for materi_id:', materiId);
        return res.json({
          status: 'success',
          data: {
            kumpulan_soal_id: null,
            soal_list: []
          }
        });
      }

      console.log('✅ Kumpulan soal ID:', kumpulanSoal[0].kumpulan_soal_id);

      // Get soal list
      const [soal] = await db.query(
        'SELECT soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, variasi_jawaban FROM soal WHERE kumpulan_soal_id = ?',
        [kumpulanSoal[0].kumpulan_soal_id]
      );

      console.log('📦 Soal found:', soal.length);
      if (soal.length > 0) {
        console.log('✅ First soal:', soal[0]);
      }

      // MySQL2 returns JSON column as JavaScript array directly, no parsing needed
      const soalParsed = soal.map(s => ({
        ...s,
        jawaban_benar: s.variasi_jawaban ? s.variasi_jawaban : s.jawaban_benar
      }));

      res.json({
        status: 'success',
        data: {
          ...kumpulanSoal[0],
          soal_list: soalParsed
        }
      });
    } catch (error) {
      console.error('Error getting soal by materi:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data soal'
      });
    }
  },

  // Get soal by kumpulan_soal_id (for quiz flow with PIN)
  async getSoalByKumpulanSoal(req, res) {
    try {
      const { kumpulanSoalId } = req.params;
      console.log('🔍 getSoalByKumpulanSoal called with kumpulanSoalId:', kumpulanSoalId);

      // Get kumpulan_soal info with timing
      const [kumpulanSoal] = await db.query(
        `SELECT ks.kumpulan_soal_id, ks.judul, ks.kategori_id, k.nama_kategori, 
                ks.materi_id, m.judul as materi_judul, ks.jumlah_soal, 
                ks.waktu_per_soal, ks.waktu_keseluruhan, ks.tipe_waktu, ks.created_at
         FROM kumpulan_soal ks 
         JOIN kategori k ON ks.kategori_id = k.id
         LEFT JOIN materi m ON ks.materi_id = m.materi_id
         WHERE ks.kumpulan_soal_id = ?`,
        [kumpulanSoalId]
      );

      console.log('📦 Kumpulan soal found:', kumpulanSoal.length);

      if (kumpulanSoal.length === 0) {
        console.log('❌ No kumpulan_soal found for kumpulan_soal_id:', kumpulanSoalId);
        return res.status(404).json({
          status: 'error',
          message: 'Kumpulan soal tidak ditemukan'
        });
      }

      console.log('✅ Kumpulan soal data:', kumpulanSoal[0]);

      // Get soal list
      const [soal] = await db.query(
        'SELECT soal_id, pertanyaan, gambar, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, variasi_jawaban FROM soal WHERE kumpulan_soal_id = ? ORDER BY soal_id',
        [kumpulanSoalId]
      );

      console.log('📦 Soal found:', soal.length);
      if (soal.length > 0) {
        console.log('✅ First soal:', soal[0]);
      }

      // MySQL2 returns JSON column as JavaScript array directly, no parsing needed
      const soalParsed = soal.map(s => ({
        ...s,
        jawaban_benar: s.variasi_jawaban ? s.variasi_jawaban : s.jawaban_benar
      }));

      res.json({
        status: 'success',
        data: {
          ...kumpulanSoal[0],
          soal_list: soalParsed
        }
      });
    } catch (error) {
      console.error('Error getting soal by kumpulan_soal:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data soal'
      });
    }
  },

  // Export data for Kreator - export their own quiz data
  async exportKreatorData(req, res) {
    try {
      const kreatorId = req.user.id || req.user.userId; // From auth middleware
      console.log('📊 Exporting data for kreator:', kreatorId);
      console.log('🔍 req.user:', req.user);

      if (!kreatorId) {
        return res.status(400).json({
          success: false,
          message: 'User ID tidak ditemukan. Silakan login kembali.'
        });
      }

      // Get all kumpulan soal created by this kreator with details
      const [kumpulanSoal] = await db.query(
        `SELECT 
          ks.kumpulan_soal_id,
          ks.judul,
          k.nama_kategori,
          m.judul as materi_judul,
          ks.jumlah_soal,
          ks.pin_code,
          ks.waktu_per_soal,
          ks.waktu_keseluruhan,
          ks.tipe_waktu,
          ks.created_at,
          ks.updated_at,
          COUNT(DISTINCT qs.session_id) as total_peserta,
          AVG(hr.skor) as rata_rata_score
        FROM kumpulan_soal ks
        LEFT JOIN kategori k ON ks.kategori_id = k.id
        LEFT JOIN materi m ON ks.materi_id = m.materi_id
        LEFT JOIN quiz_session qs ON ks.kumpulan_soal_id = qs.kumpulan_soal_id
        LEFT JOIN hasil_quiz hr ON qs.session_id = hr.session_id
        WHERE ks.created_by = ?
        GROUP BY ks.kumpulan_soal_id
        ORDER BY ks.created_at DESC`,
        [kreatorId]
      );

      // Get detailed quiz results for this kreator's quizzes
      const [hasilQuiz] = await db.query(
        `SELECT 
          hr.hasil_id,
          qs.nama_peserta,
          COALESCE(qs.email_peserta, hr.nama_peserta) as email_peserta,
          ks.judul as judul_quiz,
          k.nama_kategori,
          hr.skor as score,
          hr.jawaban_benar as jumlah_benar,
          (hr.total_soal - hr.jawaban_benar) as jumlah_salah,
          hr.completed_at
        FROM hasil_quiz hr
        JOIN quiz_session qs ON hr.session_id = qs.session_id
        JOIN kumpulan_soal ks ON qs.kumpulan_soal_id = ks.kumpulan_soal_id
        LEFT JOIN kategori k ON ks.kategori_id = k.id
        WHERE ks.created_by = ?
        ORDER BY hr.completed_at DESC`,
        [kreatorId]
      );

      console.log('✅ Found kumpulan_soal:', kumpulanSoal.length);
      console.log('✅ Found hasil_quiz:', hasilQuiz.length);
      
      if (kumpulanSoal.length > 0) {
        console.log('📝 Sample kumpulan_soal:', kumpulanSoal[0]);
      }
      if (hasilQuiz.length > 0) {
        console.log('📝 Sample hasil_quiz:', hasilQuiz[0]);
      }

      res.json({
        success: true,
        data: {
          kumpulan_soal: kumpulanSoal,
          hasil_quiz: hasilQuiz
        }
      });
    } catch (error) {
      console.error('Error exporting kreator data:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat export data',
        error: error.message
      });
    }
  },

  // Export specific quiz data with all soal
  async exportQuizDetail(req, res) {
    try {
      const { kumpulanSoalId } = req.params;
      const kreatorId = req.user.id || req.user.userId; // From auth middleware
      
      console.log('📊 Exporting quiz detail for:', kumpulanSoalId);
      console.log('🔍 Kreator ID:', kreatorId);

      if (!kreatorId) {
        return res.status(400).json({
          success: false,
          message: 'User ID tidak ditemukan. Silakan login kembali.'
        });
      }

      // Verify ownership
      const [ownership] = await db.query(
        'SELECT created_by FROM kumpulan_soal WHERE kumpulan_soal_id = ?',
        [kumpulanSoalId]
      );

      if (ownership.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kumpulan soal tidak ditemukan'
        });
      }

      console.log('🔍 Owner ID from DB:', ownership[0].created_by);
      
      if (ownership[0].created_by !== kreatorId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses untuk export data ini'
        });
      }

      // Get kumpulan soal details
      const [kumpulanSoal] = await db.query(
        `SELECT 
          ks.*,
          k.nama_kategori,
          m.judul as materi_judul,
          u.nama as nama_kreator
        FROM kumpulan_soal ks
        LEFT JOIN kategori k ON ks.kategori_id = k.id
        LEFT JOIN materi m ON ks.materi_id = m.materi_id
        LEFT JOIN users u ON ks.created_by = u.id
        WHERE ks.kumpulan_soal_id = ?`,
        [kumpulanSoalId]
      );

      // Get all soal
      const [soal] = await db.query(
        `SELECT 
          soal_id,
          pertanyaan,
          pilihan_a,
          pilihan_b,
          pilihan_c,
          pilihan_d,
          jawaban_benar,
          variasi_jawaban
        FROM soal 
        WHERE kumpulan_soal_id = ?
        ORDER BY soal_id`,
        [kumpulanSoalId]
      );

      // Get hasil quiz for this kumpulan
      const [hasilQuiz] = await db.query(
        `SELECT 
          hr.hasil_id,
          qs.nama_peserta,
          COALESCE(qs.email_peserta, hr.nama_peserta) as email_peserta,
          hr.skor as score,
          hr.jawaban_benar as jumlah_benar,
          (hr.total_soal - hr.jawaban_benar) as jumlah_salah,
          hr.completed_at
        FROM hasil_quiz hr
        JOIN quiz_session qs ON hr.session_id = qs.session_id
        WHERE qs.kumpulan_soal_id = ?
        ORDER BY hr.completed_at DESC`,
        [kumpulanSoalId]
      );

      res.json({
        success: true,
        data: {
          info: kumpulanSoal[0],
          soal: soal,
          hasil_quiz: hasilQuiz
        }
      });
    } catch (error) {
      console.error('Error exporting quiz detail:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat export detail quiz',
        error: error.message
      });
    }
  },

  // Get all kumpulan soal by creator_id - UNTUK DASHBOARD KREATOR
  async getKumpulanSoalByCreator(req, res) {
    try {
      // 🔥 DEBUG: Check auth
      console.log('🔍 DEBUG - req.user:', JSON.stringify(req.user, null, 2));
      
      const created_by = req.user?.id || req.user?.userId;
      const { kategori_id } = req.query;

      console.log('📚 getKumpulanSoalByCreator - created_by:', created_by, 'kategori_id:', kategori_id);
      
      if (!created_by) {
        console.error('❌ CRITICAL: created_by is undefined!');
        return res.status(400).json({
          status: 'error',
          message: 'User ID not found in token',
          debug: { req_user: req.user }
        });
      }

      let query = `
        SELECT 
          ks.kumpulan_soal_id,
          ks.judul,
          ks.kategori_id,
          k.nama_kategori,
          ks.materi_id,
          ks.created_by,
          ks.created_at,
          ks.jumlah_soal,
          ks.pin_code
        FROM kumpulan_soal ks
        LEFT JOIN kategori k ON ks.kategori_id = k.id
        WHERE ks.created_by = ?
      `;
      
      const params = [created_by];

      if (kategori_id) {
        query += ' AND ks.kategori_id = ?';
        params.push(kategori_id);
      }

      query += ' ORDER BY ks.created_at DESC';

      console.log('📚 Query:', query);
      console.log('📚 Params:', params);

      const [kumpulanSoal] = await db.query(query, params);

      console.log('📚 Result count:', kumpulanSoal.length);
      
      if (!kumpulanSoal || kumpulanSoal.length === 0) {
        console.warn('⚠️ No kumpulan soal found for creator:', created_by);
      }

      res.json({
        status: 'success',
        data: kumpulanSoal.map(ks => ({
          materi_id: ks.kumpulan_soal_id,  // Map kumpulan_soal_id as materi_id untuk compatibility
          kumpulan_soal_id: ks.kumpulan_soal_id,
          judul: ks.judul,
          kategori_id: ks.kategori_id,
          nama_kategori: ks.nama_kategori,
          created_by: ks.created_by,
          created_at: ks.created_at,
          jumlah_soal: ks.jumlah_soal,
          pin_code: ks.pin_code
        }))
      });
    } catch (error) {
      console.error('❌ Error getting kumpulan soal by creator:', error.message);
      console.error('Stack:', error.stack);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil kumpulan soal',
        error: error.message
      });
    }
  }
};

module.exports = soalController;