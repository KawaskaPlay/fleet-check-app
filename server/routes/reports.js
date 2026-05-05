const express = require('express');
const supabase = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res, next) => {
  try {
    const { machine_id, data: inspectionData, photos = [] } = req.body;
    // клиент шлёт поле "data", в БД оно хранится как "results"

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
      .insert([{ machine_id, driver_id: req.user.id, results: inspectionData, photos }])
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Ошибка при сохранении отчёта:', error);
      return res.status(500).json({ error: error.message || 'Не удалось сохранить отчёт' });
    }

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/my', auth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, created_at, results, machine_id')
      .eq('driver_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: 'Ошибка загрузки истории' });

    // Подтягиваем названия машин отдельно (нет FK constraint для join)
    const ids = [...new Set(reports.map(r => r.machine_id).filter(Boolean))];
    let machineMap = {};
    if (ids.length) {
      const { data: machines } = await supabase
        .from('machines').select('id, name').in('id', ids);
      machineMap = Object.fromEntries((machines || []).map(m => [m.id, m]));
    }

    res.json(reports.map(r => ({ ...r, machines: machineMap[r.machine_id] || null })));
  } catch (err) {
    next(err);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const { machine_id, limit = 20 } = req.query;

    let query = supabase
      .from('reports')
      .select('id, created_at, results, photos, machine_id, driver_id')
      .order('created_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 100));

    if (machine_id) query = query.eq('machine_id', machine_id);

    const { data: reports, error } = await query;
    if (error) return res.status(500).json({ error: 'Ошибка загрузки отчётов' });

    const [{ data: machines }, { data: drivers }] = await Promise.all([
      supabase.from('machines').select('id, name'),
      supabase.from('drivers').select('id, name'),
    ]);

    const machineMap = Object.fromEntries((machines || []).map(m => [m.id, m]));
    const driverMap  = Object.fromEntries((drivers  || []).map(d => [d.id, d]));

    res.json(reports.map(r => ({
      ...r,
      machines: machineMap[r.machine_id] || null,
      drivers:  driverMap[r.driver_id]   || null,
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
