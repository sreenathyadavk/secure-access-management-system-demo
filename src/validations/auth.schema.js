const { z } = require('zod');

const registerSchema = {
    body: z.object({
        name: z.string().max(255).optional(),
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters long'),
    }),
};

const loginSchema = {
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
    }),
};

module.exports = {
    registerSchema,
    loginSchema,
};
