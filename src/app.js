const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const globalErrorHandler = require('./middlewares/error.middleware');
const AppError = require('./utils/AppError');

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
}));

// Logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
}

// Body Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// 404 Handler
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

const port = config.port || 3000;
app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

module.exports = app;
