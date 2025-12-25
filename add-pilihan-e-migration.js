const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

async function addPilihanEColumn() {
    let connection;
    try {
        console.log('🔄 Connecting to database...');
        console.log(`📊 Host: ${process.env.DB_HOST}`);
        console.log(`📦 Database: ${process.env.DB_NAME}`);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database');

        // Check if pilihan_e column exists
        const [columns] = await connection.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soal' AND COLUMN_NAME = 'pilihan_e'",
            [process.env.DB_NAME]
        );

        if (columns.length > 0) {
            console.log('✅ Column pilihan_e already exists in soal table');
        } else {
            console.log('🔄 Adding pilihan_e column to soal table...');
            
            // Add pilihan_e column after pilihan_d
            await connection.query(
                "ALTER TABLE soal ADD COLUMN pilihan_e TEXT NULL AFTER pilihan_d"
            );

            console.log('✅ Successfully added pilihan_e column to soal table');
        }

        // Verify the column was added
        const [verify] = await connection.query("DESCRIBE soal");
        const hasColumn = verify.some(col => col.Field === 'pilihan_e');
        
        if (hasColumn) {
            console.log('✅ Migration completed successfully!');
            console.log('📊 The soal table now supports 5 multiple choice options (A-E)');
        } else {
            console.log('⚠️  Warning: Could not verify pilihan_e column');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure the database server is running and environment variables are set correctly');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Check your database credentials in .env file');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run migration
addPilihanEColumn();
