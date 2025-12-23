const db = require('../config/db');

const UserController = {
    // Note: Auth functions (register, login, verifyEmail, requestResetPassword, resetPassword) 
    // are handled by authController.js to avoid duplication

    // Get user profile - RAW SQL QUERY
    getProfile: async (req, res) => {
        try {
            const [users] = await db.query(
                'SELECT id, nama, email, role, telepon, foto, is_verified, created_at, updated_at FROM users WHERE id = ?',
                [req.user.userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User tidak ditemukan'
                });
            }

            const user = users[0];

            // Convert BLOB to base64 for sending
            if (user.foto) {
                const base64Foto = user.foto.toString('base64');
                user.foto = `data:image/png;base64,${base64Foto}`;
            }

            res.json({
                status: 'success',
                data: {
                    user
                }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat mengambil profil'
            });
        }
    },

    // Update user profile - RAW SQL QUERY
    updateProfile: async (req, res) => {
        try {
            const { nama, email, telepon } = req.body;
            
            console.log('Update profile request:', {
                userId: req.user.userId,
                nama,
                email,
                telepon,
                hasFile: !!req.file,
                fileInfo: req.file ? {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                } : null
            });

            if (!nama) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nama harus diisi'
                });
            }

            const nameRegex = /^(?=.*[a-z])(?=.*[A-Z])[A-Za-z\s]+$/;
            if (!nameRegex.test(nama)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nama harus mengandung huruf besar dan kecil, hanya huruf dan spasi'
                });
            }

            if (telepon && telepon.trim() && !/^\d{10,12}$/.test(telepon)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Nomor telepon harus 10-12 digit'
                });
            }

            // Handle photo upload
            let foto = null;
            if (req.file) {
                console.log('Photo file received:', req.file.originalname, req.file.size, 'bytes');
                foto = req.file.buffer; // Binary data dari multer
            }

            // Update user profile dengan RAW SQL
            let query, params;
            if (foto) {
                query = 'UPDATE users SET nama = ?, telepon = ?, foto = ?, updated_at = NOW() WHERE id = ?';
                params = [nama, telepon || null, foto, req.user.userId];
            } else {
                query = 'UPDATE users SET nama = ?, telepon = ?, updated_at = NOW() WHERE id = ?';
                params = [nama, telepon || null, req.user.userId];
            }

            const [result] = await db.query(query, params);
            console.log('Update result:', result);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User tidak ditemukan'
                });
            }

            // Fetch updated user data dengan RAW SQL
            const [updatedUsers] = await db.query(
                'SELECT id, nama, email, role, telepon, foto, is_verified, created_at, updated_at FROM users WHERE id = ?',
                [req.user.userId]
            );

            const updatedUser = updatedUsers[0];

            // Convert BLOB to base64 for sending
            if (updatedUser.foto) {
                const base64Foto = updatedUser.foto.toString('base64');
                updatedUser.foto = `data:image/png;base64,${base64Foto}`;
            }

            res.json({
                status: 'success',
                message: 'Profil berhasil diperbarui',
                data: {
                    user: updatedUser
                }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat memperbarui profil'
            });
        }
    },

    // Delete user account - RAW SQL QUERY
    deleteAccount: async (req, res) => {
        try {
            const userId = req.user.userId;

            console.log('Delete account request for user ID:', userId);

            // Check if user exists
            const [users] = await db.query(
                'SELECT id, email, role FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User tidak ditemukan'
                });
            }

            // Prevent admin from deleting their own account via this endpoint
            if (users[0].role === 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin tidak dapat menghapus akun sendiri'
                });
            }

            // Delete user (CASCADE akan menghapus data terkait)
            const [result] = await db.query(
                'DELETE FROM users WHERE id = ?',
                [userId]
            );

            console.log('Delete account result:', result);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Gagal menghapus akun'
                });
            }

            res.json({
                status: 'success',
                message: 'Akun berhasil dihapus'
            });

        } catch (error) {
            console.error('Delete account error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Terjadi kesalahan saat menghapus akun'
            });
        }
    }
};

module.exports = UserController;