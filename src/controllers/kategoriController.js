const db = require('../config/db');

const KategoriController = {
    // Get all kategori - RAW SQL QUERY
    getAll: async (req, res) => {
        try {
            const [kategori] = await db.query('SELECT * FROM kategori ORDER BY nama_kategori');
            res.json({
                status: 'success',
                data: kategori
            });
        } catch (error) {
            console.error('Get kategori error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil data kategori'
            });
        }
    },

    // Get kategori by ID - RAW SQL QUERY
    getById: async (req, res) => {
        try {
            const [kategori] = await db.query('SELECT * FROM kategori WHERE id = ?', [req.params.id]);
            
            if (kategori.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Kategori tidak ditemukan'
                });
            }
            
            res.json({
                status: 'success',
                data: kategori[0]
            });
        } catch (error) {
            console.error('Get kategori by id error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil data kategori'
            });
        }
    },

    // Create kategori - RAW SQL QUERY
    create: async (req, res) => {
        try {
            const { nama_kategori } = req.body;
            const created_by = req.user?.id || req.body.created_by; // From auth middleware or body

            // Validasi input
            if (!nama_kategori) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nama kategori harus diisi'
                });
            }

            // Cek apakah kategori dengan nama yang sama sudah ada (case insensitive)
            const [existing] = await db.query(
                'SELECT id, nama_kategori FROM kategori WHERE LOWER(nama_kategori) = LOWER(?)',
                [nama_kategori]
            );

            if (existing.length > 0) {
                // Kategori sudah ada, return existing data
                return res.status(200).json({
                    status: 'success',
                    message: 'Kategori sudah ada',
                    data: existing[0],
                    alreadyExists: true
                });
            }

            // Insert kategori baru
            const [result] = await db.query(
                'INSERT INTO kategori (nama_kategori, created_by) VALUES (?, ?)',
                [nama_kategori, created_by]
            );
            
            res.status(201).json({
                status: 'success',
                message: 'Kategori berhasil dibuat',
                data: {
                    id: result.insertId,
                    nama_kategori,
                    created_by
                },
                alreadyExists: false
            });
        } catch (error) {
            console.error('Create kategori error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Kategori dengan nama tersebut sudah ada'
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat membuat kategori'
            });
        }
    },

    // Update kategori - RAW SQL QUERY
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { nama_kategori } = req.body;

            // Validasi input
            if (!nama_kategori) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nama kategori harus diisi'
                });
            }

            // Cek kategori exists
            const [kategori] = await db.query('SELECT * FROM kategori WHERE id = ?', [id]);
            if (kategori.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Kategori tidak ditemukan'
                });
            }

            // Cek duplikat nama (excluding current id)
            const [existing] = await db.query(
                'SELECT id FROM kategori WHERE LOWER(nama_kategori) = LOWER(?) AND id != ?',
                [nama_kategori, id]
            );
            if (existing.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Kategori dengan nama tersebut sudah ada'
                });
            }

            const [result] = await db.query(
                'UPDATE kategori SET nama_kategori = ? WHERE id = ?',
                [nama_kategori, id]
            );
            
            res.json({
                status: 'success',
                message: 'Kategori berhasil diperbarui',
                data: {
                    id,
                    nama_kategori
                }
            });
        } catch (error) {
            console.error('Update kategori error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Kategori dengan nama tersebut sudah ada'
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memperbarui kategori'
            });
        }
    },

    // Delete kategori - RAW SQL QUERY
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            // Cek penggunaan kategori di materi dan kumpulan_soal
            const [materiCount] = await db.query(
                'SELECT COUNT(*) as count FROM materi WHERE kategori_id = ?',
                [id]
            );
            const [soalCount] = await db.query(
                'SELECT COUNT(*) as count FROM kumpulan_soal WHERE kategori_id = ?',
                [id]
            );

            if (materiCount[0].count > 0 || soalCount[0].count > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Kategori tidak dapat dihapus karena sedang digunakan'
                });
            }

            const [result] = await db.query('DELETE FROM kategori WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Kategori tidak ditemukan'
                });
            }

            res.json({
                status: 'success',
                message: 'Kategori berhasil dihapus'
            });
        } catch (error) {
            console.error('Delete kategori error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat menghapus kategori'
            });
        }
    }
};

module.exports = KategoriController;