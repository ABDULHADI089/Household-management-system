const express  = require('express');
const router   = express.Router();
const supabase = require('../db/supabase');

function mapTask(row, memberMap) {
  const member = row.assigned_to ? memberMap[row.assigned_to] : null;
  return {
    id:            row.id,
    title:         row.title,
    description:   row.description,
    assignedTo:    row.assigned_to,
    dueDate:       row.due_date,
    status:        row.status,
    priority:      row.priority,
    recurring:     row.recurring,
    createdAt:     row.created_at,
    assigneeName:  member?.name         || null,
    assigneeColor: member?.avatar_color || null,
  };
}

// Build a memberMap from an array of tasks in ONE extra query
async function enrichTasks(tasks) {
  if (!tasks.length) return [];
  const ids = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
  let memberMap = {};
  if (ids.length) {
    const { data: members } = await supabase
      .from('members')
      .select('id, name, avatar_color')
      .in('id', ids);
    memberMap = Object.fromEntries((members || []).map(m => [m.id, m]));
  }
  return tasks.map(t => mapTask(t, memberMap));
}

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.status)     query = query.eq('status', req.query.status);
    if (req.query.assignedTo) query = query.eq('assigned_to', req.query.assignedTo);

    const { data, error } = await query;
    if (error) throw error;
    res.json(await enrichTasks(data || []));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/summary  — must be before /:id
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('status');
    if (error) throw error;
    res.json({
      total:      data.length,
      pending:    data.filter(t => t.status === 'pending').length,
      inProgress: data.filter(t => t.status === 'in-progress').length,
      done:       data.filter(t => t.status === 'done').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    const [enriched] = await enrichTasks([data]);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const {
      title, description = '', assignedTo = null,
      dueDate = null, status = 'pending', priority = 'medium', recurring = false,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to: assignedTo || null,
        due_date:    dueDate    || null,
        status,
        priority,
        recurring,
      })
      .select()
      .single();

    if (error) throw error;
    const [enriched] = await enrichTasks([data]);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, status, priority, recurring } = req.body;
    const updates = {};
    if (title       !== undefined) updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (assignedTo  !== undefined) updates.assigned_to = assignedTo || null;
    if (dueDate     !== undefined) updates.due_date    = dueDate    || null;
    if (status      !== undefined) updates.status      = status;
    if (priority    !== undefined) updates.priority    = priority;
    if (recurring   !== undefined) updates.recurring   = recurring;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    const [enriched] = await enrichTasks([data]);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
