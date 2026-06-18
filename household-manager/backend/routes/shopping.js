const express  = require('express');
const router   = express.Router();
const supabase = require('../db/supabase');

async function enrichItems(rows) {
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(r => r.added_by).filter(Boolean))];
  let memberMap = {};
  if (ids.length) {
    const { data: members } = await supabase
      .from('members').select('id, name').in('id', ids);
    memberMap = Object.fromEntries((members || []).map(m => [m.id, m]));
  }
  return rows.map(row => ({
    id:          row.id,
    item:        row.item,
    quantity:    row.quantity,
    category:    row.category,
    addedBy:     row.added_by,
    addedByName: memberMap[row.added_by]?.name || null,
    purchased:   row.purchased,
    createdAt:   row.created_at,
  }));
}

// GET /api/shopping
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('shopping_items').select('*')
      .order('purchased', { ascending: true })
      .order('created_at', { ascending: false });
    if (req.query.category) query = query.eq('category', req.query.category);
    const { data, error } = await query;
    if (error) throw error;
    res.json(await enrichItems(data || []));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/shopping/remaining
router.get('/remaining', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('shopping_items').select('*', { count: 'exact', head: true }).eq('purchased', false);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/shopping/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shopping_items').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Item not found' });
    const [enriched] = await enrichItems([data]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/shopping
router.post('/', async (req, res) => {
  try {
    const { item, quantity = '1', category = 'other', addedBy, purchased = false } = req.body;
    if (!item) return res.status(400).json({ error: 'item is required' });
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({ item, quantity, category, added_by: addedBy || null, purchased })
      .select().single();
    if (error) throw error;
    const [enriched] = await enrichItems([data]);
    res.status(201).json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/shopping/:id
router.put('/:id', async (req, res) => {
  try {
    const { item, quantity, category, addedBy, purchased } = req.body;
    const updates = {};
    if (item      !== undefined) updates.item      = item;
    if (quantity  !== undefined) updates.quantity  = quantity;
    if (category  !== undefined) updates.category  = category;
    if (addedBy   !== undefined) updates.added_by  = addedBy || null;
    if (purchased !== undefined) updates.purchased = purchased;
    const { data, error } = await supabase
      .from('shopping_items').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Item not found' });
    const [enriched] = await enrichItems([data]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/shopping/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('shopping_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
