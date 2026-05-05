const auth = require('./auth');

const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён — нужна роль admin' });
  }
  next();
};

module.exports = [auth, checkAdmin];
