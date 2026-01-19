import uxReviewer from './reviewers/uxReviewer.js';
import codeReviewer from './reviewers/codeReviewer.js';
import securityReviewer from './reviewers/securityReviewer.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert } from '../../orchestrator/ownerInterface/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Quality Checker Agent
 * Orchestrates all code quality reviews and integrates with CI/CD
 */

const REVIEW_THRESHOLDS = {
  PASS: 80,
  WARNING: 60,
  FAIL: 0
};

const PROJECT_PATHS = {
  'customer-portal': '/var/www/api.holidaibutler.com/customer-portal/frontend',
  'admin-module': '/var/www/api.holidaibutler.com/admin-module',
  'platform-core': '/var/www/api.holidaibutler.com/platform-core'
};

class QualityChecker {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Run comprehensive quality check on a file
   */
  async checkFile(filePath, options = {}) {
    console.log(`[QualityChecker] Comprehensive check: ${filePath}`);

    const { runTests = false, runLint = true } = options;

    const report = {
      file: filePath,
      timestamp: new Date().toISOString(),
      reviews: {},
      tests: null,
      lint: null,
      overallScore: 0,
      overallStatus: 'PENDING',
      summary: []
    };

    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      const fileType = path.extname(filePath).slice(1);

      // 1. UX Review (for frontend files)
      if (this.isFrontendFile(filePath)) {
        report.reviews.ux = await uxReviewer.reviewFile(filePath, content);
      }

      // 2. Code Review (for all JS/TS files)
      if (['js', 'jsx', 'ts', 'tsx'].includes(fileType)) {
        report.reviews.code = await codeReviewer.reviewFile(filePath, content, fileType);
      }

      // 3. Security Review
      report.reviews.security = await securityReviewer.reviewFile(filePath, content);

      // 4. Run ESLint (if enabled)
      if (runLint) {
        report.lint = await this.runLint(filePath);
      }

      // 5. Run tests (if enabled)
      if (runTests) {
        report.tests = await this.runTests(filePath);
      }

      // Calculate overall score
      const scores = Object.values(report.reviews).map(r => r.overallScore);
      if (report.lint && report.lint.success) scores.push(100);
      if (report.lint && !report.lint.success) scores.push(50);
      if (report.tests && report.tests.success) scores.push(100);
      if (report.tests && !report.tests.success) scores.push(0);

      report.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Determine status
      const hasCritical = Object.values(report.reviews).some(r =>
        r.criticalIssues && r.criticalIssues.length > 0
      );

      report.overallStatus = hasCritical ? 'CRITICAL' :
                            report.overallScore >= REVIEW_THRESHOLDS.PASS ? 'PASS' :
                            report.overallScore >= REVIEW_THRESHOLDS.WARNING ? 'WARNING' : 'FAIL';

      // Generate summary
      report.summary = this.generateSummary(report);

      await logAgent('dev-layer', 'quality_check_completed', {
        description: `Quality check: ${filePath} - ${report.overallStatus} (${report.overallScore}%)`,
        metadata: {
          file: filePath,
          score: report.overallScore,
          status: report.overallStatus
        }
      });

      return report;
    } catch (error) {
      await logError('dev-layer', error, { action: 'quality_check', file: filePath });
      throw error;
    }
  }

  /**
   * Run quality check on multiple files (e.g., PR changes)
   */
  async checkFiles(filePaths, options = {}) {
    console.log(`[QualityChecker] Batch checking ${filePaths.length} files`);

    const results = {
      timestamp: new Date().toISOString(),
      totalFiles: filePaths.length,
      reports: [],
      summary: {
        passed: 0,
        warnings: 0,
        failed: 0,
        critical: 0
      },
      overallStatus: 'PENDING'
    };

    for (const filePath of filePaths) {
      try {
        const report = await this.checkFile(filePath, options);
        results.reports.push(report);

        switch (report.overallStatus) {
          case 'PASS': results.summary.passed++; break;
          case 'WARNING': results.summary.warnings++; break;
          case 'FAIL': results.summary.failed++; break;
          case 'CRITICAL': results.summary.critical++; break;
        }
      } catch (error) {
        results.reports.push({
          file: filePath,
          error: error.message,
          overallStatus: 'ERROR'
        });
        results.summary.failed++;
      }
    }

    // Determine overall status
    results.overallStatus =
      results.summary.critical > 0 ? 'CRITICAL' :
      results.summary.failed > 0 ? 'FAIL' :
      results.summary.warnings > 0 ? 'WARNING' : 'PASS';

    // Alert owner if critical issues
    if (results.summary.critical > 0) {
      await this.alertQualityIssues(results);
    }

    await logAgent('dev-layer', 'batch_quality_check_completed', {
      description: `Batch check: ${filePaths.length} files - ${results.overallStatus}`,
      metadata: results.summary
    });

    return results;
  }

  /**
   * Run project-wide quality check
   */
  async checkProject(projectName) {
    console.log(`[QualityChecker] Project check: ${projectName}`);

    const projectPath = PROJECT_PATHS[projectName];
    if (!projectPath) {
      throw new Error(`Unknown project: ${projectName}`);
    }

    const report = {
      project: projectName,
      path: projectPath,
      timestamp: new Date().toISOString(),
      lint: null,
      tests: null,
      buildCheck: null,
      dependencyAudit: null,
      overallStatus: 'PENDING'
    };

    try {
      // 1. Run lint
      report.lint = await this.runProjectLint(projectPath);

      // 2. Run tests
      report.tests = await this.runProjectTests(projectPath);

      // 3. Build check
      report.buildCheck = await this.runBuildCheck(projectPath);

      // 4. Dependency audit
      report.dependencyAudit = await this.runDependencyAudit(projectPath);

      // Determine status
      const hasCriticalVulns = report.dependencyAudit?.critical > 0;
      const testsPassed = report.tests?.success !== false;
      const lintPassed = report.lint?.success !== false;
      const buildPassed = report.buildCheck?.success !== false;

      report.overallStatus =
        hasCriticalVulns ? 'CRITICAL' :
        !testsPassed || !buildPassed ? 'FAIL' :
        !lintPassed ? 'WARNING' : 'PASS';

      await logAgent('dev-layer', 'project_quality_check_completed', {
        description: `Project check: ${projectName} - ${report.overallStatus}`,
        metadata: { project: projectName, status: report.overallStatus }
      });

      return report;
    } catch (error) {
      await logError('dev-layer', error, { action: 'project_check', project: projectName });
      throw error;
    }
  }

  /**
   * Run ESLint on a file
   */
  async runLint(filePath) {
    try {
      const { stdout } = await execAsync(`npx eslint "${filePath}" --format json`, {
        cwd: path.dirname(filePath),
        timeout: 30000
      });

      const results = JSON.parse(stdout);
      const fileResult = results[0] || {};

      return {
        success: fileResult.errorCount === 0,
        errors: fileResult.errorCount || 0,
        warnings: fileResult.warningCount || 0,
        messages: fileResult.messages || []
      };
    } catch (error) {
      // ESLint exits with non-zero on lint errors
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          const fileResult = results[0] || {};
          return {
            success: false,
            errors: fileResult.errorCount || 0,
            warnings: fileResult.warningCount || 0,
            messages: fileResult.messages || []
          };
        } catch {
          // Parse failed
        }
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Run tests related to a file
   */
  async runTests(filePath) {
    const testFile = filePath.replace(/\.(js|ts|jsx|tsx)$/, '.test.$1');

    try {
      await fs.access(testFile);

      const { stdout } = await execAsync(`npm test -- --testPathPattern="${path.basename(testFile)}" --json`, {
        cwd: path.dirname(filePath),
        timeout: 60000
      });

      const results = JSON.parse(stdout);
      return {
        success: results.success,
        numPassedTests: results.numPassedTests,
        numFailedTests: results.numFailedTests,
        testResults: results.testResults
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: null, message: 'No test file found' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Run project-wide lint
   */
  async runProjectLint(projectPath) {
    try {
      const { stdout } = await execAsync('npm run lint -- --format json', {
        cwd: projectPath,
        timeout: 120000
      });

      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run project tests
   */
  async runProjectTests(projectPath) {
    try {
      const { stdout } = await execAsync('npm test -- --json --coverage', {
        cwd: projectPath,
        timeout: 300000
      });

      return { success: true, output: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run build check
   */
  async runBuildCheck(projectPath) {
    try {
      await execAsync('npm run build', {
        cwd: projectPath,
        timeout: 300000
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run npm audit for dependencies
   */
  async runDependencyAudit(projectPath) {
    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: projectPath,
        timeout: 60000
      });

      const audit = JSON.parse(stdout);
      return {
        success: audit.metadata?.vulnerabilities?.total === 0,
        critical: audit.metadata?.vulnerabilities?.critical || 0,
        high: audit.metadata?.vulnerabilities?.high || 0,
        moderate: audit.metadata?.vulnerabilities?.moderate || 0,
        low: audit.metadata?.vulnerabilities?.low || 0
      };
    } catch (error) {
      if (error.stdout) {
        try {
          const audit = JSON.parse(error.stdout);
          return {
            success: false,
            critical: audit.metadata?.vulnerabilities?.critical || 0,
            high: audit.metadata?.vulnerabilities?.high || 0,
            moderate: audit.metadata?.vulnerabilities?.moderate || 0,
            low: audit.metadata?.vulnerabilities?.low || 0
          };
        } catch {
          // Parse failed
        }
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if file is frontend file
   */
  isFrontendFile(filePath) {
    return filePath.includes('customer-portal') ||
           filePath.includes('admin-module') ||
           filePath.includes('components') ||
           filePath.includes('pages') ||
           /\.(jsx|tsx)$/.test(filePath);
  }

  /**
   * Generate summary
   */
  generateSummary(report) {
    const summary = [];

    for (const [type, review] of Object.entries(report.reviews)) {
      summary.push({
        type,
        score: review.overallScore,
        status: review.status,
        issues: review.issues?.length || 0,
        warnings: review.warnings?.length || 0
      });
    }

    if (report.lint) {
      summary.push({
        type: 'lint',
        status: report.lint.success ? 'PASS' : 'FAIL',
        errors: report.lint.errors,
        warnings: report.lint.warnings
      });
    }

    if (report.tests) {
      summary.push({
        type: 'tests',
        status: report.tests.success ? 'PASS' : report.tests.success === null ? 'N/A' : 'FAIL'
      });
    }

    return summary;
  }

  /**
   * Alert owner about quality issues
   */
  async alertQualityIssues(results) {
    try {
      await sendAlert({
        urgency: 4,
        title: `Code Quality Alert: ${results.summary.critical} critical, ${results.summary.failed} failed`,
        message: `Quality check results:\n- Critical: ${results.summary.critical}\n- Failed: ${results.summary.failed}\n- Warnings: ${results.summary.warnings}\n- Passed: ${results.summary.passed}\n\nReview required before deployment!`,
        metadata: results.summary
      });
    } catch (error) {
      console.error('[QualityChecker] Failed to send alert:', error.message);
    }
  }
}

export { REVIEW_THRESHOLDS, PROJECT_PATHS };
export default new QualityChecker();
