// routes/applications.js
const express = require('express');
const { sql } = require('../db/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/applications — public, submit application ───────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, role, experience, portfolio, bio, why, availability, location } = req.body;

  // Validate required fields
  const missing = [];
  if (!name)        missing.push('name');
  if (!email)       missing.push('email');
  if (!role)        missing.push('role');
  if (!experience)  missing.push('experience');
  if (!bio)         missing.push('bio');
  if (!why)         missing.push('why');

  if (missing.length)
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

  const validRoles = ['Editor', 'Designer', 'Developer', 'Manager', 'Script Writer', 'Voice Artist'];
  if (!validRoles.includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  // Duplicate check — same email + role
  const existing = await sql`
    SELECT id FROM applications
    WHERE email = ${email} AND role = ${role}
    AND submitted_at > NOW() - INTERVAL '30 days'
    LIMIT 1
  `;
  if (existing.length)
    return res.status(409).json({ error: 'You already applied for this role recently.' });

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const loc = location || 'Unknown';

    const [app] = await sql`
      INSERT INTO applications (name, email, phone, role, experience, portfolio, bio, why, availability, location, ip_address)
      VALUES (${name}, ${email}, ${phone||null}, ${role}, ${experience}, ${portfolio||null},
              ${bio}, ${why}, ${availability||null}, ${loc}, ${ip})
      RETURNING id, name, role, submitted_at
    `;

    res.status(201).json({ success: true, application: app });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ── GET /api/applications — admin only, list all with filters ─────────────
router.get('/', requireAuth, async (req, res) => {
  const { status, role, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Build dynamic WHERE
    let conditions = [];
    let params = [];
    let pi = 1;

    if (status && status !== 'all') {
      conditions.push(`status = $${pi++}`);
      params.push(status);
    }
    if (role && role !== 'all') {
      conditions.push(`role = $${pi++}`);
      params.push(role);
    }
    if (search) {
      conditions.push(`(name ILIKE $${pi} OR email ILIKE $${pi} OR location ILIKE $${pi})`);
      params.push(`%${search}%`);
      pi++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Use tagged template for simple queries, raw for dynamic
    const apps = await sql(
      `SELECT id, name, email, phone, role, experience, portfolio, bio, why,
              availability, status, location, submitted_at, reviewed_at, reviewed_by, admin_note
       FROM applications ${where}
       ORDER BY submitted_at DESC
       LIMIT $${pi} OFFSET $${pi+1}`,
      [...params, parseInt(limit), offset]
    );

    const [{ total }] = await sql(
      `SELECT COUNT(*) as total FROM applications ${where}`,
      params
    );

    res.json({ applications: apps, total: parseInt(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/applications/:id — admin only, single application ────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [app] = await sql`
      SELECT * FROM applications WHERE id = ${req.params.id}
    `;
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/applications/:id/status — admin only, approve or reject ────
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status, admin_note } = req.body;
  const validStatuses = ['approved', 'rejected', 'pending'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  try {
    const [app] = await sql`
      UPDATE applications
      SET status       = ${status},
          admin_note   = ${admin_note || null},
          reviewed_at  = NOW(),
          reviewed_by  = ${req.admin.username}
      WHERE id = ${req.params.id}
      RETURNING id, name, role, status
    `;
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Log activity
    await sql`
      INSERT INTO activity_log (admin_username, action, application_id, applicant_name, details)
      VALUES (${req.admin.username}, ${status}, ${app.id}, ${app.name},
              ${`Changed status to ${status}${admin_note ? ': ' + admin_note : ''}`})
    `;

    res.json({ success: true, application: app });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/applications/:id — admin only ─────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [app] = await sql`
      DELETE FROM applications WHERE id = ${req.params.id}
      RETURNING id, name
    `;
    if (!app) return res.status(404).json({ error: 'Not found' });

    await sql`
      INSERT INTO activity_log (admin_username, action, applicant_name, details)
      VALUES (${req.admin.username}, 'deleted', ${app.name}, 'Application permanently deleted')
    `;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
