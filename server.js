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
  itemsDb.all('SELECT DISTINCT main_category FROM productCatalog ORDER BY main_category ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.mainCategory));
  });
});

app.get('/api/catalog/sub-categories', (req, res) => {
  const { mainCategory } = req.query;
  itemsDb.all('SELECT DISTINCT sub_category FROM productCatalog WHERE main_category=? AND brand_name=? ORDER BY sub_category ASC', [mainCategory], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.subCategory));
  });
});

app.get('/api/catalog/items', (req, res) => {
  const { mainCategory, subCategory } = req.query;
  itemsDb.all('SELECT * FROM productCatalog WHERE main_category=? AND brand_name=? AND sub_category=? ORDER BY item_name ASC', [mainCategory, subCategory], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.itemName));
  });
});

app.get('/api/catalog/brands', (req, res) => {
  const { mainCategory, subCategory, itemName } = req.query;
  itemsDb.all('SELECT DISTINCT brand_name FROM productCatalog WHERE main_category=? ORDER BY brand_name ASC', [mainCategory, subCategory, itemName], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.brandName));
  });
});

app.get('/api/catalog/colors', (req, res) => {
  const { mainCategory, subCategory, itemName, brandName } = req.query;
  itemsDb.all('SELECT DISTINCT color_ko FROM productCatalog WHERE item_name=? ORDER BY color_ko ASC', [mainCategory, subCategory, itemName, brandName], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.color));
  });
});

app.get('/api/catalog/search-items', (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) return res.json([]);
  itemsDb.all(
    `SELECT item_name, item_code, brand_name, main_category, sub_category, MIN(product_id) as product_id
     FROM productCatalog
     WHERE item_name LIKE ? OR item_code LIKE ?
     GROUP BY item_name, item_code, brand_name, main_category, sub_category
     ORDER BY item_name
     LIMIT 20`,
    [`%${query}%`, `%${query}%`],
    (err, rows) => {
      if (err) return res.status(500).json({error: err.message});
      res.json(rows);
  });
});

// === 서버 시작 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
