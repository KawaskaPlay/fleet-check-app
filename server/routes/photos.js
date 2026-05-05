const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const PHOTOS_DIR = path.join(__dirname, '../photos');
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Разрешены только изображения'));
    }
    cb(null, true);
  },
});

router.post('/upload', auth, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не передан' });
    }

    const { machine_id, field = 'photo' } = req.body;

    // Получаем название машины для имени файла
    let machineName = 'machine';
    if (machine_id) {
      const { data: machine } = await supabase
        .from('machines')
        .select('name')
        .eq('id', machine_id)
        .single();
      if (machine?.name) {
        machineName = machine.name;
      }
    }

    // Безопасное имя: только буквы, цифры, дефис
    const safeName = machineName.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '_').replace(/_+/g, '_');

    // Дата до секунды: 2026-05-05_14-30-25
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${safeName}_${field}_${dateStr}${ext}`;

    fs.writeFileSync(path.join(PHOTOS_DIR, filename), req.file.buffer);

    res.json({ filename });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
