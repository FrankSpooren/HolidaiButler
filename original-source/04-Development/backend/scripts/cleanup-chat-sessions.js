/**
 * Cleanup Expired Chat Sessions
 * ==============================
 * Run this as a cron job daily to remove expired sessions
 *
 * Usage: node scripts/cleanup-chat-sessions.js
 * Cron: 0 3 * * * (runs daily at 3 AM)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanupSessions() {
  console.log('🧹 Starting chat session cleanup...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Delete expired sessions
    const [result] = await connection.query(`
      DELETE FROM ChatSession
      WHERE expires_at IS NOT NULL
        AND expires_at < NOW()
    `);

    console.log(`✅ Cleaned up ${result.affectedRows} expired chat sessions`);

    // Log cleanup
    await connection.query(`
      INSERT INTO ChatSessionCleanupLog (sessions_deleted)
      VALUES (?)
    `, [result.affectedRows]);

    // Show session stats
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated_sessions
      FROM ChatSession
    `);

    console.log('\n📊 Session Statistics:');
    console.log(`   Total sessions: ${stats[0].total_sessions}`);
    console.log(`   Active sessions: ${stats[0].active_sessions}`);
    console.log(`   Authenticated: ${stats[0].authenticated_sessions}`);
    console.log(`   Anonymous: ${stats[0].total_sessions - stats[0].authenticated_sessions}`);

    // Show recent cleanup history
    const [history] = await connection.query(`
      SELECT sessions_deleted, run_at
      FROM ChatSessionCleanupLog
      ORDER BY run_at DESC
      LIMIT 7
    `);

    console.log('\n📅 Recent Cleanup History (last 7 runs):');
    history.forEach((log, i) => {
      const date = new Date(log.run_at).toISOString().split('T')[0];
      console.log(`   ${date}: ${log.sessions_deleted} sessions deleted`);
    });

    console.log('\n✅ Cleanup completed successfully!\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run cleanup
if (require.main === module) {
  cleanupSessions()
    .then(() => {
      console.log('🎉 Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error:', error.message);
      process.exit(1);
    });
}

module.exports = { cleanupSessions };
