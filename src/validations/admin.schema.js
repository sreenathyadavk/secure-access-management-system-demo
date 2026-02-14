const { z } = require('zod');

const changeRoleSchema = {
    body: z.object({
        role: z.enum(['USER', 'ADMIN'], { message: 'Role must be USER or ADMIN' }),
    }),
};

module.exports = {
    changeRoleSchema,
};
