const express  = require('express');
const router   = express.Router();
const supabase = require('../db/supabase');

function mapLog(row, task, member) {
  return {
    id:           row.id,
    taskId:       row.task_id,
    memberId:     row.member_id,
    completedAt:  row.completed_at,
    note:         row.note,
    taskTitle:    task?.title    || 'Unknown',
    taskPriority: task?.priority || null,
    memberName:   member?.name         || 'Unknown',
    memberColor:  member?.avatar_color || '#999',
  };
}

async function enrichLogs(logs) {
  if (!logs.length) return [];

  // Batch-fetch unique tasks and members
  const taskIds   = [...new Set(logs.map(l => l.task_id))];
  const memberIds = [...new Set(logs.map(l => l.member_id))];

  const [{ data: tasks }, { data: members }] = await Promise.all([
    supabase.from('tasks').select('id,title,priority').in('id', taskIds),
    supabase.from('members').select('id,name,avatar_color').in('id', memberIds),
  ]);

  const taskMap   = Object.fromEntries((tasks   || []).map(t => [t.id, t]));
  const memberMap = Object.fromEntries((members || []).map(m => [m.id, m]));

  return logs.map(l => mapLog(l, taskMap[l.task_id], memberMap[l.member_id]));
}

// GET /api/task-logs
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('task_logs')
      .select('*')
      .order('completed_at', { ascending: false });

    if (req.query.memberId) query = query.eq('member_id', req.query.memberId);
    if (req.query.from)     query = query.gte('completed_at', req.query.from);
    if (req.query.to)       query = query.lte('completed_at', req.query.to + 'T23:59:59Z');

    const { data, error } = await query;
    if (error) throw error;
    res.json(await enrichLogs(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/task-logs/summary
router.get('/summary', async (req, res) => {
  try {
    let query = supabase.from('task_logs').select('completed_at');
    if (req.query.memberId) query = query.eq('member_id', req.query.memberId);
    if (req.query.from)     query = query.gte('completed_at', req.query.from);
    if (req.query.to)       query = query.lte('completed_at', req.query.to + 'T23:59:59Z');

    const { data, error } = await query;
    if (error) throw error;

    const dailyMap   = {};
    const weeklyMap  = {};
    const monthlyMap = {};

    data.forEach(l => {
      const day = l.completed_at.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;

      const wk = isoWeek(new Date(l.completed_at));
      weeklyMap[wk] = (weeklyMap[wk] || 0) + 1;

      const mo = l.completed_at.slice(0, 7);
      monthlyMap[mo] = (monthlyMap[mo] || 0) + 1;
    });

    res.json({
      total:   data.length,
      daily:   sortedEntries(dailyMap),
      weekly:  sortedEntries(weeklyMap),
      monthly: sortedEntries(monthlyMap),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/task-logs — member marks task done
router.post('/', async (req, res) => {
  try {
    const { taskId, memberId, note = '' } = req.body;
    if (!taskId || !memberId)
      return res.status(400).json({ error: 'taskId and memberId are required' });

    // Verify task exists
    const { data: task, error: taskErr } = await supabase
      .from('tasks').select('id,title,priority').eq('id', taskId).maybeSingle();
    if (taskErr) throw taskErr;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Insert log
    const { data: log, error: logErr } = await supabase
      .from('task_logs')
      .insert({ task_id: taskId, member_id: memberId, note })
      .select()
      .single();
    if (logErr) throw logErr;

    // Update task status to done
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);

    // Fetch member for enriched response
    const { data: member } = await supabase
      .from('members').select('id,name,avatar_color').eq('id', memberId).maybeSingle();

    res.status(201).json(mapLog(log, task, member));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/task-logs/:id — undo
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('task_logs').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function sortedEntries(map) {
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

module.exports = router;
