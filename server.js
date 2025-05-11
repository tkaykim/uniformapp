const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// === DB 연결 ===
const db = new sqlite3.Database('./database.sqlite');
const itemsDb = new sqlite3.Database('./Itemsdatabase.sqlite');

// === evOrder API ===
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM evOrder ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// === evDesign API ===
app.post('/api/designs', (req, res) => {
  const d = req.body;
  const designNumber = 'DES' + new Date().toISOString().slice(2,10).replace(/-/g, '') + Math.floor(Math.random()*1000).toString().padStart(3, '0');
  db.run(`INSERT INTO evDesign (designNumber, orderId, title, description, driveLink, status, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [designNumber, d.orderId || null, d.title, d.description, d.driveLink, d.status || '착수전', d.createdBy],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, designNumber });
    });
});

app.get('/api/designs', (req, res) => {
  db.all('SELECT * FROM evDesign ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// === evPrint API ===
app.post('/api/prints', (req, res) => {
  const p = req.body;
  const printNumber = 'PRT' + new Date().toISOString().slice(2,10).replace(/-/g, '') + Math.floor(Math.random()*1000).toString().padStart(3, '0');
  db.run(`INSERT INTO evPrint (printNumber, orderId, printMethod, factoryName, factoryContact, deliveryAddress, expectedDate, status, memo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [printNumber, p.orderId || null, p.printMethod, p.factoryName, p.factoryContact, p.deliveryAddress, p.expectedDate, p.status || '발주전', p.memo],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, printNumber });
    });
});

app.get('/api/prints', (req, res) => {
  db.all('SELECT * FROM evPrint ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// === catalog API ===
app.get('/api/catalog/main-categories', (req, res) => {
  itemsDb.all('SELECT DISTINCT mainCategory FROM catalog ORDER BY mainCategory ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.mainCategory));
  });
});

app.get('/api/catalog/sub-categories', (req, res) => {
  const { mainCategory } = req.query;
  itemsDb.all('SELECT DISTINCT subCategory FROM catalog WHERE mainCategory = ? ORDER BY subCategory ASC', [mainCategory], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.subCategory));
  });
});

app.get('/api/catalog/items', (req, res) => {
  const { mainCategory, subCategory } = req.query;
  itemsDb.all('SELECT DISTINCT itemName FROM catalog WHERE mainCategory = ? AND subCategory = ? ORDER BY itemName ASC', [mainCategory, subCategory], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.itemName));
  });
});

app.get('/api/catalog/brands', (req, res) => {
  const { mainCategory, subCategory, itemName } = req.query;
  itemsDb.all('SELECT DISTINCT brandName FROM catalog WHERE mainCategory = ? AND subCategory = ? AND itemName = ? ORDER BY brandName ASC', [mainCategory, subCategory, itemName], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.brandName));
  });
});

app.get('/api/catalog/colors', (req, res) => {
  const { mainCategory, subCategory, itemName, brandName } = req.query;
  itemsDb.all('SELECT DISTINCT color FROM catalog WHERE mainCategory = ? AND subCategory = ? AND itemName = ? AND brandName = ? ORDER BY color ASC', [mainCategory, subCategory, itemName, brandName], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.color));
  });
});

app.get('/api/catalog/search-items', (req, res) => {
  const { query } = req.query;
  const q = `%${query}%`;
  const sql = `SELECT * FROM catalog WHERE mainCategory LIKE ? OR subCategory LIKE ? OR itemName LIKE ? OR brandName LIKE ? OR color LIKE ? LIMIT 50`;
  itemsDb.all(sql, [q, q, q, q, q], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// === 서버 시작 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
