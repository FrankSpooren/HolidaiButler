import { execSync } from 'child_process';
import { logAgent, logError } from '../../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../../orchestrator/ownerInterface/index.js';

/**
 * Security Reviewer Agent
 * Comprehensive security audit for HolidaiButler
 *
 * Checks:
 * - OWASP Top 10 vulnerabilities
 * - Dependency vulnerabilities
 * - API security
 * - Authentication/Authorization
 * - Data protection (GDPR alignment)
 */

// OWASP Top 10 2021 checks
const OWASP_CHECKS = {
  A01_BROKEN_ACCESS_CONTROL: {
    name: 'Broken Access Control',
    patterns: [
      { regex: /req\.(params|query|body)\.[^;]*\.id[^;]*(?!.*(?:auth|verify|check))/i, risk: 'IDOR vulnerability' },
      { regex: /isAdmin\s*=\s*req\.body/i, risk: 'Privilege escalation via request body' }
    ]
  },
  A02_CRYPTOGRAPHIC_FAILURES: {
    name: 'Cryptographic Failures',
    patterns: [
      { regex: /md5\s*\(|sha1\s*\(/i, risk: 'Weak hashing algorithm' },
      { regex: /password.*=.*['"]\w+['"]/i, risk: 'Hardcoded password' },
      { regex: /http:\/\/(?!localhost)/i, risk: 'Non-HTTPS connection' }
    ]
  },
  A03_INJECTION: {
    name: 'Injection',
    patterns: [
      { regex: /query\s*\(\s*[`'"].*\$\{|\.query\s*\([`'"].*\+\s*\w+/i, risk: 'SQL injection' },
      { regex: /innerHTML\s*=|outerHTML\s*=/i, risk: 'XSS via innerHTML' },
      { regex: /exec\s*\(\s*[`'"].*\$\{|child_process.*\+/i, risk: 'Command injection' }
    ]
  },
  A04_INSECURE_DESIGN: {
    name: 'Insecure Design',
    patterns: [
      { regex: /\/\/\s*TODO.*security|\/\/\s*FIXME.*auth/i, risk: 'Security TODO/FIXME' },
      { regex: /rate[_-]?limit.*false|disable.*rate/i, risk: 'Disabled rate limiting' }
    ]
  },
  A05_SECURITY_MISCONFIGURATION: {
    name: 'Security Misconfiguration',
    patterns: [
      { regex: /cors\s*\(\s*\)|\*\s*['"]?\s*(?:origin|Access-Control)/i, risk: 'Overly permissive CORS' },
      { regex: /debug\s*[:=]\s*true|NODE_ENV.*development.*production/i, risk: 'Debug mode in production' }
    ]
  },
  A06_VULNERABLE_COMPONENTS: {
    name: 'Vulnerable Components',
    checkDependencies: true
  },
  A07_AUTH_FAILURES: {
    name: 'Authentication Failures',
    patterns: [
      { regex: /jwt\.sign\([^)]*expiresIn\s*:\s*['"]?\d{4,}/i, risk: 'Long JWT expiration' },
      { regex: /bcrypt.*rounds?\s*[:=]\s*[1-5]\b/i, risk: 'Weak bcrypt rounds (<6)' },
      { regex: /password.*length.*[<]\s*[1-7]\b/i, risk: 'Weak password policy' }
    ]
  },
  A08_DATA_INTEGRITY: {
    name: 'Software and Data Integrity Failures',
    patterns: [
      { regex: /eval\s*\(|new\s+Function\s*\(/i, risk: 'Dynamic code execution' },
      { regex: /require\s*\(\s*\w+\s*\)/i, risk: 'Dynamic require (potential RCE)' }
    ]
  },
  A09_LOGGING_FAILURES: {
    name: 'Security Logging Failures',
    checkLogging: true
  },
  A10_SSRF: {
    name: 'Server-Side Request Forgery',
    patterns: [
      { regex: /fetch\s*\(\s*req\.(body|query|params)|axios\s*\(\s*req\./i, risk: 'SSRF via user input' },
      { regex: /redirect\s*\(\s*req\.(body|query)/i, risk: 'Open redirect' }
    ]
  }
};

// API Security checks
const API_SECURITY_CHECKS = {
  RATE_LIMITING: {
    name: 'Rate Limiting',
    patterns: [/rateLimit|rateLimiter|express-rate-limit/i]
  },
  HELMET: {
    name: 'Security Headers (Helmet)',
    patterns: [/helmet\s*\(/i]
  },
  INPUT_VALIDATION: {
    name: 'Input Validation',
    patterns: [/joi|yup|zod|validator|express-validator/i]
  },
  CSRF_PROTECTION: {
    name: 'CSRF Protection',
    patterns: [/csrf|csurf/i]
  },
  XSS_PROTECTION: {
    name: 'XSS Protection',
    patterns: [/xss|sanitize|escape|DOMPurify/i]
  }
};

class SecurityReviewer {
  /**
   * Comprehensive security review
   */
  async reviewFile(filePath, fileContent) {
    console.log(`[SecurityReviewer] Auditing: ${filePath}`);

    const review = {
      file: filePath,
      timestamp: new Date().toISOString(),
      owaspFindings: [],
      apiSecurityFindings: [],
      criticalIssues: [],
      warnings: [],
      passed: [],
      score: 100
    };

    try {
      // 1. OWASP Top 10 checks
      for (const [key, check] of Object.entries(OWASP_CHECKS)) {
        if (check.patterns) {
          for (const pattern of check.patterns) {
            if (pattern.regex.test(fileContent)) {
              const finding = {
                category: key,
                name: check.name,
                risk: pattern.risk,
                severity: key.includes('A01') || key.includes('A03') ? 'critical' : 'high'
              };

              review.owaspFindings.push(finding);

              if (finding.severity === 'critical') {
                review.criticalIssues.push(finding);
                review.score -= 25;
              } else {
                review.warnings.push(finding);
                review.score -= 10;
              }
            }
          }
        }
      }

      // 2. API Security checks (for route files)
      if (filePath.includes('route') || filePath.includes('controller') || filePath.includes('api')) {
        for (const [key, check] of Object.entries(API_SECURITY_CHECKS)) {
          const found = check.patterns.some(p => p.test(fileContent));
          if (found) {
            review.passed.push(`${check.name} implemented`);
          } else {
            review.apiSecurityFindings.push({
              check: key,
              name: check.name,
              status: 'missing',
              recommendation: `Consider implementing ${check.name}`
            });
          }
        }
      }

      // 3. Authentication checks
      const authResult = this.checkAuthentication(fileContent, filePath);
      review.passed.push(...authResult.passed);
      review.warnings.push(...authResult.warnings);

      // 4. Data protection (GDPR alignment)
      const gdprResult = this.checkDataProtection(fileContent);
      review.passed.push(...gdprResult.passed);
      review.warnings.push(...gdprResult.warnings);

      // 5. Secrets detection
      const secretsResult = this.checkSecrets(fileContent);
      review.criticalIssues.push(...secretsResult.criticalIssues);
      if (secretsResult.criticalIssues.length > 0) {
        review.score -= secretsResult.criticalIssues.length * 30;
      }

      // Calculate final score
      review.score = Math.max(0, review.score);
      review.status = review.criticalIssues.length > 0 ? 'CRITICAL' :
                      review.score >= 80 ? 'PASS' :
                      review.score >= 60 ? 'WARNING' : 'FAIL';

      // Alert owner on critical findings
      if (review.criticalIssues.length > 0) {
        await this.alertCriticalFindings(filePath, review.criticalIssues);
      }

      await logAgent('dev-layer', 'security_review_completed', {
        description: `Security audit: ${filePath} - Score: ${review.score}%`,
        metadata: {
          file: filePath,
          score: review.score,
          criticalIssues: review.criticalIssues.length,
          owaspFindings: review.owaspFindings.length
        }
      });

      return review;
    } catch (error) {
      await logError('dev-layer', error, { action: 'security_review', file: filePath });
      throw error;
    }
  }

  /**
   * Check authentication patterns
   */
  checkAuthentication(content, filePath) {
    const result = { passed: [], warnings: [] };

    // Check for auth middleware usage
    if (filePath.includes('route')) {
      if (content.includes('authMiddleware') || content.includes('authenticate') ||
          content.includes('requireAuth') || content.includes('verifyToken')) {
        result.passed.push('Authentication middleware used');
      } else if (!filePath.includes('public') && !filePath.includes('health')) {
        result.warnings.push({
          type: 'MISSING_AUTH',
          message: 'Route file without visible authentication middleware'
        });
      }
    }

    // Check JWT configuration
    if (content.includes('jwt')) {
      if (content.includes('expiresIn')) {
        result.passed.push('JWT expiration configured');
      }
      if (content.includes('algorithm') || content.includes('RS256') || content.includes('HS256')) {
        result.passed.push('JWT algorithm specified');
      }
    }

    // Check password hashing
    if (content.includes('password')) {
      if (content.includes('bcrypt') || content.includes('argon2') || content.includes('scrypt')) {
        result.passed.push('Secure password hashing used');
      } else if (content.includes('md5') || content.includes('sha1')) {
        result.warnings.push({
          type: 'WEAK_HASHING',
          severity: 'high',
          message: 'Weak password hashing detected (MD5/SHA1)'
        });
      }
    }

    return result;
  }

  /**
   * Check data protection (GDPR alignment)
   */
  checkDataProtection(content) {
    const result = { passed: [], warnings: [] };

    // Check for personal data handling
    const personalDataPatterns = /email|phone|address|name|birth|ssn|passport/i;
    if (personalDataPatterns.test(content)) {
      // Should have data protection measures
      if (content.includes('encrypt') || content.includes('hash') || content.includes('mask')) {
        result.passed.push('Personal data protection measures found');
      }

      // Check for logging of personal data
      if (content.includes('console.log') || content.includes('logger.info')) {
        const logStatements = content.match(/(?:console\.log|logger\.\w+)\s*\([^)]+\)/g) || [];
        const logsPersonalData = logStatements.some(log => personalDataPatterns.test(log));

        if (logsPersonalData) {
          result.warnings.push({
            type: 'PII_LOGGING',
            severity: 'high',
            message: 'Personal data may be logged - GDPR concern'
          });
        }
      }
    }

    // Check for data retention considerations
    if (content.includes('delete') || content.includes('remove') || content.includes('destroy')) {
      result.passed.push('Data deletion capabilities present');
    }

    return result;
  }

  /**
   * Check for secrets/credentials
   */
  checkSecrets(content) {
    const result = { criticalIssues: [] };

    const secretPatterns = [
      { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i, type: 'API Key' },
      { regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i, type: 'Password' },
      { regex: /(?:secret|token)\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/i, type: 'Secret/Token' },
      { regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i, type: 'Private Key' },
      { regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@/i, type: 'Database Connection String' },
      { regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/i, type: 'JWT Token' }
    ];

    for (const pattern of secretPatterns) {
      if (pattern.regex.test(content)) {
        result.criticalIssues.push({
          type: 'HARDCODED_SECRET',
          secretType: pattern.type,
          severity: 'critical',
          message: `Potential ${pattern.type} found in code`,
          recommendation: 'Move to environment variables (.env)'
        });
      }
    }

    return result;
  }

  /**
   * Alert owner on critical security findings
   */
  async alertCriticalFindings(filePath, criticalIssues) {
    try {
      await sendAlert({
        urgency: 5,
        title: `CRITICAL SECURITY: ${criticalIssues.length} issues in ${filePath}`,
        message: `Critical security vulnerabilities detected:\n${criticalIssues.map(i => `- ${i.type}: ${i.message || i.risk}`).join('\n')}\n\nIMMEDIATE ACTION REQUIRED!`,
        metadata: { file: filePath, issues: criticalIssues }
      });
    } catch (error) {
      console.error('[SecurityReviewer] Failed to send alert:', error.message);
    }
  }

  /**
   * Scheduled execution: runs npm audit on platform-core
   * Called by dev-security-scan BullMQ job (daily 02:00)
   */
  async execute() {
    const projectPath = '/var/www/api.holidaibutler.com/platform-core';
    const results = {
      timestamp: new Date().toISOString(),
      vulnerabilities: {},
      total: 0,
      error: null
    };

    try {
      const output = execSync('npm audit --json', {
        cwd: projectPath,
        timeout: 60000,
        encoding: 'utf8'
      });
      const audit = JSON.parse(output);
      results.vulnerabilities = audit.metadata?.vulnerabilities || {};
      results.total = Object.values(results.vulnerabilities).reduce((a, b) => a + b, 0);
    } catch (e) {
      // npm audit returns exit code 1 when vulnerabilities found
      if (e.stdout) {
        try {
          const audit = JSON.parse(e.stdout);
          results.vulnerabilities = audit.metadata?.vulnerabilities || {};
          results.total = Object.values(results.vulnerabilities).reduce((a, b) => a + b, 0);
        } catch {
          results.error = 'Failed to parse npm audit output';
        }
      } else {
        results.error = e.message;
      }
    }

    const severity = (results.vulnerabilities?.critical > 0 || results.vulnerabilities?.high > 0)
      ? 'warning' : 'info';

    try {
      await logAgent('security', 'npm_audit_scan', {
        description: `npm audit: ${results.total} vulnerabilities (${results.vulnerabilities?.critical || 0}C/${results.vulnerabilities?.high || 0}H/${results.vulnerabilities?.moderate || 0}M/${results.vulnerabilities?.low || 0}L)`,
        status: results.error ? 'failed' : 'completed',
        metadata: results
      });

      // Alert on critical/high vulnerabilities
      if (results.vulnerabilities?.critical > 0) {
        await sendAlert({
          urgency: 4,
          title: `SECURITY: ${results.vulnerabilities.critical} critical npm vulnerabilities`,
          message: `npm audit found ${results.vulnerabilities.critical} critical vulnerabilities in platform-core. Review with: npm audit`,
          metadata: results.vulnerabilities
        });
      }
    } catch (logErr) {
      console.error('[SecurityReviewer] Failed to log audit result:', logErr.message);
    }

    console.log(`[SecurityReviewer] npm audit: ${results.total} vulnerabilities (${results.vulnerabilities?.critical || 0}C/${results.vulnerabilities?.high || 0}H/${results.vulnerabilities?.moderate || 0}M/${results.vulnerabilities?.low || 0}L)`);
    return results;
  }

  /**
   * Get OWASP checks reference
   */
  getOWASPChecks() {
    return Object.keys(OWASP_CHECKS).map(key => ({
      id: key,
      name: OWASP_CHECKS[key].name
    }));
  }
}

export { OWASP_CHECKS, API_SECURITY_CHECKS };
export default new SecurityReviewer();
