/**
 * Test Script - MailerLite Email Service
 * Tests the email service configuration and sends test emails
 *
 * Usage: node scripts/test-email.js [test-email@example.com]
 */

import emailService from '../services/EmailService.js';

async function runEmailTests(testEmail = 'frank@holidaibutler.com') {
  console.log('🧪 HolidaiButler Admin - Email Service Test\n');
  console.log('═'.repeat(60));

  // Test 1: Connection Test
  console.log('\n📧 Test 1: MailerLite Connection Test');
  console.log('─'.repeat(60));
  const connectionTest = await emailService.testConnection(testEmail);
  console.log('Result:', connectionTest.success ? '✅ SUCCESS' : '❌ FAILED');
  if (!connectionTest.success) {
    console.log('Error:', connectionTest.error);
  }

  // Wait between emails to avoid rate limiting (MailerSend free tier limit)
  await sleep(3000);

  // Test 2: POI Approval Notification
  console.log('\n📧 Test 2: POI Approval Notification');
  console.log('─'.repeat(60));
  const approvalTest = await emailService.sendPOIApprovalNotification({
    poiName: 'Terra Mítica Theme Park',
    poiId: 123,
    ownerEmail: testEmail,
    ownerName: 'Test Owner',
    approvedBy: 'Platform Admin'
  });
  console.log('Result:', approvalTest.success ? '✅ SUCCESS' : '❌ FAILED');

  await sleep(3000);

  // Test 3: POI Rejection Notification
  console.log('\n📧 Test 3: POI Rejection Notification');
  console.log('─'.repeat(60));
  const rejectionTest = await emailService.sendPOIRejectionNotification({
    poiName: 'Beach Bar Sunset',
    poiId: 456,
    ownerEmail: testEmail,
    ownerName: 'Test Owner',
    rejectedBy: 'Content Reviewer',
    reason: 'Missing required information: opening hours and contact details needed.'
  });
  console.log('Result:', rejectionTest.success ? '✅ SUCCESS' : '❌ FAILED');

  await sleep(3000);

  // Test 4: Welcome Email
  console.log('\n📧 Test 4: Welcome Email');
  console.log('─'.repeat(60));
  const welcomeTest = await emailService.sendWelcomeEmail({
    email: testEmail,
    firstName: 'John',
    lastName: 'Doe',
    role: 'editor',
    tempPassword: 'TempPass123!@#'
  });
  console.log('Result:', welcomeTest.success ? '✅ SUCCESS' : '❌ FAILED');

  await sleep(3000);

  // Test 5: Password Reset Email
  console.log('\n📧 Test 5: Password Reset Email');
  console.log('─'.repeat(60));
  const resetTest = await emailService.sendPasswordResetEmail({
    email: testEmail,
    resetToken: 'test-token-123456789',
    firstName: 'John'
  });
  console.log('Result:', resetTest.success ? '✅ SUCCESS' : '❌ FAILED');

  await sleep(3000);

  // Test 6: Weekly Digest
  console.log('\n📧 Test 6: Weekly Digest');
  console.log('─'.repeat(60));
  const digestTest = await emailService.sendWeeklyDigest({
    adminEmail: testEmail,
    adminName: 'Platform Admin',
    stats: {
      newPOIs: 12,
      pendingApprovals: 5,
      newUsers: 3,
      totalPOIs: 1593,
      activePOIs: 1580,
      topCategories: [
        { name: 'Restaurants', count: 450 },
        { name: 'Attractions', count: 380 },
        { name: 'Hotels', count: 320 }
      ]
    }
  });
  console.log('Result:', digestTest.success ? '✅ SUCCESS' : '❌ FAILED');

  // Summary
  console.log('\n═'.repeat(60));
  console.log('\n📊 Test Summary:');
  const tests = [connectionTest, approvalTest, rejectionTest, welcomeTest, resetTest, digestTest];
  const passed = tests.filter(t => t.success).length;
  const failed = tests.filter(t => !t.success).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📧 Total: ${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All email tests passed! MailerLite integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the MailerLite API key and configuration.');
  }

  console.log('\n✉️  Check your inbox at:', testEmail);
  console.log('═'.repeat(60));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get test email from command line argument or use default
const testEmail = process.argv[2] || 'frank@holidaibutler.com';

runEmailTests(testEmail)
  .then(() => {
    console.log('\n✅ Email test script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Email test script failed:', error);
    process.exit(1);
  });
