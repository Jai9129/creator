// routes/admin.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { sql } = require('../db/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/admin/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const rows = await sql`
      SELECT * FROM admins WHERE username = ${username} LIMIT 1
    `;
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid credentials' });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    // Update last_login
    await sql`UPDATE admins SET last_login = NOW() WHERE id = ${admin.id}`;

    const token = jwt.sign(
      { id: admin.id, username: admin.username, displayName: admin.display_name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, admin: { username: admin.username, displayName: admin.display_name } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/me ──────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin });
});

// ── GET /api/admin/stats ───────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [counts] = await sql`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE status='pending')      AS pending,
        COUNT(*) FILTER (WHERE status='approved')     AS approved,
        COUNT(*) FILTER (WHERE status='rejected')     AS rejected,
        COUNT(DISTINCT role)                          AS roles_count
      FROM applications
    `;

    const byRole = await sql`
      SELECT role, COUNT(*) as count,
        COUNT(*) FILTER (WHERE status='approved') as approved
      FROM applications GROUP BY role ORDER BY count DESC
    `;

    const recent = await sql`
      SELECT DATE(submitted_at) as day, COUNT(*) as count
      FROM applications
      WHERE submitted_at >= NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day
    `;

    res.json({ counts, byRole, recent });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/activity ────────────────────────────────────────────────
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const logs = await sql`
      SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50
    `;
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
