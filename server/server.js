require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET не задан в .env');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/photos', express.static(path.join(__dirname, 'photos')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/machines', require('./routes/machines'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/admin', require('./routes/admin'));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Глобальный обработчик ошибок — ловит всё из next(err) в async роутах
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.path}]`, err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, async () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);

  // Прогрев schema cache Supabase — без этого первый запрос к каждой таблице падает
  const supabase = require('./db');
  const tables = ['machines', 'drivers', 'reports'];
  await Promise.all(tables.map(t => supabase.from(t).select('id').limit(1)));
  console.log('Supabase schema cache прогрет');
});
