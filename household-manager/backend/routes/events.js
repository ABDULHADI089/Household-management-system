const express  = require('express');
const router   = express.Router();
const supabase = require('../db/supabase');

async function enrichEvents(rows) {
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(r => r.assigned_to).filter(Boolean))];
  let memberMap = {};
  if (ids.length) {
    const { data: members } = await supabase
      .from('members').select('id, name').in('id', ids);
    memberMap = Object.fromEntries((members || []).map(m => [m.id, m]));
  }
  return rows.map(row => ({
    id:           row.id,
    title:        row.title,
    description:  row.description,
    date:         row.date,
    time:         row.time,
    category:     row.category,
    assignedTo:   row.assigned_to,
    assigneeName: memberMap[row.assigned_to]?.name || null,
    createdAt:    row.created_at,
  }));
}

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events').select('*').order('date', { ascending: true });
    if (error) throw error;
    res.json(await enrichEvents(data || []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/events/upcoming  — must be before /:id
router.get('/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('events').select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);
    if (error) throw error;
    res.json(await enrichEvents(data || []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });
    const [enriched] = await enrichEvents([data]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/events
router.post('/', async (req, res) => {
  try {
    const { title, description = '', date, time = '', category = 'general', assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!date)  return res.status(400).json({ error: 'date is required' });
    const { data, error } = await supabase
      .from('events')
      .insert({ title, description, date, time, category, assigned_to: assignedTo || null })
      .select().single();
    if (error) throw error;
    const [enriched] = await enrichEvents([data]);
    res.status(201).json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, date, time, category, assignedTo } = req.body;
    const updates = {};
    if (title       !== undefined) updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (date        !== undefined) updates.date        = date;
    if (time        !== undefined) updates.time        = time;
    if (category    !== undefined) updates.category    = category;
    if (assignedTo  !== undefined) updates.assigned_to = assignedTo || null;
    const { data, error } = await supabase
      .from('events').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });
    const [enriched] = await enrichEvents([data]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('events').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
