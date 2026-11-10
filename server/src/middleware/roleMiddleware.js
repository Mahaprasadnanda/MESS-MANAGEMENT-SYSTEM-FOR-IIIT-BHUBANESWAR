const ApiError = require('../utils/apiError');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'Forbidden: You do not have permission to access this resource.')
      );
    }
    return next();
  };
}

module.exports = {
  authorizeRoles,
};
