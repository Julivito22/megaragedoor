/**
 * Mega Garage Door & Gates — Backend Server
 * Node.js + Express  |  Compatible with Vercel serverless
 *
 * Routes:
 *   GET  /               → serves public/index.html
 *   POST /api/estimate   → saves a new lead
 *   GET  /api/leads      → returns all leads (admin)
 *   PATCH /api/leads/:id → update lead status
 *   DELETE /api/leads/:id → delete a lead
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Paths ──────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, 'public');

// Vercel's filesystem is read-only except /tmp.
// Locally we write next to the project for convenience.
const IS_VERCEL  = !!process.env.VERCEL;
const LEADS_FILE = IS_VERCEL
  ? '/tmp/leads.json'
  : path.join(__dirname, 'leads.json');

// ── Bootstrap leads store ─────────────────────────────────
function ensureLeadsFile() {
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

// ── Helpers ───────────────────────────────────────────────
function readLeads() {
  try {
    ensureLeadsFile();
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  ensureLeadsFile();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// ── API ───────────────────────────────────────────────────

/**
 * POST /api/estimate
 * Body: { name, phone, service, email?, urgency?, message? }
 */
app.post('/api/estimate', (req, res) => {
  const { name, phone, service, email, urgency, message } = req.body;

  if (!name || !name.trim())    return res.status(400).json({ error: 'Name is required.' });
  if (!phone || !phone.trim())  return res.status(400).json({ error: 'Phone number is required.' });
  if (!service || !service.trim()) return res.status(400).json({ error: 'Please select a service.' });

  const lead = {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name:      name.trim(),
    phone:     phone.trim(),
    service:   service.trim(),
    email:     email ? email.trim() : null,
    urgency:   urgency || null,
    message:   message ? message.trim() : null,
    status:    'new',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  try {
    const leads = readLeads();
    leads.push(lead);
    writeLeads(leads);

    console.log(`\n📋 NEW LEAD [${new Date().toLocaleString()}]`);
    console.log(`   Name   : ${lead.name}`);
    console.log(`   Phone  : ${lead.phone}`);
    console.log(`   Service: ${lead.service}`);
    if (lead.email)   console.log(`   Email  : ${lead.email}`);
    if (lead.message) console.log(`   Note   : ${lead.message}`);
    console.log(`   ID     : ${lead.id}\n`);

    return res.status(201).json({
      success: true,
      id: lead.id,
      message: 'Estimate request received. We will contact you within the hour.',
    });
  } catch (err) {
    console.error('Failed to save lead:', err);
    return res.status(500).json({ error: 'Server error. Please call us at (954) 287-2788.' });
  }
});

/**
 * GET /api/leads
 * Returns all leads sorted newest first.
 */
app.get('/api/leads', (req, res) => {
  try {
    const leads  = readLeads();
    const sorted = leads.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ total: leads.length, leads: sorted });
  } catch (err) {
    return res.status(500).json({ error: 'Could not read leads.' });
  }
});

/**
 * PATCH /api/leads/:id
 * Body: { status: 'new' | 'contacted' | 'closed' }
 */
app.patch('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['new', 'contacted', 'closed'];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  try {
    const leads = readLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lead not found.' });

    leads[idx].status    = status;
    leads[idx].updatedAt = new Date().toISOString();
    writeLeads(leads);

    return res.json({ success: true, lead: leads[idx] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /api/leads/:id
 */
app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  try {
    const leads    = readLeads();
    const filtered = leads.filter(l => l.id !== id);
    if (filtered.length === leads.length) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    writeLeads(filtered);
    return res.json({ success: true, message: `Lead ${id} deleted.` });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Page routing ──────────────────────────────────────────
const PAGES = {
  '/':         'index.html',
  '/services': 'services.html',
  '/about':    'about.html',
  '/areas':    'areas.html',
  '/contact':  'contact.html',
};

app.get('*', (req, res) => {
  const normalised = req.path.replace(/\/$/, '').toLowerCase() || '/';
  const file = PAGES[normalised];
  if (file) return res.sendFile(path.join(PUBLIC_DIR, file));
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Start (local only — Vercel imports the app directly) ──
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀  Mega Garage Door & Gates`);
    console.log(`    Server  : http://localhost:${PORT}`);
    console.log(`    Leads   : ${LEADS_FILE}`);
    console.log(`    Admin   : http://localhost:${PORT}/api/leads\n`);
  });
}

// Required by Vercel — exports the app as a serverless function
module.exports = app;
