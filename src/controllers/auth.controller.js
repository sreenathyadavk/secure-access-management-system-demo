const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');

const register = catchAsync(async (req, res, next) => {
    const { user, token } = await authService.register(req.body);

    // Remove password from response
    const userResponse = { ...user };
    delete userResponse.password_hash;

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: userResponse,
        },
    });
});

const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    const userResponse = { ...user };
    delete userResponse.password_hash;

    res.status(200).json({
        status: 'success',
        token,
        data: {
            user: userResponse,
        },
    });
});

module.exports = {
    register,
    login,
};
