const express = require('express');
const supabase = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  const { machine_id, data: inspectionData, photos = [] } = req.body;

  if (!machine_id || !inspectionData) {
    return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
  }

  const { data: machine, error: machineError } = await supabase
    .from('machines')
    .select('id')
    .eq('id', machine_id)
    .single();

  if (machineError || !machine) {
    return res.status(404).json({ error: 'Техника не найдена' });
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert([{ machine_id, driver_id: req.user.id, data: inspectionData, photos }])
    .select('id, created_at')
    .single();

  if (error) {
    console.error('Ошибка при сохранении отчёта:', error);
    return res.status(500).json({ error: 'Не удалось сохранить отчёт' });
  }

  res.status(201).json(report);
});

router.get('/my', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const { data, error } = await supabase
    .from('reports')
    .select('id, created_at, data, machines(name)')
    .eq('driver_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: 'Ошибка загрузки истории' });
  }

  res.json(data);
});

router.get('/', auth, async (req, res) => {
  const { machine_id, limit = 20 } = req.query;

  let query = supabase
    .from('reports')
    .select('id, created_at, data, photos, machines(name), drivers(name)')
    .order('created_at', { ascending: false })
    .limit(Math.min(parseInt(limit), 100));

  if (machine_id) query = query.eq('machine_id', machine_id);

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Ошибка загрузки отчётов' });
  }

  res.json(data);
});

module.exports = router;
