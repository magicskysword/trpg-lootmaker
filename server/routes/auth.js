const express = require('express');
const { userPassword, adminPassword } = require('../config');

const router = express.Router();

router.post('/login', (req, res) => {
  const { password } = req.body || {};

  if (!password || password !== userPassword) {
    return res.status(401).json({ message: '密码错误' });
  }

  req.session.isAuthenticated = true;
  req.session.isAdminVerified = false;

  return res.json({ message: '登录成功' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('pf_loot_sid');
    res.json({ message: '已退出登录' });
  });
});

router.post('/admin-login', (req, res) => {
  if (!req.session?.isAuthenticated) {
    return res.status(401).json({ message: '请先完成普通登录' });
  }

  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    return res.status(401).json({ message: '管理员密码错误' });
  }

  req.session.isAdminVerified = true;
  return res.json({ message: '管理员验证成功' });
});

router.get('/session', (req, res) => {
  res.json({
    loggedIn: Boolean(req.session?.isAuthenticated),
    adminVerified: Boolean(req.session?.isAdminVerified)
  });
});

module.exports = router;
