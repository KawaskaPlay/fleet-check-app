const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Укажите логин и пароль' });
    }

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('id, name, username, password_hash, role')
      .eq('username', username)
      .single();

    if (error || !driver) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (!bcrypt.compareSync(password, driver.password_hash)) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { id: driver.id, name: driver.name, role: driver.role || 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, name: driver.name, id: driver.id, role: driver.role || 'driver' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, role: req.user.role });
});

module.exports = router;
