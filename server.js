const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./database.sqlite');
const itemsDb = new sqlite3.Database('./Itemsdatabase.sqlite');

// 기본 라우트 (건강검사용)
app.get('/', (req, res) => {
  res.send('Server is running.');
});

// 주문 예시 API
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM evOrder ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
