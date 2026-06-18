const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../db/supabase');

// ─── helpers ─────────────────────────────────────────────────────────────────

function safeUser(row) {
  const { password: _pw, ...safe } = row;
  // normalise snake_case → camelCase for the frontend
  return {
    id:          safe.id,
    name:        safe.name,
    email:       safe.email,
    role:        safe.role,
    avatarColor: safe.avatar_color,
    createdAt:   safe.created_at,
  };
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Only allow signup if NO admin exists yet
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (count > 0)
      return res.status(403).json({ error: 'An admin already exists. Contact your admin to get an account.' });

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (existing)
      return res.status(409).json({ error: 'Email already in use' });

    const hashed = await hashPassword(password);
    const { data, error } = await supabase
      .from('members')
      .insert({
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        password:     hashed,
        role:         'admin',
        avatar_color: '#6366f1',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ user: safeUser(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!member)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await checkPassword(password, member.password);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ user: safeUser(member) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me?id=xxx ──────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const { id, name, email, password, currentPassword, avatarColor } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { data: existing, error: fetchErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'User not found' });

    // Verify current password
    if (!currentPassword)
      return res.status(401).json({ error: 'Current password is required' });
    const valid = await checkPassword(currentPassword, existing.password);
    if (!valid)
      return res.status(401).json({ error: 'Current password is incorrect' });

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
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const updates = {
      name:         name?.trim()                || existing.name,
      email:        email?.trim().toLowerCase() || existing.email,
      avatar_color: avatarColor                 || existing.avatar_color,
    };
    if (password) updates.password = await hashPassword(password);

    const { data: updated, error: updateErr } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    res.json({ user: safeUser(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/status ─────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const { count: adminCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
    const { count: memberCount } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    res.json({ adminExists: adminCount > 0, memberCount: memberCount || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
