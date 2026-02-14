const catchAsync = require('../utils/catchAsync');

const getDashboard = catchAsync(async (req, res, next) => {
    res.status(200).json({
        status: 'success',
        data: {
            message: `Welcome to your dashboard, ${req.user.name || req.user.email}.`,
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
            },
        },
    });
});

module.exports = {
    getDashboard,
};
