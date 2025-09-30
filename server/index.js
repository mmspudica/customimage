const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'luce.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      brand TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      category TEXT,
      channel TEXT,
      experience TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

app.use(express.json());

app.post('/api/signup', (req, res) => {
  const { type, brand, phone, email, category = null, channel = null, experience = null, notes = null } = req.body || {};

  if (!type || !brand || !phone || !email) {
    return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
  }

  const normalizedType = type === 'wholesale' ? 'wholesale' : 'seller';

  db.run(
    'INSERT INTO signups (type, brand, phone, email, category, channel, experience, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      normalizedType,
      String(brand).trim(),
      String(phone).trim(),
      String(email).trim(),
      category ? String(category).trim() : null,
      channel ? String(channel).trim() : null,
      experience ? String(experience).trim() : null,
      notes ? String(notes).trim() : null,
    ],
    function (err) {
      if (err) {
        console.error('DB insert error', err);
        return res.status(500).json({ error: '신청 저장 중 오류가 발생했습니다.' });
      }

      return res.status(201).json({ id: this.lastID });
    }
  );
});

app.get('/api/signups', (_req, res) => {
  db.all('SELECT * FROM signups ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('DB select error', err);
      return res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
    }

    res.json(rows);
  });
});

const staticDir = path.join(__dirname, '..');
app.use(express.static(staticDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`LUCE lookbook server running on http://localhost:${PORT}`);
});

const shutdown = signal => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
