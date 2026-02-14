const { prisma } = require('../utils/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const authService = require('../services/auth.service');

const getAllUsers = catchAsync(async (req, res, next) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            created_at: true,
        },
        orderBy: { created_at: 'desc' },
    });

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: { users },
    });
});

const changeUserRole = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
        return next(new AppError('Invalid role', 400));
    }

    let user;
    try {
        user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: { id: true, email: true, name: true, role: true, created_at: true },
        });
    } catch (err) {
        if (err.code === 'P2025') return next(new AppError('User not found', 404));
        throw err;
    }

    await authService.createAuditLog(req.user.id, 'ROLE_CHANGE', {
        targetUser: user.email,
        newRole: role,
    });

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

const deleteUser = catchAsync(async (req, res, next) => {
    const { userId } = req.params;

    if (userId === req.user.id) {
        return next(new AppError('You cannot delete yourself', 400));
    }

    let user;
    try {
        user = await prisma.user.delete({
            where: { id: userId },
        });
    } catch (err) {
        if (err.code === 'P2025') return next(new AppError('User not found', 404));
        throw err;
    }

    await authService.createAuditLog(req.user.id, 'USER_DELETE', {
        targetUser: user.email,
    });

    res.status(204).send();
});

const getAuditLogs = catchAsync(async (req, res, next) => {
    const logs = await prisma.auditLog.findMany({
        include: {
            user: {
                select: { email: true },
            },
        },
        orderBy: { timestamp: 'desc' },
        take: 100, // Limit to last 100 logs
    });

    res.status(200).json({
        status: 'success',
        results: logs.length,
        data: { logs },
    });
});

module.exports = {
    getAllUsers,
    changeUserRole,
    deleteUser,
    getAuditLogs,
};
