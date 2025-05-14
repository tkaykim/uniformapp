const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
const catalogDb = new sqlite3.Database(path.join(__dirname, 'itemsdatabase.sqlite'));
const itemsDbPath = path.join(__dirname, 'itemsdatabase.sqlite');
fs.access(itemsDbPath, fs.constants.F_OK, (err) => {
  if (err) {
    console.error('itemsdatabase.sqlite 파일이 존재하지 않습니다!');
  } else {
    console.log('itemsdatabase.sqlite 파일이 존재합니다!');
  }
});
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/orders', (req, res) => {
    const o = req.body;
    const orderId = new Date().toISOString().slice(0,10).replace(/-/g, '') + Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const now = new Date().toISOString();
    const sizes = ["size_110", "size_120", "size_130", "size_140", "size_150", "size_160", "size_XS", "size_SS", "size_S", "size_M", "size_L", "size_XL", "size_2XL", "size_3XL", "size_4XL", "size_5XL", "size_LL", "size_3L", "size_4L", "size_5L", "size_free", "size_custom"];
    const sizeVals = sizes.map(s => parseInt(o[s]) || 0);
    db.run(
        `INSERT INTO evOrder (
            orderId, groupName, representativeName, representativePhone, managerName,
            mainCategory, subCategory, itemName, brandName, itemCode, color,
            totalPrice, size_110, size_120, size_130, size_140, size_150, size_160, size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL, size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, o.groupName, o.representativeName, o.representativePhone, o.managerName,
         o.mainCategory, o.subCategory, o.itemName, o.brandName, o.itemCode, o.color,
         o.totalPrice, ...sizeVals],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const purchaseNumber = orderId + "-PUR001";
            db.run(
                `INSERT INTO evPurchase (
                    orderId, purchaseNumber, itemName, brandName, itemCode, color,
                    size_110, size_120, size_130, size_140, size_150, size_160, size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL, size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom, totalPurchasePrice, purchaseStatus
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, purchaseNumber, o.itemName, o.brandName, o.itemCode, o.color,
                 ...sizeVals, o.totalPrice, '발주전'],
                function (err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ orderId, purchaseNumber });
                }
            );
        }
    );
});

app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM evOrder', (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.put('/api/orders/:orderId', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k}=?`).join(',');
  const values = Object.values(req.body);
  values.push(req.params.orderId);
  db.run(`UPDATE evOrder SET ${fields} WHERE orderId=?`, values, function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.get('/api/purchases', (req, res) => {
  db.all(`
    SELECT 
      p.*, 
      o.groupName, 
      o.managerName
    FROM evPurchase p
    LEFT JOIN evOrder o ON p.orderId = o.orderId
  `, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.post('/api/purchases', (req, res) => {
  const { orderId, groupName, itemName, itemCode, color, managerName, purchaseStatus, size_110, size_120, size_130, size_140, size_150, size_160, size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL, size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom } = req.body;
  
  // 주문번호가 있는 경우 해당 주문 정보 조회
  if (orderId) {
    db.get('SELECT * FROM evOrder WHERE orderId = ?', [orderId], (err, order) => {
      if (err) {
        console.error('주문 정보 조회 중 오류:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (!order) {
        return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
      }

      // 발주번호 생성 (주문번호 + 현재시간)
      const purchaseNumber = orderId + '_' + Date.now();
      
      // 총수량 계산
      const totalQuantity = [size_110, size_120, size_130, size_140, size_150, size_160, size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL, size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom]
        .reduce((sum, val) => sum + (parseInt(val) || 0), 0);

      // evPurchase에 저장
      const sql = `INSERT INTO evPurchase (
        orderId, purchaseNumber, itemName, brandName, itemCode, color,
        size_110, size_120, size_130, size_140, size_150, size_160,
        size_XS, size_SS, size_S, size_M, size_L, size_XL,
        size_2XL, size_3XL, size_4XL, size_5XL,
        size_LL, size_3L, size_4L, size_5L,
        size_free, size_custom,
        totalPurchasePrice, purchaseStatus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.run(sql, [
        orderId, purchaseNumber, itemName || order.itemName, order.brandName, 
        itemCode || order.itemCode, color || order.color,
        size_110 || order.size_110, size_120 || order.size_120, size_130 || order.size_130,
        size_140 || order.size_140, size_150 || order.size_150, size_160 || order.size_160,
        size_XS || order.size_XS, size_SS || order.size_SS, size_S || order.size_S,
        size_M || order.size_M, size_L || order.size_L, size_XL || order.size_XL,
        size_2XL || order.size_2XL, size_3XL || order.size_3XL, size_4XL || order.size_4XL,
        size_5XL || order.size_5XL, size_LL || order.size_LL, size_3L || order.size_3L,
        size_4L || order.size_4L, size_5L || order.size_5L,
        size_free || order.size_free, size_custom || order.size_custom,
        order.totalPrice, purchaseStatus || '발주전'
      ], function(err) {
        if (err) {
          console.error('발주 등록 중 오류:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ purchaseNumber });
      });
    });
  } else {
    // 주문번호가 없는 경우 (독립적인 발주 등록)
    const purchaseNumber = 'P' + Date.now();
    const totalQuantity = [size_110, size_120, size_130, size_140, size_150, size_160, size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL, size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom]
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);

    const sql = `INSERT INTO evPurchase (
      purchaseNumber, orderId, groupName, itemName, itemCode, color, managerName, 
      purchaseStatus, size_110, size_120, size_130, size_140, size_150, size_160, 
      size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL, 
      size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom, 
      totalQuantity, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))`;

    db.run(sql, [
      purchaseNumber, null, groupName, itemName, itemCode, color, managerName, 
      purchaseStatus || '발주전', size_110, size_120, size_130, size_140, size_150, size_160,
      size_XS, size_SS, size_S, size_M, size_L, size_XL, size_2XL, size_3XL,
      size_4XL, size_5XL, size_LL, size_3L, size_4L, size_5L, size_free, size_custom,
      totalQuantity
    ], function(err) {
      if (err) {
        console.error('발주 등록 중 오류:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ purchaseNumber });
    });
  }
});

app.put('/api/purchases/:purchaseNumber', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k}=?`).join(',');
  const values = Object.values(req.body);
  values.push(req.params.purchaseNumber);
  db.run(`UPDATE evPurchase SET ${fields} WHERE purchaseNumber=?`, values, function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.delete('/api/orders/:orderId', (req, res) => {
  db.run('DELETE FROM evOrder WHERE orderId=?', [req.params.orderId], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.delete('/api/purchases/:purchaseNumber', (req, res) => {
  db.run('DELETE FROM evPurchase WHERE purchaseNumber=?', [req.params.purchaseNumber], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.get('/api/designs', (req, res) => {
  db.all('SELECT * FROM evDesign', (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.post('/api/designs', (req, res) => {
  const d = req.body;
  const now = new Date();
  const ymd = now.toISOString().slice(0,10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const designNumber = `DES${ymd}${rand}`;
  db.run(
    `INSERT INTO evDesign (designNumber, orderId, title, description, driveLink, status, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      designNumber,
      d.orderId || null,
      d.title,
      d.description || null,
      d.driveLink || null,
      d.status || '착수전',
      d.createdBy || null,
      now.toISOString()
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ designNumber });
    }
  );
});

app.put('/api/designs/:designNumber', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k}=?`).join(',');
  const values = Object.values(req.body);
  values.push(req.params.designNumber);
  db.run(`UPDATE evDesign SET ${fields} WHERE designNumber=?`, values, function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.delete('/api/designs/:designNumber', (req, res) => {
  db.run('DELETE FROM evDesign WHERE designNumber=?', [req.params.designNumber], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

// 인쇄 전체 조회 (내림차순)
app.get('/api/prints', (req, res) => {
  db.all('SELECT * FROM evPrint ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// 인쇄 등록
app.post('/api/prints', (req, res) => {
  const p = req.body;
  const now = new Date();
  const ymd = now.toISOString().slice(0,10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const printNumber = `PRT${ymd}${rand}`;
  db.run(
    `INSERT INTO evPrint (
      printNumber, orderId, printMethod, factoryName, factoryContact, deliveryAddress, expectedDate, status, memo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      printNumber,
      p.orderId || null,
      p.printMethod,
      p.factoryName,
      p.factoryContact || null,
      p.deliveryAddress || null,
      p.expectedDate || null,
      p.status || '발주전',
      p.memo || null
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ printNumber });
    }
  );
});

// 인쇄 수정
app.put('/api/prints/:printNumber', (req, res) => {
  const fields = Object.keys(req.body).map(k => `${k}=?`).join(',');
  const values = Object.values(req.body);
  values.push(req.params.printNumber);
  db.run(`UPDATE evPrint SET ${fields} WHERE printNumber=?`, values, function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

// 인쇄 삭제
app.delete('/api/prints/:printNumber', (req, res) => {
  db.run('DELETE FROM evPrint WHERE printNumber=?', [req.params.printNumber], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

// 카탈로그 main_category 리스트
app.get('/api/catalog/main-categories', (req, res) => {
  catalogDb.all('SELECT DISTINCT main_category FROM productCatalog ORDER BY main_category', (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows.map(r => r.main_category));
  });
});

// 카탈로그 brand_name 리스트
app.get('/api/catalog/brands', (req, res) => {
  const { main_category } = req.query;
  if (!main_category) return res.status(400).json({error: 'main_category required'});
  catalogDb.all('SELECT DISTINCT brand_name FROM productCatalog WHERE main_category=? ORDER BY brand_name', [main_category], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows.map(r => r.brand_name));
  });
});

// 카탈로그 sub_category 리스트
app.get('/api/catalog/sub-categories', (req, res) => {
  const { main_category, brand_name } = req.query;
  if (!main_category || !brand_name) return res.status(400).json({error: 'main_category, brand_name required'});
  catalogDb.all('SELECT DISTINCT sub_category FROM productCatalog WHERE main_category=? AND brand_name=? ORDER BY sub_category', [main_category, brand_name], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows.map(r => r.sub_category));
  });
});

// 카탈로그 item 리스트
app.get('/api/catalog/items', (req, res) => {
  const { main_category, brand_name, sub_category } = req.query;
  if (!main_category || !brand_name || !sub_category) return res.status(400).json({error: 'main_category, brand_name, sub_category required'});
  catalogDb.all('SELECT * FROM productCatalog WHERE main_category=? AND brand_name=? AND sub_category=? ORDER BY item_name', [main_category, brand_name, sub_category], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
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
        console.error('Search error:', err);
        return res.status(500).json({error: err.message});
      }
      if (!Array.isArray(rows)) {
        console.error('Invalid response format:', rows);
        return res.json([]);
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
      if (err) return res.status(500).json({error: err.message});
      res.json(rows.map(r => r.color_ko));
    }
  );
});

// === 서버 시작 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
