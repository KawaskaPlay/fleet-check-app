const express = require('express');
const supabase = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('machines')
    .select('id, name, plate_number')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Техника не найдена' });
  }

  res.json(data);
});

module.exports = router;
