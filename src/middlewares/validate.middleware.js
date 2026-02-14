const { z } = require('zod');
const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
    try {
        const { body, query, params } = req;

        // Validate only what is present in schema
        if (schema.body) schema.body.parse(body);
        if (schema.query) schema.query.parse(query);
        if (schema.params) schema.params.parse(params);

        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues ?? error.errors ?? [];
            const message = issues
                .map((e) => `${(e.path || []).join('.') || 'value'}: ${e.message || 'invalid'}`)
                .join(', ');
            return next(new AppError(`Validation failed: ${message}`, 400));
        }
        next(error);
    }
};

module.exports = validate;
