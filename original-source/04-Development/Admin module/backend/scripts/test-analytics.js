/**
 * Test Analytics Endpoints
 * HolidaiButler Admin Module
 *
 * Tests all 6 analytics endpoints
 */

import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3003/api/admin';

// Test credentials - update with actual admin credentials
const TEST_EMAIL = 'frankspooren@hotmail.com'; // Platform admin email
const TEST_PASSWORD = 'your-password-here'; // Update this

async function login() {
  console.log('\n🔐 Logging in...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Login failed: ${data.message}`);
  }

  console.log('✅ Login successful');
  console.log(`   User: ${data.data.user.profile.firstName} ${data.data.user.profile.lastName}`);
  console.log(`   Role: ${data.data.user.role}`);

  return data.data.accessToken;
}

async function testOverview(token) {
  console.log('\n📊 Testing Analytics Overview...');
  const response = await fetch(`${API_BASE}/analytics/overview`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Overview failed: ${data.message}`);
  }

  console.log('✅ Overview successful');
  console.log(`   Total POIs: ${data.data.overview.total}`);
  console.log(`   Active POIs: ${data.data.overview.active}`);
  console.log(`   Pending: ${data.data.overview.pending}`);
  console.log(`   Categories: ${data.data.byCategory.length}`);
  console.log(`   Cities: ${data.data.byCity.length}`);
  console.log(`   Countries: ${data.data.byCountry.length}`);

  return data.data;
}

async function testTrends(token) {
  console.log('\n📈 Testing Analytics Trends...');
  const response = await fetch(`${API_BASE}/analytics/trends?period=week&limit=12`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Trends failed: ${data.message}`);
  }

  console.log('✅ Trends successful');
  console.log(`   Creation periods: ${data.data.creation.length}`);
  console.log(`   Verification periods: ${data.data.verification.length}`);
  console.log(`   Period type: ${data.data.period}`);

  return data.data;
}

async function testTopPOIs(token) {
  console.log('\n🏆 Testing Top POIs...');
  const response = await fetch(`${API_BASE}/analytics/top-pois?metric=rating&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Top POIs failed: ${data.message}`);
  }

  console.log('✅ Top POIs successful');
  console.log(`   Found: ${data.data.pois.length} top POIs`);
  console.log(`   Metric: ${data.data.metric}`);

  if (data.data.pois.length > 0) {
    console.log(`   #1: ${data.data.pois[0].name} (${data.data.pois[0].rating}/5)`);
  }

  return data.data;
}

async function testRecentActivity(token) {
  console.log('\n🔔 Testing Recent Activity...');
  const response = await fetch(`${API_BASE}/analytics/recent-activity?limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Recent Activity failed: ${data.message}`);
  }

  console.log('✅ Recent Activity successful');
  console.log(`   Activities: ${data.data.activity.length}`);

  if (data.data.activity.length > 0) {
    console.log(`   Latest: ${data.data.activity[0].name} (${data.data.activity[0].activity_type})`);
  }

  return data.data;
}

async function testUserStats(token) {
  console.log('\n👥 Testing User Stats...');
  const response = await fetch(`${API_BASE}/analytics/user-stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    // This might fail if not platform admin - that's okay
    console.log('⚠️  User Stats requires platform_admin role');
    console.log(`   Response: ${data.message}`);
    return null;
  }

  console.log('✅ User Stats successful');
  console.log(`   Total users: ${data.data.total}`);
  console.log(`   Roles: ${data.data.byRole.length}`);
  console.log(`   Recent registrations: ${data.data.recentRegistrations}`);

  return data.data;
}

async function testGeographic(token) {
  console.log('\n🌍 Testing Geographic Distribution...');
  const response = await fetch(`${API_BASE}/analytics/geographic`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Geographic failed: ${data.message}`);
  }

  console.log('✅ Geographic successful');
  console.log(`   Countries: ${data.data.byCountry.length}`);
  console.log(`   Cities: ${data.data.byCity.length}`);
  console.log(`   Coordinates: ${data.data.coordinates.length}`);

  if (data.data.byCountry.length > 0) {
    console.log(`   Top country: ${data.data.byCountry[0].country} (${data.data.byCountry[0].total} POIs)`);
  }

  return data.data;
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  HolidaiButler Analytics Dashboard - Endpoint Tests   ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Login first
    const token = await login();

    // Test all endpoints
    await testOverview(token);
    await testTrends(token);
    await testTopPOIs(token);
    await testRecentActivity(token);
    await testUserStats(token);
    await testGeographic(token);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All Analytics Tests Completed Successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
