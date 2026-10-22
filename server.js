const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

if (!fs.existsSync('./data')) fs.mkdirSync('./data');

const app = express();
const db = new Database('./data/planner.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL,
    skills       TEXT NOT NULL DEFAULT '[]',
    available    INTEGER NOT NULL DEFAULT 1,
    shift_start  TEXT NOT NULL DEFAULT '08:00',
    shift_end    TEXT NOT NULL DEFAULT '17:00',
    avatar_color TEXT NOT NULL DEFAULT '#4ECDC4',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    asset_type   TEXT NOT NULL DEFAULT 'vehicle',
    identifier   TEXT DEFAULT '',
    make         TEXT DEFAULT '',
    model        TEXT DEFAULT '',
    year         INTEGER,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    location         TEXT NOT NULL DEFAULT '',
    priority         TEXT NOT NULL DEFAULT 'medium',
    status           TEXT NOT NULL DEFAULT 'unassigned',
    required_skills  TEXT NOT NULL DEFAULT '[]',
    estimated_hours  REAL NOT NULL DEFAULT 1.0,
    assigned_to      INTEGER REFERENCES team_members(id) ON DELETE SET NULL,
    plan_date        TEXT NOT NULL,
    scheduled_start  TEXT,
    notes            TEXT DEFAULT '',
    asset_id         INTEGER REFERENCES assets(id) ON DELETE SET NULL,
    parts_needed     TEXT NOT NULL DEFAULT '[]',
    source_type      TEXT NOT NULL DEFAULT 'manual',
    source_ref       INTEGER,
    is_candidate     INTEGER NOT NULL DEFAULT 0,
    priority_rank    INTEGER,
    priority_reason  TEXT DEFAULT '',
    notes_log        TEXT NOT NULL DEFAULT '[]',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_wo_plan_date ON work_orders(plan_date);
  CREATE INDEX IF NOT EXISTS idx_wo_assigned  ON work_orders(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_wo_status    ON work_orders(status);

  CREATE TABLE IF NOT EXISTS dvir_defects (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id       INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    description    TEXT NOT NULL,
    severity       TEXT NOT NULL DEFAULT 'medium',
    reported_by    TEXT DEFAULT '',
    reported_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    status         TEXT NOT NULL DEFAULT 'open',
    work_order_id  INTEGER REFERENCES work_orders(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS fault_codes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id       INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    code           TEXT NOT NULL,
    description    TEXT NOT NULL,
    severity       TEXT NOT NULL DEFAULT 'medium',
    detected_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    status         TEXT NOT NULL DEFAULT 'open',
    work_order_id  INTEGER REFERENCES work_orders(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS pm_schedules (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id         INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT DEFAULT '',
    frequency_days   INTEGER NOT NULL,
    required_skills  TEXT NOT NULL DEFAULT '[]',
    estimated_hours  REAL NOT NULL DEFAULT 1.0,
    last_completed   TEXT,
    next_due         TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'upcoming',
    work_order_id    INTEGER REFERENCES work_orders(id) ON DELETE SET NULL
  );
`);

// ── Migrations (for existing DBs) ─────────────────────────────────────────────

function addColIfMissing(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
addColIfMissing('work_orders', 'asset_id',        'INTEGER REFERENCES assets(id) ON DELETE SET NULL');
addColIfMissing('work_orders', 'parts_needed',    "TEXT NOT NULL DEFAULT '[]'");
addColIfMissing('work_orders', 'source_type',     "TEXT NOT NULL DEFAULT 'manual'");
addColIfMissing('work_orders', 'source_ref',      'INTEGER');
addColIfMissing('work_orders', 'is_candidate',    'INTEGER NOT NULL DEFAULT 0');
addColIfMissing('work_orders', 'priority_rank',   'INTEGER');
addColIfMissing('work_orders', 'priority_reason', "TEXT DEFAULT ''");
addColIfMissing('work_orders', 'notes_log',       "TEXT NOT NULL DEFAULT '[]'");

// ── Priority scoring (mirrors client-side suggest.js) ─────────────────────────

const PRIORITY_SCORE = { critical: 100, high: 60, medium: 30, low: 10 };
const RISK_RULES = [
  { pattern: /brake|steering|tire|tyre/i,                    boost: 45, reason: 'Safety-critical system — vehicle must be taken out of service' },
  { pattern: /fault|alarm|failure|down|outage/i,             boost: 40, reason: 'Live fault — risk of breakdown or cascading damage' },
  { pattern: /fire|suppression|sprinkler/i,                  boost: 35, reason: 'Fire safety system — regulatory compliance required' },
  { pattern: /dvir|driver.reported|inspection.defect/i,      boost: 35, reason: 'Driver-reported defect — DOT compliance risk' },
  { pattern: /engine|transmission|drivetrain/i,              boost: 32, reason: 'Drivetrain fault — vehicle out-of-service risk' },
  { pattern: /compliance|inspection|annual|monthly|test/i,   boost: 30, reason: 'Compliance or scheduled inspection — regulatory deadline' },
  { pattern: /leak|water|flood|drain|standing/i,             boost: 28, reason: 'Fluid leak — environmental liability and equipment damage' },
  { pattern: /electrical|panel|circuit|breaker|power/i,      boost: 20, reason: 'Electrical fault — shock or fire risk if deferred' },
  { pattern: /oil|fluid|coolant|filter/i,                    boost: 15, reason: 'Routine fluid/filter — deferral compounds wear cost' },
  { pattern: /safety|hazard|slip|trip/i,                     boost: 25, reason: 'Safety/liability issue — injury risk if unaddressed' },
];

function scoreItem(title, description, sourceType) {
  let score = 0;
  const text = `${title} ${description}`;
  const reasons = [];
  if (sourceType === 'dvir')       { score += 35; reasons.push('Driver-reported defect — DOT compliance risk'); }
  else if (sourceType === 'fault_code') { score += 30; reasons.push('Diagnostic fault code — vehicle out-of-service risk'); }
  else if (sourceType === 'pm')    { score += 20; reasons.push('Overdue preventive maintenance — deferral compounds cost'); }
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(text)) { score += rule.boost; reasons.push(rule.reason); }
  }
  // Deduplicate reasons
  return { score, reasons: [...new Set(reasons)] };
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

const memberCount = db.prepare('SELECT COUNT(*) as c FROM team_members').get();
if (memberCount.c === 0) {
  const today = new Date().toISOString().split('T')[0];

  const insertMember = db.prepare(
    'INSERT INTO team_members (name, role, skills, shift_start, shift_end, avatar_color) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertMember.run('Marcus Rivera',  'HVAC Technician',     JSON.stringify(['HVAC','Refrigeration','Electrical']), '07:00','16:00','#FF6B35');
  insertMember.run('Sarah Chen',     'Electrician',         JSON.stringify(['Electrical','Low Voltage','PLC']),    '08:00','17:00','#4ECDC4');
  insertMember.run('James Okafor',   'Diesel Mechanic',     JSON.stringify(['Diesel','Brakes','Electrical','Welding']), '06:00','15:00','#45B7D1');
  insertMember.run('Priya Nair',     'Fleet Technician',    JSON.stringify(['Diesel','HVAC','Tires','General']),   '08:00','17:00','#96CEB4');

  // Assets
  const insertAsset = db.prepare(
    'INSERT INTO assets (name, asset_type, identifier, make, model, year) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const a1 = insertAsset.run('Truck 12',   'vehicle',   'PLT-4821', 'Ford',       'F-750',    2019);
  const a2 = insertAsset.run('Truck 7',    'vehicle',   'PLT-3390', 'Freightliner','M2 106',  2021);
  const a3 = insertAsset.run('Van 4B',     'vehicle',   'VAN-0042', 'Ford',       'Transit',  2022);
  const a4 = insertAsset.run('Gen Unit 1', 'equipment', 'SN-88234', 'Cummins',    'C100D6',   2018);

  // Work Orders
  const insertWO = db.prepare(`
    INSERT INTO work_orders (title, description, location, priority, status, required_skills,
      estimated_hours, assigned_to, plan_date, scheduled_start, asset_id, source_type, is_candidate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertWO.run('Engine coolant leak','Coolant pooling under engine bay after morning pre-trip. Must be fixed before vehicle returns to service.','Yard Bay 3','critical','unassigned',JSON.stringify(['Diesel']),2.5,null,today,'08:00',a1.lastInsertRowid,'manual',0);
  insertWO.run('Rear brake pad replacement','Rear brake pads worn below 2mm minimum. Driver flagged on pre-trip DVIR. Vehicle grounded until repaired.','Yard Bay 1','high','unassigned',JSON.stringify(['Brakes']),2.0,null,today,'09:00',a3.lastInsertRowid,'dvir',0);
  insertWO.run('Electrical panel inspection','Annual safety inspection of main electrical panel in operations building. Check breakers, grounding, and arc-fault protection.','Electrical Room B','high','unassigned',JSON.stringify(['Electrical']),2.0,null,today,'10:00',null,'manual',0);
  insertWO.run('Generator quarterly PM','Quarterly PM: change oil, replace fuel and air filters, perform 30-min load test, inspect belts and battery terminals.','Generator Room','medium','unassigned',JSON.stringify(['Diesel','Electrical']),3.0,null,today,'13:00',a4.lastInsertRowid,'pm',0);
  insertWO.run('Tire rotation & inspection','Scheduled tire rotation at 15k mile interval. Inspect tread depth and sidewalls, check and set PSI.','Yard Bay 2','medium','unassigned',JSON.stringify(['Tires']),1.5,null,today,'11:00',a2.lastInsertRowid,'manual',0);
  insertWO.run('Transmission fluid flush','High mileage service — drain and refill automatic transmission fluid, replace filter.','Yard Bay 1','high','unassigned',JSON.stringify(['Diesel']),2.0,null,today,'14:00',a1.lastInsertRowid,'manual',0);
  insertWO.run('Windshield wiper replacement','Replace worn wiper blades on both vehicles flagged in DVIR. Includes Van 4B and Truck 7.','Yard','low','unassigned',JSON.stringify(['General']),0.5,null,today,'08:30',a3.lastInsertRowid,'dvir',0);

  // DVIR Defects
  const insertDVIR = db.prepare(
    'INSERT INTO dvir_defects (asset_id, description, severity, reported_by) VALUES (?, ?, ?, ?)'
  );
  insertDVIR.run(a1.lastInsertRowid, 'Left mirror cracked — obstructed rear view', 'high', 'D. Thompson');
  insertDVIR.run(a2.lastInsertRowid, 'Check engine light on, rough idle at startup', 'critical', 'R. Santos');
  insertDVIR.run(a3.lastInsertRowid, 'Windshield wiper blade streaking, poor visibility in rain', 'medium', 'K. Williams');

  // Fault Codes
  const insertFault = db.prepare(
    'INSERT INTO fault_codes (asset_id, code, description, severity) VALUES (?, ?, ?, ?)'
  );
  insertFault.run(a2.lastInsertRowid, 'P0300', 'Random/Multiple Cylinder Misfire Detected', 'critical');
  insertFault.run(a1.lastInsertRowid, 'P0128', 'Coolant Temperature Below Thermostat Regulating Temperature', 'high');

  // PM Schedules
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const fmt = d => d.toISOString().split('T')[0];

  const insertPM = db.prepare(`
    INSERT INTO pm_schedules (asset_id, title, description, frequency_days, required_skills,
      estimated_hours, next_due, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPM.run(a1.lastInsertRowid,'Oil & Filter Change — Truck 12','15,000 mile interval oil and filter service',90,JSON.stringify(['Diesel']),1.5,fmt(threeDaysAgo),'overdue');
  insertPM.run(a2.lastInsertRowid,'DOT Safety Inspection — Truck 7','Annual DOT compliance inspection',365,JSON.stringify(['Diesel','Brakes']),4.0,fmt(yesterday),'due');
  insertPM.run(a3.lastInsertRowid,'Van 4B 6-Month Service','Oil, tire rotation, brake check',180,JSON.stringify(['Diesel','Tires','Brakes']),2.5,fmt(nextWeek),'upcoming');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// ── Helper ────────────────────────────────────────────────────────────────────

function parseWO(r) {
  if (!r) return null;
  return {
    ...r,
    required_skills: JSON.parse(r.required_skills || '[]'),
    parts_needed: JSON.parse(r.parts_needed || '[]'),
    notes_log: JSON.parse(r.notes_log || '[]'),
    is_candidate: r.is_candidate === 1,
  };
}

// ── Team Members ──────────────────────────────────────────────────────────────

app.get('/api/team', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const members = db.prepare('SELECT * FROM team_members ORDER BY name').all();
  const loads = db.prepare(`
    SELECT assigned_to, COUNT(*) as count, SUM(estimated_hours) as total_hours
    FROM work_orders
    WHERE plan_date = ? AND assigned_to IS NOT NULL AND status != 'completed'
    GROUP BY assigned_to
  `).all(date);
  const loadMap = {};
  loads.forEach(l => { loadMap[l.assigned_to] = l; });
  res.json(members.map(m => ({
    ...m, skills: JSON.parse(m.skills), available: m.available === 1,
    assigned_count: loadMap[m.id]?.count || 0,
    assigned_hours: loadMap[m.id]?.total_hours || 0
  })));
});

app.post('/api/team', (req, res) => {
  const { name, role, skills = [], shift_start = '08:00', shift_end = '17:00', avatar_color = '#4ECDC4' } = req.body;
  if (!name?.trim() || !role?.trim()) return res.status(400).json({ error: 'Name and role required' });
  const result = db.prepare(
    'INSERT INTO team_members (name, role, skills, shift_start, shift_end, avatar_color) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), role.trim(), JSON.stringify(skills), shift_start, shift_end, avatar_color);
  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...member, skills: JSON.parse(member.skills), available: member.available === 1 });
});

app.put('/api/team/:id', (req, res) => {
  const { name, role, skills, shift_start, shift_end, avatar_color, available } = req.body;
  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE team_members SET name=?, role=?, skills=?, shift_start=?, shift_end=?, avatar_color=?, available=? WHERE id=?`).run(
    name ?? existing.name, role ?? existing.role,
    skills !== undefined ? JSON.stringify(skills) : existing.skills,
    shift_start ?? existing.shift_start, shift_end ?? existing.shift_end,
    avatar_color ?? existing.avatar_color,
    available !== undefined ? (available ? 1 : 0) : existing.available,
    req.params.id
  );
  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  res.json({ ...member, skills: JSON.parse(member.skills), available: member.available === 1 });
});

app.delete('/api/team/:id', (req, res) => {
  db.prepare('UPDATE work_orders SET assigned_to=NULL, status="unassigned" WHERE assigned_to=?').run(req.params.id);
  db.prepare('DELETE FROM team_members WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Assets ────────────────────────────────────────────────────────────────────

app.get('/api/assets', (_req, res) => {
  const assets = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM dvir_defects WHERE asset_id=a.id AND status='open') as open_dvir,
      (SELECT COUNT(*) FROM fault_codes WHERE asset_id=a.id AND status='open') as open_faults
    FROM assets a ORDER BY a.name
  `).all();
  res.json(assets);
});

app.post('/api/assets', (req, res) => {
  const { name, asset_type='vehicle', identifier='', make='', model='', year } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare(
    'INSERT INTO assets (name, asset_type, identifier, make, model, year) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), asset_type, identifier, make, model, year || null);
  res.json(db.prepare('SELECT * FROM assets WHERE id=?').get(result.lastInsertRowid));
});

app.put('/api/assets/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const { name, asset_type, identifier, make, model, year } = req.body;
  db.prepare('UPDATE assets SET name=?, asset_type=?, identifier=?, make=?, model=?, year=? WHERE id=?').run(
    name ?? e.name, asset_type ?? e.asset_type, identifier ?? e.identifier,
    make ?? e.make, model ?? e.model, year ?? e.year, req.params.id
  );
  res.json(db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id));
});

app.delete('/api/assets/:id', (req, res) => {
  db.prepare('DELETE FROM assets WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── DVIR Defects ──────────────────────────────────────────────────────────────

app.get('/api/dvir', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT d.*, a.name as asset_name FROM dvir_defects d LEFT JOIN assets a ON d.asset_id=a.id';
  if (status) q += ` WHERE d.status=? ORDER BY d.reported_at DESC`;
  else q += ' ORDER BY d.reported_at DESC';
  res.json(status ? db.prepare(q).all(status) : db.prepare(q).all());
});

app.post('/api/dvir', (req, res) => {
  const { asset_id, description, severity='medium', reported_by='' } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Description required' });
  const result = db.prepare(
    'INSERT INTO dvir_defects (asset_id, description, severity, reported_by) VALUES (?, ?, ?, ?)'
  ).run(asset_id || null, description.trim(), severity, reported_by);
  const row = db.prepare('SELECT d.*, a.name as asset_name FROM dvir_defects d LEFT JOIN assets a ON d.asset_id=a.id WHERE d.id=?').get(result.lastInsertRowid);
  res.json(row);
});

app.put('/api/dvir/:id/dismiss', (req, res) => {
  db.prepare("UPDATE dvir_defects SET status='dismissed' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/dvir/:id/create-work-order', (req, res) => {
  const defect = db.prepare('SELECT d.*, a.name as asset_name FROM dvir_defects d LEFT JOIN assets a ON d.asset_id=a.id WHERE d.id=?').get(req.params.id);
  if (!defect) return res.status(404).json({ error: 'Not found' });
  const today = new Date().toISOString().split('T')[0];
  const autoTitle = `DVIR: ${defect.description.substring(0, 60)}`;
  const autoDesc = `Reported by: ${defect.reported_by || 'Driver'}. ${defect.description}`;
  const { reasons } = scoreItem(defect.description, '', 'dvir');
  const {
    title = autoTitle,
    description = autoDesc,
    priority = defect.severity,
    required_skills = [],
    estimated_hours = 1.0,
    location = '',
    notes = '',
    asset_id = defect.asset_id,
    scheduled_start = null,
  } = req.body || {};
  const result = db.prepare(`
    INSERT INTO work_orders (title, description, priority, source_type, source_ref, is_candidate,
      asset_id, plan_date, priority_reason, required_skills, estimated_hours, location, notes, scheduled_start)
    VALUES (?, ?, ?, 'dvir', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, priority, defect.id, asset_id || null, today, reasons.join('; '),
    JSON.stringify(required_skills), estimated_hours, location, notes, scheduled_start);
  db.prepare("UPDATE dvir_defects SET status='work_order_created', work_order_id=? WHERE id=?").run(result.lastInsertRowid, req.params.id);
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(result.lastInsertRowid);
  res.json(parseWO(wo));
});

// ── Fault Codes ───────────────────────────────────────────────────────────────

app.get('/api/fault-codes', (req, res) => {
  const { status } = req.query;
  let q = 'SELECT f.*, a.name as asset_name FROM fault_codes f LEFT JOIN assets a ON f.asset_id=a.id';
  if (status) q += ` WHERE f.status=? ORDER BY f.detected_at DESC`;
  else q += ' ORDER BY f.detected_at DESC';
  res.json(status ? db.prepare(q).all(status) : db.prepare(q).all());
});

app.post('/api/fault-codes', (req, res) => {
  const { asset_id, code, description, severity='medium' } = req.body;
  if (!code?.trim() || !description?.trim()) return res.status(400).json({ error: 'Code and description required' });
  const result = db.prepare(
    'INSERT INTO fault_codes (asset_id, code, description, severity) VALUES (?, ?, ?, ?)'
  ).run(asset_id || null, code.trim(), description.trim(), severity);
  const row = db.prepare('SELECT f.*, a.name as asset_name FROM fault_codes f LEFT JOIN assets a ON f.asset_id=a.id WHERE f.id=?').get(result.lastInsertRowid);
  res.json(row);
});

app.put('/api/fault-codes/:id/dismiss', (req, res) => {
  db.prepare("UPDATE fault_codes SET status='dismissed' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/fault-codes/:id/create-work-order', (req, res) => {
  const fault = db.prepare('SELECT f.*, a.name as asset_name FROM fault_codes f LEFT JOIN assets a ON f.asset_id=a.id WHERE f.id=?').get(req.params.id);
  if (!fault) return res.status(404).json({ error: 'Not found' });
  const today = new Date().toISOString().split('T')[0];
  const autoTitle = `Fault ${fault.code} — ${fault.asset_name || 'Unknown asset'}`;
  const autoDesc = `Fault code ${fault.code}: ${fault.description}`;
  const { reasons } = scoreItem(fault.description, fault.code, 'fault_code');
  const {
    title = autoTitle,
    description = autoDesc,
    priority = fault.severity,
    required_skills = ['Diesel', 'Electrical'],
    estimated_hours = 2.0,
    location = '',
    notes = '',
    asset_id = fault.asset_id,
    scheduled_start = null,
  } = req.body || {};
  const result = db.prepare(`
    INSERT INTO work_orders (title, description, priority, source_type, source_ref, is_candidate,
      asset_id, plan_date, priority_reason, required_skills, estimated_hours, location, notes, scheduled_start)
    VALUES (?, ?, ?, 'fault_code', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, priority, fault.id, asset_id || null, today, reasons.join('; '),
    JSON.stringify(required_skills), estimated_hours, location, notes, scheduled_start);
  db.prepare("UPDATE fault_codes SET status='work_order_created', work_order_id=? WHERE id=?").run(result.lastInsertRowid, req.params.id);
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(result.lastInsertRowid);
  res.json(parseWO(wo));
});

// ── PM Schedules ──────────────────────────────────────────────────────────────

app.get('/api/pm-schedules', (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  // Auto-update statuses
  db.prepare("UPDATE pm_schedules SET status='overdue' WHERE next_due < ? AND status NOT IN ('work_order_created')").run(today);
  db.prepare("UPDATE pm_schedules SET status='due' WHERE next_due = ? AND status NOT IN ('work_order_created','overdue')").run(today);
  const rows = db.prepare('SELECT p.*, a.name as asset_name FROM pm_schedules p LEFT JOIN assets a ON p.asset_id=a.id ORDER BY p.next_due').all();
  res.json(rows.map(r => ({ ...r, required_skills: JSON.parse(r.required_skills || '[]') })));
});

app.post('/api/pm-schedules', (req, res) => {
  const { asset_id, title, description='', frequency_days, required_skills=[], estimated_hours=1.0, next_due } = req.body;
  if (!title?.trim() || !frequency_days || !next_due) return res.status(400).json({ error: 'Title, frequency_days, next_due required' });
  const result = db.prepare(`
    INSERT INTO pm_schedules (asset_id, title, description, frequency_days, required_skills, estimated_hours, next_due)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(asset_id || null, title.trim(), description, frequency_days, JSON.stringify(required_skills), estimated_hours, next_due);
  const row = db.prepare('SELECT p.*, a.name as asset_name FROM pm_schedules p LEFT JOIN assets a ON p.asset_id=a.id WHERE p.id=?').get(result.lastInsertRowid);
  res.json({ ...row, required_skills: JSON.parse(row.required_skills) });
});

app.put('/api/pm-schedules/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM pm_schedules WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const { title, description, frequency_days, required_skills, estimated_hours, next_due, asset_id } = req.body;
  db.prepare(`UPDATE pm_schedules SET title=?, description=?, frequency_days=?, required_skills=?, estimated_hours=?, next_due=?, asset_id=? WHERE id=?`).run(
    title ?? e.title, description ?? e.description, frequency_days ?? e.frequency_days,
    required_skills !== undefined ? JSON.stringify(required_skills) : e.required_skills,
    estimated_hours ?? e.estimated_hours, next_due ?? e.next_due,
    asset_id !== undefined ? asset_id : e.asset_id, req.params.id
  );
  const row = db.prepare('SELECT p.*, a.name as asset_name FROM pm_schedules p LEFT JOIN assets a ON p.asset_id=a.id WHERE p.id=?').get(req.params.id);
  res.json({ ...row, required_skills: JSON.parse(row.required_skills) });
});

app.delete('/api/pm-schedules/:id', (req, res) => {
  db.prepare('DELETE FROM pm_schedules WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/pm-schedules/:id/create-work-order', (req, res) => {
  const pm = db.prepare('SELECT p.*, a.name as asset_name FROM pm_schedules p LEFT JOIN assets a ON p.asset_id=a.id WHERE p.id=?').get(req.params.id);
  if (!pm) return res.status(404).json({ error: 'Not found' });
  const today = new Date().toISOString().split('T')[0];
  const { reasons } = scoreItem(pm.title, pm.description, 'pm');
  const pmSkills = JSON.parse(pm.required_skills || '[]');
  const {
    title = `PM: ${pm.title}`,
    description = pm.description,
    priority = 'medium',
    required_skills = pmSkills,
    estimated_hours = pm.estimated_hours,
    location = '',
    notes = '',
    asset_id = pm.asset_id,
    scheduled_start = null,
  } = req.body || {};
  const result = db.prepare(`
    INSERT INTO work_orders (title, description, priority, source_type, source_ref, is_candidate,
      asset_id, plan_date, required_skills, estimated_hours, priority_reason, location, notes, scheduled_start)
    VALUES (?, ?, ?, 'pm', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, priority, pm.id, asset_id || null, today,
    JSON.stringify(required_skills), estimated_hours, reasons.join('; '), location, notes, scheduled_start);
  db.prepare("UPDATE pm_schedules SET status='work_order_created', work_order_id=? WHERE id=?").run(result.lastInsertRowid, req.params.id);
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(result.lastInsertRowid);
  res.json(parseWO(wo));
});

app.put('/api/pm-schedules/:id/complete', (req, res) => {
  const pm = db.prepare('SELECT * FROM pm_schedules WHERE id=?').get(req.params.id);
  if (!pm) return res.status(404).json({ error: 'Not found' });
  const today = new Date().toISOString().split('T')[0];
  const next = new Date(); next.setDate(next.getDate() + pm.frequency_days);
  const nextDue = next.toISOString().split('T')[0];
  db.prepare("UPDATE pm_schedules SET last_completed=?, next_due=?, status='upcoming', work_order_id=NULL WHERE id=?").run(today, nextDue, req.params.id);
  res.json(db.prepare('SELECT * FROM pm_schedules WHERE id=?').get(req.params.id));
});

// ── Work Orders ───────────────────────────────────────────────────────────────

app.get('/api/work-orders', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT w.*, t.name as assigned_to_name, a.name as asset_name
    FROM work_orders w
    LEFT JOIN team_members t ON w.assigned_to=t.id
    LEFT JOIN assets a ON w.asset_id=a.id
    WHERE w.plan_date=?
    ORDER BY
      CASE w.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      w.created_at
  `).all(date);
  res.json(rows.map(parseWO));
});

app.post('/api/work-orders', (req, res) => {
  const {
    title, description='', location='', priority='medium', required_skills=[],
    estimated_hours=1.0, plan_date, scheduled_start=null, notes='',
    asset_id=null, parts_needed=[], source_type='manual', is_candidate=0
  } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const date = plan_date || new Date().toISOString().split('T')[0];
  const result = db.prepare(`
    INSERT INTO work_orders (title, description, location, priority, required_skills, estimated_hours,
      plan_date, scheduled_start, notes, asset_id, parts_needed, source_type, is_candidate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title.trim(), description, location, priority, JSON.stringify(required_skills),
    estimated_hours, date, scheduled_start, notes, asset_id, JSON.stringify(parts_needed), source_type, is_candidate ? 1 : 0);
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(result.lastInsertRowid);
  res.json(parseWO(wo));
});

app.put('/api/work-orders/:id', (req, res) => {
  const e = db.prepare('SELECT * FROM work_orders WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const { title, description, location, priority, required_skills, estimated_hours, scheduled_start, notes, asset_id, parts_needed } = req.body;
  db.prepare(`
    UPDATE work_orders SET title=?, description=?, location=?, priority=?, required_skills=?,
      estimated_hours=?, scheduled_start=?, notes=?, asset_id=?, parts_needed=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    title ?? e.title, description ?? e.description, location ?? e.location,
    priority ?? e.priority,
    required_skills !== undefined ? JSON.stringify(required_skills) : e.required_skills,
    estimated_hours ?? e.estimated_hours,
    scheduled_start !== undefined ? scheduled_start : e.scheduled_start,
    notes ?? e.notes,
    asset_id !== undefined ? asset_id : e.asset_id,
    parts_needed !== undefined ? JSON.stringify(parts_needed) : e.parts_needed,
    req.params.id
  );
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(req.params.id);
  res.json(parseWO(wo));
});

app.put('/api/work-orders/:id/assign', (req, res) => {
  const { assignedTo } = req.body;
  const e = db.prepare('SELECT * FROM work_orders WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE work_orders SET assigned_to=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
    assignedTo || null, assignedTo ? 'in-progress' : 'unassigned', req.params.id
  );
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(req.params.id);
  res.json(parseWO(wo));
});

app.put('/api/work-orders/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['unassigned','in-progress','completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE work_orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(req.params.id);
  res.json(parseWO(wo));
});

app.put('/api/work-orders/:id/confirm', (req, res) => {
  db.prepare('UPDATE work_orders SET is_candidate=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(req.params.id);
  res.json(parseWO(wo));
});

app.put('/api/work-orders/:id/dismiss', (req, res) => {
  const wo = db.prepare('SELECT * FROM work_orders WHERE id=?').get(req.params.id);
  if (!wo) return res.status(404).json({ error: 'Not found' });
  if (wo.source_type === 'dvir' && wo.source_ref) {
    db.prepare("UPDATE dvir_defects SET status='open', work_order_id=NULL WHERE id=?").run(wo.source_ref);
  } else if (wo.source_type === 'fault_code' && wo.source_ref) {
    db.prepare("UPDATE fault_codes SET status='open', work_order_id=NULL WHERE id=?").run(wo.source_ref);
  } else if (wo.source_type === 'pm' && wo.source_ref) {
    db.prepare("UPDATE pm_schedules SET status='due', work_order_id=NULL WHERE id=?").run(wo.source_ref);
  }
  db.prepare('DELETE FROM work_orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/work-orders/:id/notes', (req, res) => {
  const { text, author = 'Supervisor' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Note text required' });
  const wo = db.prepare('SELECT * FROM work_orders WHERE id=?').get(req.params.id);
  if (!wo) return res.status(404).json({ error: 'Not found' });
  const log = JSON.parse(wo.notes_log || '[]');
  log.push({ text: text.trim(), author, ts: new Date().toISOString() });
  db.prepare('UPDATE work_orders SET notes_log=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(JSON.stringify(log), req.params.id);
  const updated = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(req.params.id);
  res.json(parseWO(updated));
});

app.put('/api/work-orders/:id/priority-rank', (req, res) => {
  const { priority_rank, priority_reason = '' } = req.body;
  db.prepare('UPDATE work_orders SET priority_rank=?, priority_reason=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
    priority_rank ?? null, priority_reason, req.params.id
  );
  const wo = db.prepare('SELECT w.*, t.name as assigned_to_name, a.name as asset_name FROM work_orders w LEFT JOIN team_members t ON w.assigned_to=t.id LEFT JOIN assets a ON w.asset_id=a.id WHERE w.id=?').get(req.params.id);
  res.json(parseWO(wo));
});

app.delete('/api/work-orders/:id', (req, res) => {
  db.prepare('DELETE FROM work_orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Unified List ──────────────────────────────────────────────────────────────

app.get('/api/unified-list', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];

  // All work orders for the date
  const workOrders = db.prepare(`
    SELECT w.*, t.name as assigned_to_name, a.name as asset_name
    FROM work_orders w
    LEFT JOIN team_members t ON w.assigned_to=t.id
    LEFT JOIN assets a ON w.asset_id=a.id
    WHERE w.plan_date=? AND w.status != 'completed'
    ORDER BY w.priority_rank ASC, CASE w.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
  `).all(date).map(w => {
    const parsed = parseWO(w);
    const { score, reasons } = scoreItem(w.title, w.description, w.source_type);
    return {
      ...parsed,
      item_type: 'work_order',
      computed_score: (PRIORITY_SCORE[w.priority] || 0) + score,
      computed_reasons: reasons,
    };
  });

  // Open DVIR defects not yet converted
  const dvirItems = db.prepare(`
    SELECT d.*, a.name as asset_name FROM dvir_defects d
    LEFT JOIN assets a ON d.asset_id=a.id
    WHERE d.status='open'
    ORDER BY d.reported_at DESC
  `).all().map(d => {
    const { score, reasons } = scoreItem(d.description, '', 'dvir');
    const sev = d.severity;
    return {
      ...d, item_type: 'dvir',
      computed_score: (PRIORITY_SCORE[sev] || 30) + score,
      computed_reasons: reasons,
    };
  });

  // Open fault codes not yet converted
  const faultItems = db.prepare(`
    SELECT f.*, a.name as asset_name FROM fault_codes f
    LEFT JOIN assets a ON f.asset_id=a.id
    WHERE f.status='open'
    ORDER BY f.detected_at DESC
  `).all().map(f => {
    const { score, reasons } = scoreItem(f.description, f.code, 'fault_code');
    return {
      ...f, item_type: 'fault_code',
      computed_score: (PRIORITY_SCORE[f.severity] || 30) + score,
      computed_reasons: reasons,
    };
  });

  // Due/overdue PMs not yet converted
  const today = date;
  db.prepare("UPDATE pm_schedules SET status='overdue' WHERE next_due < ? AND status NOT IN ('work_order_created')").run(today);
  db.prepare("UPDATE pm_schedules SET status='due' WHERE next_due <= ? AND status='upcoming'").run(today);
  const pmItems = db.prepare(`
    SELECT p.*, a.name as asset_name FROM pm_schedules p
    LEFT JOIN assets a ON p.asset_id=a.id
    WHERE p.status IN ('due','overdue') AND p.work_order_id IS NULL
    ORDER BY p.next_due
  `).all().map(p => {
    const { score, reasons } = scoreItem(p.title, p.description, 'pm');
    return {
      ...p,
      required_skills: JSON.parse(p.required_skills || '[]'),
      item_type: 'pm',
      computed_score: 30 + score,
      computed_reasons: reasons,
    };
  });

  res.json({ workOrders, dvirItems, faultItems, pmItems });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'client/dist/index.html')));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Maintenance Planner API running on http://localhost:${PORT}`));
