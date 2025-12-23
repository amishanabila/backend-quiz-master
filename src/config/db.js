const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');


// const pool = mysql.createPool({
//     host: process.env.MYSQLHOST,
//     port: process.env.MYSQLPORT ,
//     user: process.env.MYSQLUSER ,
//     password: process.env.MYSQLPASSWORD ,
//     database: process.env.MYSQLDATABASE ,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
// });

// console.log('Passed configuration to MySQL pool. Establishing connections...');
// // Convert pool to use promises
// const promisePool = pool.promise();

// // Handle pool errors
// pool.on('error', (err) => {
//     console.error('[DB Error] Database pool error:', err.code);
//     if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//         console.error('[DB Error] Database connection was closed.');
//     }
//     if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
//         console.error('[DB Error] Database had a fatal error.');
//     }
//     if (err.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
//         console.error('[DB Error] Database connection was manually terminated.');
//     }
//     if (err.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER') {
//         console.error('[DB Error] Database packets out of order.');
//     }
//     if (err.code === 'ECONNREFUSED') {
//         console.error('[DB Error] Database connection refused. Check DB_HOST, DB_PORT and credentials.');
//     }
// });

// console.log('[DB Config] Database pool initialized successfully!');

const promisePool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+08:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false 
  }
});

// Tambahkan ini di bawah kode createPool kamu
const testQuery = async () => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS hasil");
    console.log("✅ Koneksi TiDB Cloud Stabil. Test Query Berhasil, Hasil:", rows[0].hasil);
  } catch (err) {
    console.error("❌ Koneksi terdeteksi tapi gagal query:", err.message);
  }
};

testQuery();
// try {
//   const connection = await pool.getConnection();
//   console.log(`Connected to database: ${process.env.DB_NAME}`);
//   connection.release(); 
  
// } catch (error) {
//   console.error("Error connecting to the database:", error.message);
// }


module.exports = promisePool;