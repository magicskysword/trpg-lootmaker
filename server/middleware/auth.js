function requireLogin(req, res, next) {
  if (!req.session?.isAuthenticated) {
    return res.status(401).json({ message: '未登录或会话已过期' });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAuthenticated) {
    return res.status(401).json({ message: '未登录或会话已过期' });
  }

  if (!req.session?.isAdminVerified) {
    return res.status(403).json({ message: '需要管理员密码验证' });
  }

  return next();
}

module.exports = {
  requireLogin,
  requireAdmin
};
