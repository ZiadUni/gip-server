const requireRole = (requiredRole) => (req, res, next) => {
  if (!req.user || req.user.role !== requiredRole) {
    return res.status(403).json({ error: res.__('reqRole.noPerms') });
  }
  next();
};

module.exports = requireRole;
