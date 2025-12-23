const jwt = require('jsonwebtoken');

// Authenticate token middleware
const authenticateToken = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ AUTH - No token provided');
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user data to request - normalize id field
        req.user = {
            id: decoded.userId || decoded.id, // Support both userId and id
            userId: decoded.userId || decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        
        console.log('✅ AUTH - Token verified, user:', {
            id: req.user.id,
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role
        });
        
        next();
    } catch (error) {
        console.log('❌ AUTH - Token validation failed:', error.message);
        res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin role required.'
        });
    }
};

// Check if user is kreator
const isKreator = (req, res, next) => {
    if (req.user && (req.user.role === 'kreator' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Kreator role required.'
        });
    }
};

module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.isAdmin = isAdmin;
module.exports.isKreator = isKreator;