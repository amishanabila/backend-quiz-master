const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./src/config/db');

// Load .env.local first (development), then .env (production)
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('[Server] Loaded .env.local (development)');
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('[Server] Loaded .env (production)');
}

// Import route handlers
const authRoutes = require('./src/routes/authRoutes');
const kategoriRoutes = require('./src/routes/kategoriRoutes');
const materiRoutes = require('./src/routes/materiRoutes');
const soalRoutes = require('./src/routes/soalRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const userRoutes = require('./src/routes/userRoutes');
const leaderboardRoutes = require('./src/routes/leaderboardRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

// Health check endpoint (first thing before CORS)
app.get('/health', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('[Health Check] Database error:', error.message);
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            message: error.message.substring(0, 100),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl requests)
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Middlewares
// Increase payload limit to 50MB for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kategori', kategoriRoutes);
app.use('/api/materi', materiRoutes);
app.use('/api/soal', soalRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// const PORT = process.env.PORT || 5000;
// const server = 
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

// server.on('error', (err) => {
//     console.error('Server error:', err);
//     process.exit(1);
// });

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
