const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// ── MACHINES ──────────────────────────────────────────────────────────────────

router.get('/machines', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/machines', requireAdmin, async (req, res, next) => {
  try {
    const { name, plate_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Название обязательно' });

    const { data, error } = await supabase
      .from('machines')
      .insert([{ name, plate_number }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.put('/machines/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, plate_number } = req.body;
    const { data, error } = await supabase
      .from('machines')
      .update({ name, plate_number })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.delete('/machines/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;

    // Сначала удаляем все отчёты этой машины
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .eq('machine_id', id);
    if (reportsError) throw reportsError;

    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── DRIVERS ───────────────────────────────────────────────────────────────────

router.get('/drivers', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, username, role')
      .order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/drivers', requireAdmin, async (req, res, next) => {
  try {
    const { name, username, password, role = 'driver' } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Имя, логин и пароль обязательны' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase
      .from('drivers')
      .insert([{ name, username, password_hash, role }])
      .select('id, name, username, role')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.put('/drivers/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body;
    const updates = { name, username, role };

    if (password) {
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    const { data, error } = await supabase
      .from('drivers')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, username, role')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.delete('/drivers/:id', requireAdmin, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── REPORTS ───────────────────────────────────────────────────────────────────

router.get('/reports', requireAdmin, async (req, res, next) => {
  try {
    const { machine_id, limit = 50 } = req.query;

    let query = supabase
      .from('reports')
      .select('id, created_at, results, photos, machine_id, driver_id')
      .order('created_at', { ascending: false })
      .limit(Math.min(parseInt(limit), 200));

    if (machine_id) query = query.eq('machine_id', machine_id);

    const { data: reports, error } = await query;
    if (error) throw error;

    // Подтягиваем машины и водителей отдельно (нет FK constraint для join)
    const [{ data: machines }, { data: drivers }] = await Promise.all([
      supabase.from('machines').select('id, name'),
      supabase.from('drivers').select('id, name'),
    ]);

    const machineMap = Object.fromEntries((machines || []).map(m => [m.id, m]));
    const driverMap  = Object.fromEntries((drivers  || []).map(d => [d.id, d]));

    const result = reports.map(r => ({
      ...r,
      machines: machineMap[r.machine_id] || null,
      drivers:  driverMap[r.driver_id]   || null,
    }));

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
