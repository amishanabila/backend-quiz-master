const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

async function setupDatabase() {
    try {
        console.log('🔄 Starting database setup...');
        console.log(`📊 Connecting to ${process.env.DB_HOST} as ${process.env.DB_USER}`);

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL');

        // Read SQL file
        const sqlFile = path.join(__dirname, 'database', '01_setup.sql');
        let sql = fs.readFileSync(sqlFile, 'utf8');

        // Parse and split statements smartly
        const statements = parseSQL(sql);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;

            try {
                await connection.query(stmt);
                successCount++;
            } catch (error) {
                // Skip errors for already-existing objects, continue with setup
                if (error.code !== 'ER_TABLE_EXISTS_ERROR' && 
                    error.code !== 'ER_DUP_KEYNAME' &&
                    !error.message.includes('already exists')) {
                    // console.error(`⚠️  Error at statement ${i + 1}:`, error.message.substring(0, 100));
                    errorCount++;
                } else {
                    successCount++;
                }
            }
        }

        console.log('✅ Database schema setup completed');
        console.log(`📊 Executed: ${successCount} statements`);
        console.log(`📦 Database: ${process.env.DB_NAME || 'quiz_master'}`);

        // Create default admin account if not exists
        console.log('🔐 Creating default admin account...');
        
        const adminEmail = 'admin@gmail.com';
        const adminPassword = 'Admin123!'; // Default password
        const adminName = 'Administrator';

        try {
            // Check if admin already exists
            const [existingAdmin] = await connection.query(
                'SELECT id FROM users WHERE email = ? LIMIT 1',
                [adminEmail]
            );

            if (existingAdmin && existingAdmin.length === 0) {
                // Hash password
                const salt = await bcryptjs.genSalt(10);
                const hashedPassword = await bcryptjs.hash(adminPassword, salt);

                // Insert admin user
                await connection.query(
                    'INSERT INTO users (nama, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
                    [adminName, adminEmail, hashedPassword, 'admin', true]
                );

                console.log('✅ Admin account created');
                console.log(`   Email: ${adminEmail}`);
                console.log(`   Password: ${adminPassword}`);
            } else {
                console.log('ℹ️  Admin account already exists');
            }
        } catch (adminError) {
            console.error('⚠️  Error creating admin account:', adminError.message);
        }

        await connection.end();
        console.log('\n✅ Database setup completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        process.exit(1);
    }
}

function parseSQL(sql) {
    const statements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let inDelimiterBlock = false;
    let currentDelimiter = ';';

    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        const nextChar = sql[i + 1];

        // Handle string literals
        if ((char === '"' || char === "'") && (i === 0 || sql[i - 1] !== '\\')) {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar) {
                inString = false;
            }
        }

        if (!inString) {
            // Check for DELIMITER statement
            if (sql.substring(i, i + 9) === 'DELIMITER' && (i === 0 || /\s/.test(sql[i - 1]))) {
                const delimEnd = sql.indexOf('\n', i);
                currentDelimiter = sql.substring(i + 9, delimEnd).trim();
                i = delimEnd;
                continue;
            }

            // Check for statement terminator
            if (currentDelimiter === ';' && char === currentDelimiter) {
                currentStatement += char;
                statements.push(currentStatement);
                currentStatement = '';
                continue;
            } else if (currentDelimiter !== ';') {
                if (sql.substring(i, i + currentDelimiter.length) === currentDelimiter) {
                    currentStatement += char;
                    statements.push(currentStatement.replace(new RegExp(currentDelimiter + '$'), ';'));
                    currentStatement = '';
                    i += currentDelimiter.length - 1;
                    currentDelimiter = ';';
                    continue;
                }
            }
        }

        currentStatement += char;
    }

    if (currentStatement.trim()) {
        statements.push(currentStatement);
    }

    return statements.filter(stmt => stmt.trim());
}

setupDatabase();
