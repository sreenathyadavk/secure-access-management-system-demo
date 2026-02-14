const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/db');
const config = require('../config/env');
const AppError = require('../utils/AppError');

const signToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
    });
};

const createAuditLog = async (userId, action, details = null) => {
    try {
        await prisma.auditLog.create({
            data: {
                user_id: userId != null ? userId : null,
                action,
                details: details ? JSON.parse(JSON.stringify(details)) : undefined,
            },
        });
    } catch (err) {
        console.error('Failed to create audit log:', err);
        // Don't throw, as logging failure shouldn't stop the main flow
    }
};

const register = async (userData) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
    });

    if (existingUser) {
        throw new AppError('Email already in use', 400);
    }

    const hashedPassword = await bcrypt.hash(userData.password, config.bcryptRounds);

    const newUser = await prisma.user.create({
        data: {
            name: userData.name ?? null,
            email: userData.email,
            password_hash: hashedPassword,
            role: 'USER', // Always USER on registration; ignore body to prevent privilege escalation
        },
    });

    // Log the action
    // No user_id available before creation, but now we have it.
    // We can log "USER_REGISTER" action if we define it, or just log LOGIN_SUCCESS after they log in. 
    // The requirements asked for "Login attempts", "Role changes". 
    // But good to log registration. I'll add USER_REGISTER to Enum in schema or just use details?
    // Enum is strict. I added USER_REGISTER to Enum in step 32. 
    await createAuditLog(newUser.id, 'USER_REGISTER', { email: newUser.email });

    const token = signToken(newUser.id);

    return { user: newUser, token };
};

const login = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        if (user) {
            await createAuditLog(user.id, 'LOGIN_FAIL', { reason: 'Invalid password' });
        } else {
            await createAuditLog(null, 'LOGIN_FAIL', { reason: 'Unknown email', email });
        }
        throw new AppError('Incorrect email or password', 401);
    }

    const token = signToken(user.id);

    // Log success
    await createAuditLog(user.id, 'LOGIN_SUCCESS', { ip: '::1' }); // In real app get IP from request

    return { user, token };
};

module.exports = {
    register,
    login,
    createAuditLog, // Export for use in other services
};
