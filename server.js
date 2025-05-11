const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
const catalogDb = new sqlite3.Database(path.join(__dirname, 'itemsdatabase.sqlite'));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ... (주문/발주/디자인/인쇄 API는 기존 그대로) ...

// 카탈로그 main_category 리스트
app.get('/api/catalog/main-categories', (req, res) => {
  catalogDb.all('SELECT DISTINCT main_category FROM productCatalog ORDER BY main_category', (err, rows) => {
    if (err) {
      console.error('main-categories error:', err);
      return res.status(500).json({error: err.message});
    }
    res.json(rows.map(r => r.main_category));
  });
});

// 카탈로그 brand_name 리스트
app.get('/api/catalog/brands', (req, res) => {
  const { main_category } = req.query;
  if (!main_category) return res.status(400).json({error: 'main_category required'});
  catalogDb.all('SELECT DISTINCT brand_name FROM productCatalog WHERE main_category=? ORDER BY brand_name', [main_category], (err, rows) => {
    if (err) {
      console.error('brands error:', err);
      return res.status(500).json({error: err.message});
    }
    res.json(rows.map(r => r.brand_name));
  });
});

// 카탈로그 sub_category 리스트
app.get('/api/catalog/sub-categories', (req, res) => {
  const { main_category, brand_name } = req.query;
  if (!main_category || !brand_name) return res.status(400).json({error: 'main_category, brand_name required'});
  catalogDb.all('SELECT DISTINCT sub_category FROM productCatalog WHERE main_category=? AND brand_name=? ORDER BY sub_category', [main_category, brand_name], (err, rows) => {
    if (err) {
      console.error('sub-categories error:', err);
      return res.status(500).json({error: err.message});
    }
    res.json(rows.map(r => r.sub_category));
  });
});

// 카탈로그 item 리스트
app.get('/api/catalog/items', (req, res) => {
  const { main_category, brand_name, sub_category } = req.query;
  if (!main_category || !brand_name || !sub_category) return res.status(400).json({error: 'main_category, brand_name, sub_category required'});
  catalogDb.all('SELECT * FROM productCatalog WHERE main_category=? AND brand_name=? AND sub_category=? ORDER BY item_name', [main_category, brand_name, sub_category], (err, rows) => {
    if (err) {
      console.error('items error:', err);
      return res.status(500).json({error: err.message});
    }
    res.json(rows);
  });
});

// 제품명/제품코드 검색 (2글자 이상, 색상 중복 제거)
app.get('/api/catalog/search-items', (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) return res.json([]);
  catalogDb.all(
    `SELECT item_name, item_code, brand_name, main_category, sub_category, MIN(product_id) as product_id
     FROM productCatalog
     WHERE item_name LIKE ? OR item_code LIKE ?
     GROUP BY item_name, item_code, brand_name, main_category, sub_category
     ORDER BY item_name
     LIMIT 20`,
    [`%${query}%`, `%${query}%`],
    (err, rows) => {
      if (err) {
        console.error('search-items error:', err);
        return res.status(500).json({error: err.message});
      }
      res.json(rows);
    }
  );
});

// 제품명에 해당하는 색상 리스트
app.get('/api/catalog/colors', (req, res) => {
  const { item_name } = req.query;
  if (!item_name) return res.json([]);
  catalogDb.all(
    `SELECT DISTINCT color_ko FROM productCatalog WHERE item_name=? ORDER BY color_ko`,
    [item_name],
    (err, rows) => {
      if (err) {
        console.error('colors error:', err);
        return res.status(500).json({error: err.message});
      }
      res.json(rows.map(r => r.color_ko));
    }
  );
});

// === 서버 시작 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
