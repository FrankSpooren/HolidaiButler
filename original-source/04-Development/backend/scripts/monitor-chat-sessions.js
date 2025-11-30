/**
 * Monitor Chat Sessions
 * =====================
 * Generates statistics and reports on chat session usage
 *
 * Usage:
 *   node scripts/monitor-chat-sessions.js
 *
 * Run weekly via cron:
 *   0 9 * * MON /usr/bin/node /path/to/backend/scripts/monitor-chat-sessions.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function monitorSessions() {
  console.log('📊 Chat Session Monitoring Report');
  console.log('==================================');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // === Current Session Statistics ===
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_sessions,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated_sessions,
        AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_session_duration,
        MAX(updated_at) as last_activity
      FROM ChatSession
    `);

    console.log('📈 Current Session Statistics');
    console.log('------------------------------');
    console.log(`Total sessions:        ${stats[0].total_sessions}`);
    console.log(`Active sessions:       ${stats[0].active_sessions}`);
    console.log(`Expired sessions:      ${stats[0].expired_sessions}`);
    console.log(`Authenticated:         ${stats[0].authenticated_sessions}`);
    console.log(`Anonymous:             ${stats[0].total_sessions - stats[0].authenticated_sessions}`);
    console.log(`Avg session duration:  ${Math.round(stats[0].avg_session_duration || 0)}s`);
    console.log(`Last activity:         ${stats[0].last_activity || 'N/A'}`);
    console.log();

    // === Session Activity by Day (Last 7 Days) ===
    const [dailyActivity] = await connection.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as sessions_created,
        COUNT(DISTINCT user_id) as unique_users
      FROM ChatSession
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    console.log('📅 Daily Activity (Last 7 Days)');
    console.log('--------------------------------');
    if (dailyActivity.length > 0) {
      dailyActivity.forEach(day => {
        const date = new Date(day.date).toISOString().split('T')[0];
        console.log(`${date}: ${day.sessions_created} sessions, ${day.unique_users} unique users`);
      });
    } else {
      console.log('No activity in last 7 days');
    }
    console.log();

    // === Cleanup History ===
    const [cleanups] = await connection.query(`
      SELECT
        sessions_deleted,
        run_at
      FROM ChatSessionCleanupLog
      ORDER BY run_at DESC
      LIMIT 7
    `);

    console.log('🧹 Recent Cleanup History (Last 7 Runs)');
    console.log('----------------------------------------');
    if (cleanups.length > 0) {
      let totalCleaned = 0;
      cleanups.forEach(log => {
        const date = new Date(log.run_at).toISOString().split('T')[0];
        const time = new Date(log.run_at).toTimeString().split(' ')[0];
        console.log(`${date} ${time}: ${log.sessions_deleted} sessions deleted`);
        totalCleaned += log.sessions_deleted;
      });
      console.log(`Total cleaned (last 7 runs): ${totalCleaned} sessions`);
    } else {
      console.log('No cleanup runs recorded yet');
    }
    console.log();

    // === Peak Usage Times ===
    const [peakHours] = await connection.query(`
      SELECT
        HOUR(created_at) as hour,
        COUNT(*) as session_count
      FROM ChatSession
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY HOUR(created_at)
      ORDER BY session_count DESC
      LIMIT 5
    `);

    console.log('⏰ Peak Usage Hours (Last 7 Days)');
    console.log('----------------------------------');
    if (peakHours.length > 0) {
      peakHours.forEach(hour => {
        console.log(`Hour ${String(hour.hour).padStart(2, '0')}:00 - ${hour.session_count} sessions`);
      });
    } else {
      console.log('Not enough data yet');
    }
    console.log();

    // === Session Duration Distribution ===
    const [durations] = await connection.query(`
      SELECT
        CASE
          WHEN TIMESTAMPDIFF(SECOND, created_at, updated_at) < 60 THEN '< 1 min'
          WHEN TIMESTAMPDIFF(SECOND, created_at, updated_at) < 300 THEN '1-5 min'
          WHEN TIMESTAMPDIFF(SECOND, created_at, updated_at) < 900 THEN '5-15 min'
          WHEN TIMESTAMPDIFF(SECOND, created_at, updated_at) < 1800 THEN '15-30 min'
          ELSE '> 30 min'
        END as duration_range,
        COUNT(*) as session_count
      FROM ChatSession
      WHERE updated_at > created_at
      GROUP BY duration_range
      ORDER BY
        CASE duration_range
          WHEN '< 1 min' THEN 1
          WHEN '1-5 min' THEN 2
          WHEN '5-15 min' THEN 3
          WHEN '15-30 min' THEN 4
          ELSE 5
        END
    `);

    console.log('⏱️  Session Duration Distribution');
    console.log('----------------------------------');
    if (durations.length > 0) {
      durations.forEach(range => {
        const bar = '█'.repeat(Math.ceil(range.session_count / 2));
        console.log(`${range.duration_range.padEnd(12)} ${bar} ${range.session_count}`);
      });
    } else {
      console.log('Not enough data yet');
    }
    console.log();

    // === Health Check ===
    console.log('🏥 System Health Check');
    console.log('----------------------');

    // Check for stale sessions
    const [staleSessions] = await connection.query(`
      SELECT COUNT(*) as stale_count
      FROM ChatSession
      WHERE expires_at <= NOW()
    `);
    if (staleSessions[0].stale_count > 10) {
      console.log(`⚠️  WARNING: ${staleSessions[0].stale_count} expired sessions pending cleanup`);
    } else {
      console.log(`✅ Expired sessions: ${staleSessions[0].stale_count} (within normal range)`);
    }

    // Check recent cleanup runs
    const [recentCleanup] = await connection.query(`
      SELECT MAX(run_at) as last_cleanup
      FROM ChatSessionCleanupLog
    `);
    const lastCleanup = recentCleanup[0].last_cleanup;
    if (lastCleanup) {
      const hoursSinceCleanup = (Date.now() - new Date(lastCleanup).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCleanup > 48) {
        console.log(`⚠️  WARNING: Last cleanup was ${Math.round(hoursSinceCleanup)} hours ago`);
      } else {
        console.log(`✅ Last cleanup: ${Math.round(hoursSinceCleanup)} hours ago`);
      }
    } else {
      console.log('⚠️  WARNING: No cleanup runs recorded');
    }

    // Check for sessions without expiry
    const [noExpiry] = await connection.query(`
      SELECT COUNT(*) as count
      FROM ChatSession
      WHERE expires_at IS NULL
    `);
    if (noExpiry[0].count > 0) {
      console.log(`⚠️  WARNING: ${noExpiry[0].count} sessions without expiry date`);
    } else {
      console.log('✅ All sessions have expiry dates');
    }

    console.log();
    console.log('==================================');
    console.log('✅ Monitoring report completed');
    console.log();

  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run monitoring
if (require.main === module) {
  monitorSessions()
    .then(() => {
      console.log('🎉 Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error:', error.message);
      process.exit(1);
    });
}

module.exports = { monitorSessions };
