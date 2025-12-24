const db = require('../config/db');

const materiController = {
  // Get all materi or filter by kategori dan created_by
  async getMateri(req, res) {
    try {
      const { kategori_id, created_by } = req.query;
      let query = `
        SELECT m.*, k.nama_kategori 
        FROM materi m 
        LEFT JOIN kategori k ON m.kategori_id = k.id
        WHERE 1=1
      `;
      let params = [];

      if (kategori_id) {
        query += ' AND m.kategori_id = ?';
        params.push(kategori_id);
      }

      // OPTIONAL filter: jika created_by diberikan, gunakan
      // Jika tidak, load SEMUA materi (untuk backward compatibility dengan soal lama)
      if (created_by) {
        query += ' AND (m.created_by = ? OR m.created_by IS NULL)';
        params.push(created_by);
        console.log('📁 Filtering materi by created_by:', created_by);
      } else {
        console.log('📁 Loading ALL materi (no creator filter)');
      }

      const [materi] = await db.query(query, params);

      console.log('✅ Found', materi.length, 'materi', created_by ? `for creator ${created_by}` : '(all)');

      res.json({
        status: 'success',
        data: materi
      });
    } catch (error) {
      console.error('Error getting materi:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data materi'
      });
    }
  },

  // Get materi by id
  async getMateriById(req, res) {
    try {
      const { id } = req.params;
      const [materi] = await db.query(
        'SELECT * FROM materi WHERE materi_id = ?',
        [id]
      );

      if (materi.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Materi tidak ditemukan'
        });
      }

      res.json({
        status: 'success',
        data: materi[0]
      });
    } catch (error) {
      console.error('Error getting materi by id:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data materi'
      });
    }
  },

  // Create new materi
  async createMateri(req, res) {
    try {
      const { judul, kategori_id, isi_materi } = req.body;
      const created_by = req.user?.id; // Get user ID from auth middleware

      const [result] = await db.query(
        'INSERT INTO materi (judul, kategori_id, isi_materi, created_by) VALUES (?, ?, ?, ?)',
        [judul, kategori_id, isi_materi, created_by]
      );

      res.status(201).json({
        status: 'success',
        message: 'Materi berhasil dibuat',
        data: {
          id: result.insertId,
          judul,
          kategori_id,
          isi_materi,
          created_by
        }
      });
    } catch (error) {
      console.error('Error creating materi:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat membuat materi'
      });
    }
  },

  // Update materi
  async updateMateri(req, res) {
    try {
      const { id } = req.params;
      const { judul, kategori_id, isi_materi } = req.body;
      // Note: We keep the original created_by, only update content

      const [result] = await db.query(
        'UPDATE materi SET judul = ?, kategori_id = ?, isi_materi = ? WHERE materi_id = ?',
        [judul, kategori_id, isi_materi, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Materi tidak ditemukan'
        });
      }

      res.json({
        status: 'success',
        message: 'Materi berhasil diperbarui',
        data: {
          id,
          judul,
          kategori_id,
          isi_materi
        }
      });
    } catch (error) {
      console.error('Error updating materi:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat memperbarui materi'
      });
    }
  },

  // Delete materi
  async deleteMateri(req, res) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        'DELETE FROM materi WHERE materi_id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Materi tidak ditemukan'
        });
      }

      res.json({
        status: 'success',
        message: 'Materi berhasil dihapus'
      });
    } catch (error) {
      console.error('Error deleting materi:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menghapus materi'
      });
    }
  }
};

module.exports = materiController;