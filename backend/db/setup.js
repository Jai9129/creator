// db/setup.js — Run once to create all tables: node db/setup.js
require('dotenv').config({ path: '../.env' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function setup() {
  console.log('🚀 Setting up Creator Alliance database on Neon...\n');

  try {
    // ── Applications table ──────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(120)  NOT NULL,
        email       VARCHAR(200)  NOT NULL,
        phone       VARCHAR(40),
        role        VARCHAR(60)   NOT NULL,
        experience  VARCHAR(80)   NOT NULL,
        portfolio   TEXT,
        bio         TEXT          NOT NULL,
        why         TEXT          NOT NULL,
        availability VARCHAR(60),
        status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
        location    VARCHAR(120)  DEFAULT 'Unknown',
        ip_address  VARCHAR(60),
        submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        reviewed_at  TIMESTAMPTZ,
        reviewed_by  VARCHAR(80),
        admin_note   TEXT
      )
    `;
    console.log('✅ Table: applications');

    // ── Admins table ────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id           SERIAL PRIMARY KEY,
        username     VARCHAR(60)  UNIQUE NOT NULL,
        password_hash VARCHAR(120) NOT NULL,
        display_name VARCHAR(80),
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        last_login   TIMESTAMPTZ
      )
    `;
    console.log('✅ Table: admins');

    // ── Activity log ────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS activity_log (
        id              SERIAL PRIMARY KEY,
        admin_username  VARCHAR(60) NOT NULL,
        action          VARCHAR(60) NOT NULL,
        application_id  INTEGER REFERENCES applications(id) ON DELETE SET NULL,
        applicant_name  VARCHAR(120),
        details         TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('✅ Table: activity_log');

    // ── Indexes ─────────────────────────────────────────────────────────
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_role   ON applications(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_date   ON applications(submitted_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apps_email  ON applications(email)`;
    console.log('✅ Indexes created');

    // ── Seed default admin ───────────────────────────────────────────────
    const bcrypt = require('bcryptjs');
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(adminPass, 12);

    await sql`
      INSERT INTO admins (username, password_hash, display_name)
      VALUES (${adminUser}, ${hash}, 'Super Admin')
      ON CONFLICT (username) DO NOTHING
    `;
    console.log(`✅ Admin seeded: ${adminUser}`);

    // ── Seed sample applications ─────────────────────────────────────────
    const existing = await sql`SELECT COUNT(*) as c FROM applications`;
    if (parseInt(existing[0].c) === 0) {
      await sql`
        INSERT INTO applications (name, email, phone, role, experience, portfolio, bio, why, availability, status, location) VALUES
        ('Riya Sharma',  'riya@gmail.com',   '+91 98765 43210', 'Editor',       'Intermediate (1–3 years)', 'https://riya.design',       'Passionate video editor with 2 years experience in YouTube content creation. Expert in Premiere Pro and After Effects.', 'I love the Creator Alliance vision and want to be part of a growing creative team.',          'Part-time (20h/week)',        'pending',  'Delhi, India'),
        ('Arjun Mehta',  'arjun@outlook.com','+91 98234 56789', 'Developer',    'Advanced (3–5 years)',     'https://github.com/arjun',  'Full-stack developer skilled in React, Node.js and Python. Love building tools that help creative teams move faster.',   'I want to build infrastructure that supercharges creative teams.',                            'Full-time (40h/week)',        'approved', 'Mumbai, India'),
        ('Priya Nair',   'priya@voice.in',   '+91 99123 45678', 'Voice Artist', 'Expert (5+ years)',        'https://priyavoice.in',     '5+ years of voiceover work spanning ads, YouTube channels, and audiobooks. Professional studio setup.',                  'Creator Alliance is the perfect platform to collaborate with top creators globally.',          'Freelance / Project-based',   'pending',  'Bengaluru, India'),
        ('Lucas Ferreira','lucas@design.br', '+55 11 9876-5432','Designer',     'Advanced (3–5 years)',     'https://lucasdesign.com',   'Graphic designer specialising in YouTube thumbnails and brand identities.',                                               'I want to be part of an alliance that values quality creative work.',                         'Full-time (40h/week)',        'pending',  'São Paulo, Brazil'),
        ('Mei Zhang',    'mei@content.cn',   '+86 139 8765 4321','Script Writer','Intermediate (1–3 years)','https://medium.com/@mei',   'Bilingual scriptwriter (English & Mandarin) with experience in tech explainer content.',                                 'Creator Alliance has the ambitious creative culture I have been looking for.',                 'Part-time (20h/week)',        'pending',  'Shanghai, China'),
        ('Karan Singh',  'karan@icloud.com', '',                'Designer',     'Beginner (0–1 years)',     '',                          'Fresh design graduate with strong Figma skills.',                                                                        'Looking for my first professional creative opportunity.',                                     'Full-time (40h/week)',        'rejected', 'Jaipur, India')
      `;
      console.log('✅ Sample applications seeded');
    } else {
      console.log('ℹ️  Applications already exist — skipping seed');
    }

    console.log('\n🎉 Database setup complete! Run: npm start\n');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setup();
