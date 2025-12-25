const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const emailService = require('../utils/emailService');

const authController = {
  // Register new user
  async register(req, res) {
    try {
      const { nama, email, password } = req.body;

      // Validasi input
      if (!nama || !email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Nama, email, dan password wajib diisi'
        });
      }

      // Check if user already exists
      const [existingUsers] = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Email sudah terdaftar'
        });
      }

      // Hash password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      // Create user (langsung verified, tidak perlu email verification)
      const [result] = await db.query(
        'INSERT INTO users (nama, email, password, is_verified) VALUES (?, ?, ?, true)',
        [nama, email, hashedPassword]
      );

      // Get the created user to get role
      const [newUser] = await db.query(
        'SELECT id, nama, email, role, is_verified FROM users WHERE id = ?',
        [result.insertId]
      );

      // Generate token with role
      const token = jwt.sign(
        { userId: result.insertId, email, role: newUser[0].role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        status: 'success',
        message: 'Registrasi berhasil',
        data: {
          user: {
            id: result.insertId,
            nama,
            email,
            role: newUser[0].role,
            is_verified: true
          },
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat registrasi'
      });
    }
  },

  // Login user
  async login(req, res) {
    try {
      console.log('Login attempt:', req.body);
      const { email, password } = req.body;

      // Validasi input
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email dan password wajib diisi'
        });
      }

      console.log('Querying database for user:', email);
      // Check if user exists
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      console.log('User query result:', users.length, 'users found');

      if (users.length === 0) {
        return res.status(401).json({
          status: 'error',
          message: 'Email atau password salah'
        });
      }

      const user = users[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role });
      console.log('Password hash length:', user.password?.length);
      console.log('Input password length:', password.length);

      // Check password
      console.log('Comparing passwords...');
      const validPassword = await bcryptjs.compare(password, user.password);
      console.log('Password comparison result:', validPassword);
      
      if (!validPassword) {
        console.log('❌ Password mismatch - login rejected');
        return res.status(401).json({
          status: 'error',
          message: 'Email atau password salah'
        });
      }
      
      console.log('✅ Password valid - generating token');

      // Generate token with role
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Convert foto to base64 if exists
      let fotoBase64 = null;
      if (user.foto) {
        fotoBase64 = `data:image/png;base64,${user.foto.toString('base64')}`;
      }

      res.json({
        status: 'success',
        message: 'Login berhasil',
        data: {
          user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            telepon: user.telepon || null,
            role: user.role,
            foto: fotoBase64,
            is_verified: user.is_verified
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat login'
      });
    }
  },

  // Request password reset
  async resetPasswordRequest(req, res) {
    try {
      console.log('🔄 Reset password request received for email:', req.body.email);
      const { email } = req.body;

      // Validasi input
      if (!email) {
        console.log('❌ Email validation failed - empty email');
        return res.status(400).json({
          status: 'error',
          message: 'Email wajib diisi'
        });
      }

      // Check if user exists
      console.log('🔍 Checking if user exists in database...');
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        console.log('❌ Email not found in database:', email);
        return res.status(404).json({
          status: 'error',
          message: 'Email tidak terdaftar'
        });
      }

      const user = users[0];
      console.log('✅ User found:', { id: user.id, email: user.email });

      // Generate reset token (expires in 1 hour)
      console.log('🔐 Generating reset token...');
      const resetToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      console.log('✅ Reset token generated');

      // Save reset token to database
      console.log('💾 Saving reset token to database...');
      await db.query(
        'UPDATE users SET reset_token = ? WHERE id = ?',
        [resetToken, user.id]
      );
      console.log('✅ Reset token saved to database');

      // Try to send reset email (optional - don't fail if email fails)
      try {
        console.log('📧 Attempting to send reset password email...');
        console.log('📧 Email config check:', {
          EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Not set',
          EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set',
          FRONTEND_URL: process.env.FRONTEND_URL || 'Using default'
        });
        
        await emailService.sendPasswordResetEmail(email, resetToken);
        console.log('✅ Reset password email sent successfully to:', email);
      } catch (emailError) {
        console.error('⚠️ Email sending failed (non-critical):', emailError.message);
        // Don't throw error - email is optional since we return token directly
      }

      // Return success with token (email is backup, not required)
      res.json({
        status: 'success',
        message: 'Silakan buat password baru',
        token: resetToken  // Return token untuk digunakan langsung di frontend
      });
    } catch (error) {
      console.error('❌ Reset password request error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Always return detailed error for debugging
      return res.status(500).json({
        status: 'error',
        message: 'Gagal mengirim email reset password. ' + error.message,
        errorCode: error.code || 'UNKNOWN',
        errorCommand: error.command || 'UNKNOWN',
        details: error.message,
        suggestion: 'Pastikan EMAIL_PASSWORD di Railway adalah Gmail App Password (16 digit), bukan password Gmail biasa. Generate di: https://myaccount.google.com/security -> App passwords'
      });
    }
  },

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          status: 'error',
          message: 'Token verifikasi tidak ditemukan'
        });
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Update user verification status
        const [result] = await db.query(
          'UPDATE users SET is_verified = true WHERE id = ? AND verification_token = ?',
          [decoded.id, token]
        );

        if (result.affectedRows === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Token verifikasi tidak valid atau sudah digunakan'
          });
        }

        res.json({
          status: 'success',
          message: 'Email berhasil diverifikasi'
        });
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(400).json({
            status: 'error',
            message: 'Token verifikasi telah kadaluarsa'
          });
        }
        throw jwtError;
      }
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat verifikasi email'
      });
    }
  },

  // Verify reset token and reset password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Validasi input
      if (!token || !newPassword) {
        return res.status(400).json({
          status: 'error',
          message: 'Token dan password baru wajib diisi'
        });
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user with reset token
        const [users] = await db.query(
          'SELECT * FROM users WHERE id = ? AND reset_token = ?',
          [decoded.id, token]
        );

        if (users.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Token tidak valid atau kadaluarsa'
          });
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(newPassword, salt);

        // Update password and clear reset token
        await db.query(
          'UPDATE users SET password = ?, reset_token = NULL WHERE id = ?',
          [hashedPassword, decoded.id]
        );

        res.json({
          status: 'success',
          message: 'Password berhasil direset'
        });
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(400).json({
            status: 'error',
            message: 'Token telah kadaluarsa, silakan minta reset password lagi'
          });
        }
        throw jwtError;
      }
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat reset password'
      });
    }
  },

  // Create admin account (helper endpoint for development)
  async createAdmin(req, res) {
    try {
      const { email = 'admin@gmail.com', password = 'Admin123!' } = req.body;

      // Check if admin already exists
      const [existingAdmin] = await db.query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      if (existingAdmin && existingAdmin.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Admin account sudah ada'
        });
      }

      // Hash password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      // Insert admin
      const [result] = await db.query(
        'INSERT INTO users (nama, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
        ['Administrator', email, hashedPassword, 'admin', true]
      );

      res.status(201).json({
        status: 'success',
        message: 'Admin account berhasil dibuat',
        data: {
          id: result.insertId,
          email: email,
          password: password,
          role: 'admin'
        }
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat membuat admin account'
      });
    }
  }
};

module.exports = authController;