const ApiError = require('../utils/apiError');

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || 'form';
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      const firstMessage = result.error.issues[0]?.message || 'Invalid request payload';
      return next(new ApiError(400, firstMessage, fieldErrors));
    }
    req.validatedBody = result.data;
    return next();
  };
}

module.exports = {
  validateBody,
};
