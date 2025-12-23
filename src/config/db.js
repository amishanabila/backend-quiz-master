const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');



const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT ,
    user: process.env.MYSQLUSER ,
    password: process.env.MYSQLPASSWORD ,
    database: process.env.MYSQLDATABASE ,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

console.log('Passed configuration to MySQL pool. Establishing connections...');
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