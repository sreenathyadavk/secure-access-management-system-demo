require('dotenv').config();

const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
];

// Validate required environment variables when app runs
requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

module.exports = {
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    nodeEnv: process.env.NODE_ENV || 'development',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    isProduction: process.env.NODE_ENV === 'production',
    corsOrigin: process.env.CORS_ORIGIN || '*',
};
