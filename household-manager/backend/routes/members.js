const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../db/supabase');

function safeUser(row) {
  const { password: _pw, ...safe } = row;
  return {
    id:          safe.id,
    name:        safe.name,
    email:       safe.email,
    role:        safe.role,
    avatarColor: safe.avatar_color,
    createdAt:   safe.created_at,
  };
}

// GET /api/members
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data.map(safeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Member not found' });
    res.json(safeUser(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members — admin creates member with password
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'member', avatarColor = '#6366f1' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Email uniqueness
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (existing)
      return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('members')
      .insert({
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        password:     hashed,
        role,
        avatar_color: avatarColor,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(safeUser(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/:id — admin updates member
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, avatarColor, password } = req.body;

    // Fetch existing to merge
    const { data: existing, error: fetchErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Member not found' });

    // Email uniqueness
    if (email && email.toLowerCase() !== existing.email) {
      const { data: taken } = await supabase
        .from('members')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (taken) return res.status(409).json({ error: 'Email already in use' });
    }

    if (password && password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const updates = {
      name:         name?.trim()                || existing.name,
      email:        email?.trim().toLowerCase() || existing.email,
      role:         role                        ?? existing.role,
      avatar_color: avatarColor                 ?? existing.avatar_color,
    };
    if (password) updates.password = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(safeUser(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
