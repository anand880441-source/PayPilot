require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const transactionRoutes = require('./routes/transaction.routes');
const rewardRoutes = require('./routes/reward.routes');
const walletRoutes = require('./routes/wallet.routes');
const reconciliationRoutes = require('./routes/reconciliation.routes');
const gmailRoutes = require('./routes/gmail.routes');
const plaidRoutes = require('./routes/plaid.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const statementRoutes = require('./routes/statement.routes');
const searchRoutes = require('./routes/search.routes');

const app = express();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.csv' || ext === '.pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and PDF files are allowed'));
        }
    }
});

app.locals.upload = upload;

// CORS Configuration - supports web (5173), expo web (8081), expo go
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8082',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://localhost:19002',
    'exp://localhost:8081',
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow any localhost port, exp:// scheme, or explicitly listed
        if (
            allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('exp://') ||
            origin.startsWith('http://192.168.') ||
            origin.startsWith('http://10.')
        ) {
            return callback(null, true);
        }
        // In development, be permissive; in production, still allow but log
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        // Allow all for now to ensure mobile/web works (can tighten later via FRONTEND_URL)
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    message: 'Too many requests, please try again later.',
    skip: () => process.env.NODE_ENV === 'development'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users/settings', settingsRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/', (req, res) => {
    res.status(200).json({ message: 'PayPilot API is running...' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

module.exports = app;





