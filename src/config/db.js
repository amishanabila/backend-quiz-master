const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local first (highest priority), then .env
const envLocalPath = path.join(__dirname, '../../.env.local');
const envPath = path.join(__dirname, '../../.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('[DB Config] Loaded .env.local');
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('[DB Config] Loaded .env');
}

console.log('[DB Config] Initializing database connection...');
console.log('[DB Config] Environment:', process.env.NODE_ENV || 'development');
console.log('[DB Config] Host:', process.env.DB_HOST);
console.log('[DB Config] Port:', process.env.DB_PORT || 3306);
console.log('[DB Config] Database:', process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_master',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    charset: 'utf8mb4'
});

// Convert pool to use promises
const promisePool = pool.promise();

// Handle pool errors
pool.on('error', (err) => {
    console.error('[DB Error] Database pool error:', err.code);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('[DB Error] Database connection was closed.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        console.error('[DB Error] Database had a fatal error.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
        console.error('[DB Error] Database connection was manually terminated.');
    }
    if (err.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER') {
        console.error('[DB Error] Database packets out of order.');
    }
    if (err.code === 'ECONNREFUSED') {
        console.error('[DB Error] Database connection refused. Check DB_HOST, DB_PORT and credentials.');
    }
});

console.log('[DB Config] Database pool initialized successfully!');

module.exports = promisePool;