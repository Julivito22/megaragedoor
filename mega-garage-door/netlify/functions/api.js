/**
 * Mega Garage Door & Gates — Netlify Serverless Function
 *
 * Recibe todas las requests de /api/* gracias al redirect en netlify.toml.
 * serverless-http envuelve Express para que funcione como función serverless.
 */

const serverless = require('serverless-http');
const express    = require('express');
const fs         = require('fs');
const cors       = require('cors');

const app = express();

// ── Normalizar path ─────────────────────────────────────────
// Netlify envía event.path = "/.netlify/functions/api/estimate"
// Este middleware lo convierte a "/api/estimate" para que Express lo resuelva.
app.use((req, _res, next) => {
  req.url = req.url.replace(/^\/.netlify\/functions\/[^/]+/, '') || '/';
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Leads store ─────────────────────────────────────────────
// /tmp es el único directorio escribible en funciones serverless.
// Nota: los datos se pierden entre cold starts. Para persistencia
// permanente, conectar Supabase o Airtable (ver README).
const LEADS_FILE = '/tmp/mega-leads.json';

function ensureFile() {
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, '[]', 'utf8');
  }
}
function readLeads() {
  try { ensureFile(); return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
  catch { return []; }
}
function writeLeads(leads) {
  ensureFile();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

// ── POST /api/estimate ──────────────────────────────────────
app.post('/api/estimate', (req, res) => {
  const { name, phone, service, email, urgency, message } = req.body;

  if (!name?.trim())    return res.status(400).json({ error: 'Name is required.' });
  if (!phone?.trim())   return res.status(400).json({ error: 'Phone number is required.' });
  if (!service?.trim()) return res.status(400).json({ error: 'Please select a service.' });

  const lead = {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name:      name.trim(),
    phone:     phone.trim(),
    service:   service.trim(),
    email:     email?.trim() || null,
    urgency:   urgency || null,
    message:   message?.trim() || null,
    status:    'new',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  try {
    const leads = readLeads();
    leads.push(lead);
    writeLeads(leads);

    console.log(`📋 NEW LEAD | ${lead.name} | ${lead.phone} | ${lead.service}`);

    return res.status(201).json({
      success: true,
      id: lead.id,
      message: 'Estimate request received. We will contact you within the hour.',
    });
  } catch (err) {
    console.error('Error saving lead:', err);
    return res.status(500).json({ error: 'Server error. Please call us at (954) 287-2788.' });
  }
});

// ── GET /api/leads ──────────────────────────────────────────
app.get('/api/leads', (req, res) => {
  try {
    const leads  = readLeads();
    const sorted = leads.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ total: leads.length, leads: sorted });
  } catch {
    return res.status(500).json({ error: 'Could not read leads.' });
  }
});

// ── PATCH /api/leads/:id ────────────────────────────────────
app.patch('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['new', 'contacted', 'closed'];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  }

  try {
    const leads = readLeads();
    const idx   = leads.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Lead not found.' });

    leads[idx].status    = status;
    leads[idx].updatedAt = new Date().toISOString();
    writeLeads(leads);

    return res.json({ success: true, lead: leads[idx] });
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/leads/:id ───────────────────────────────────
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
  } catch {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports.handler = serverless(app);
