const express  = require('express');
const router   = express.Router();
const supabase = require('../db/supabase');

async function enrichExpenses(rows) {
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(r => r.paid_by).filter(Boolean))];
  let memberMap = {};
  if (ids.length) {
    const { data: members } = await supabase
      .from('members').select('id, name').in('id', ids);
    memberMap = Object.fromEntries((members || []).map(m => [m.id, m]));
  }
  return rows.map(row => ({
    id:           row.id,
    title:        row.title,
    amount:       parseFloat(row.amount),
    category:     row.category,
    type:         row.type,
    date:         row.date,
    paidBy:       row.paid_by,
    paidByName:   memberMap[row.paid_by]?.name || null,
    splitBetween: row.split_between || [],
    createdAt:    row.created_at,
  }));
}

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    res.json(await enrichExpenses(data || []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/expenses/summary
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase.from('expenses').select('type, amount');
    if (error) throw error;
    const totalIncome   = data.filter(e => e.type === 'income').reduce((s, e) => s + parseFloat(e.amount), 0);
    const totalExpenses = data.filter(e => e.type === 'expense').reduce((s, e) => s + parseFloat(e.amount), 0);
    res.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/expenses/monthly-total
router.get('/monthly-total', async (req, res) => {
  try {
    const ym = new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from('expenses').select('amount').eq('type', 'expense').like('date', `${ym}%`);
    if (error) throw error;
    res.json({ total: data.reduce((s, e) => s + parseFloat(e.amount), 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('expenses').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Expense not found' });
    const [enriched] = await enrichExpenses([data]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, type = 'expense', date, paidBy, splitBetween = [] } = req.body;
    if (!title || amount === undefined || !category || !date)
      return res.status(400).json({ error: 'title, amount, category and date are required' });
    const { data, error } = await supabase
      .from('expenses')
      .insert({ title, amount: parseFloat(amount), category, type, date, paid_by: paidBy || null, split_between: splitBetween })
      .select().single();
    if (error) throw error;
    const [enriched] = await enrichExpenses([data]);
    res.status(201).json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, category, type, date, paidBy, splitBetween } = req.body;
    const updates = {};
    if (title        !== undefined) updates.title         = title;
    if (amount       !== undefined) updates.amount        = parseFloat(amount);
    if (category     !== undefined) updates.category      = category;
    if (type         !== undefined) updates.type          = type;
    if (date         !== undefined) updates.date          = date;
    if (paidBy       !== undefined) updates.paid_by       = paidBy || null;
    if (splitBetween !== undefined) updates.split_between = splitBetween;
    const { data, error } = await supabase
      .from('expenses').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Expense not found' });
    const [enriched] = await enrichExpenses([data]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
