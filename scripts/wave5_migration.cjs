const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'jotx.your-database.de',
    user: 'pxoziy_1',
    password: 'j8,DrtshJSm$',
    database: 'pxoziy_db1',
  });

  // Wave 5.3: Approval trail
  await c.query(`CREATE TABLE IF NOT EXISTS content_approval_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_item_id INT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    changed_by VARCHAR(36) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('content_approval_log created');

  // Wave 5.4: Comments
  await c.query(`CREATE TABLE IF NOT EXISTS content_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_item_id INT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('content_comments created');

  // Wave 5.5: Versioning
  await c.query(`CREATE TABLE IF NOT EXISTS content_item_revisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_item_id INT NOT NULL,
    revision_number INT NOT NULL,
    body_en TEXT, body_nl TEXT, body_de TEXT, body_es TEXT, body_fr TEXT,
    title VARCHAR(500),
    changed_by VARCHAR(36),
    change_summary VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('content_item_revisions created');

  // Wave 5.7: Content Pillars
  await c.query(`CREATE TABLE IF NOT EXISTS content_pillars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_percentage INT DEFAULT 25,
    color VARCHAR(7) DEFAULT '#7FA594',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destinations(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log('content_pillars created');

  // Add pillar_id to content_items
  try {
    await c.query('ALTER TABLE content_items ADD COLUMN pillar_id INT DEFAULT NULL');
    console.log('pillar_id added');
  } catch (e) {
    console.log('pillar_id skip:', e.message.substring(0, 50));
  }

  // Extend approval_status ENUM
  await c.query(`ALTER TABLE content_items MODIFY COLUMN approval_status ENUM(
    'draft', 'pending_review', 'reviewed', 'changes_requested',
    'final_approval', 'approved', 'scheduled', 'publishing',
    'published', 'failed', 'rejected', 'archived', 'deleted'
  ) NOT NULL DEFAULT 'draft'`);
  console.log('approval_status ENUM extended');

  await c.end();
  console.log('All Wave 5 DB changes done');
})().catch(e => { console.error(e.message); process.exit(1); });
