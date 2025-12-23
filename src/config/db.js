// const mysql = require('mysql2');
// const fs = require('fs');
// const path = require('path');
// const dotenv = require('dotenv');


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




// module.exports = promisePool;

// 1. Gunakan 'mysql2/promise' agar bisa pakai async/await langsung
const mysql = require('mysql2/promise'); 
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 2. Load environment variables
dotenv.config(); 

// Konfigurasi Pool
const promisePool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Catatan: Railway biasanya tidak butuh SSL complex seperti TiDB, 
    // tapi jika error SSL, uncomment baris di bawah:
    // ssl: {
    //   rejectUnauthorized: false
    // }
});

const testQuery = async () => {
    try {
        // 3. Gunakan promisePool yang benar
        const [rows] = await promisePool.query("SELECT 1 + 1 AS hasil");
        
        // Log disesuaikan karena kamu pakai Railway, bukan TiDB
        console.log("✅ Koneksi Database Berhasil. Test Query Hasil:", rows[0].hasil);
    } catch (err) {
        console.error("❌ Gagal connect ke database:", err.message);
    }
};

testQuery();

module.exports = promisePool;