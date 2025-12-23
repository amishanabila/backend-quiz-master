const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000 
});

// Tes koneksi saat aplikasi pertama kali jalan
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database terhubung dengan sukses ke host:', process.env.DB_HOST);
    connection.release();
  } catch (err) {
    console.error('❌ Database gagal terhubung:', err.message);
  }
})();

module.exports = pool;