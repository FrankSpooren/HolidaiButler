import { execSync } from 'child_process';
import { logAgent, logError } from '../../../orchestrator/auditTrail/index.js';

/**
 * Code Reviewer Agent
 * Automated code quality analysis
 *
 * Checks:
 * - Coding standards (HolidaiButler conventions)
 * - Error handling
 * - Performance patterns
 * - Code complexity
 * - Documentation
 */

// HolidaiButler Code Conventions (from CLAUDE.md)
const CODE_CONVENTIONS = {
  AI_TEXT_PROCESSING: {
    name: 'AI Text Processing',
    pattern: /cleanAIText\s*\(/,
    message: 'Use cleanAIText() for all AI-generated text'
  },
  POI_FILTERING: {
    name: 'POI Filtering',
    pattern: /isPOIClosed\s*\(/,
    message: 'Use isPOIClosed() to filter closed POIs'
  },
  ERROR_LOGGING: {
    name: 'Error Logging',
    pattern: /logError\s*\(|Sentry\.capture|bugsink/i,
    message: 'Log errors to Bugsink for monitoring'
  },
  AUDIT_TRAIL: {
    name: 'Audit Trail',
    pattern: /logAgent\s*\(/,
    message: 'Use logAgent() for audit trail logging'
  }
};

// Performance anti-patterns to detect
const PERFORMANCE_ANTIPATTERNS = {
  N_PLUS_ONE: {
    name: 'N+1 Query',
    pattern: /for\s*\([^)]*\)\s*{[^}]*await[^}]*query|\.forEach[^}]*await/,
    message: 'Potential N+1 query - use batch operations'
  },
  SYNC_IN_LOOP: {
    name: 'Sync Operations in Loop',
    pattern: /for\s*\([^)]*\)\s*{[^}]*fs\.readFileSync|writeFileSync/,
    message: 'Avoid sync operations in loops'
  },
  MISSING_INDEXING: {
    name: 'Missing Index Hint',
    pattern: /SELECT[^;]*WHERE[^;]*(?!INDEX|index)/i,
    message: 'Consider adding index hints for complex queries'
  },
  UNBOUNDED_QUERY: {
    name: 'Unbounded Query',
    pattern: /SELECT\s+\*\s+FROM[^;]*(?!LIMIT|WHERE)/i,
    message: 'Add LIMIT to prevent unbounded result sets'
  }
};

// Security patterns to enforce
const SECURITY_PATTERNS = {
  SQL_INJECTION: {
    name: 'SQL Injection Risk',
    pattern: /query\s*\(\s*[`'"].*\$\{|query\s*\(\s*[`'"].*\+/,
    severity: 'critical',
    message: 'Use parameterized queries to prevent SQL injection'
  },
  HARDCODED_SECRETS: {
    name: 'Hardcoded Secrets',
    pattern: /(?:password|secret|api[_-]?key|token)\s*[:=]\s*['"]\w{8,}/i,
    severity: 'critical',
    message: 'Move secrets to environment variables'
  },
  EVAL_USAGE: {
    name: 'Eval Usage',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(/,
    severity: 'critical',
    message: 'Avoid eval() and new Function() - security risk'
  }
};

class CodeReviewer {
  /**
   * Review a code file
   */
  async reviewFile(filePath, fileContent, fileType = 'js') {
    console.log(`[CodeReviewer] Reviewing: ${filePath}`);

    const review = {
      file: filePath,
      fileType,
      timestamp: new Date().toISOString(),
      scores: {},
      issues: [],
      warnings: [],
      suggestions: [],
      passed: []
    };

    try {
      // 1. Check code conventions
      const conventionResult = this.checkConventions(fileContent, filePath);
      review.scores.conventions = conventionResult.score;
      review.issues.push(...conventionResult.issues);
      review.passed.push(...conventionResult.passed);

      // 2. Check error handling
      const errorResult = this.checkErrorHandling(fileContent);
      review.scores.errorHandling = errorResult.score;
      review.issues.push(...errorResult.issues);
      review.warnings.push(...errorResult.warnings);
      review.passed.push(...errorResult.passed);

      // 3. Check performance
      const perfResult = this.checkPerformance(fileContent);
      review.scores.performance = perfResult.score;
      review.warnings.push(...perfResult.warnings);
      review.passed.push(...perfResult.passed);

      // 4. Check security
      const secResult = this.checkSecurity(fileContent);
      review.scores.security = secResult.score;
      review.issues.push(...secResult.issues);
      review.passed.push(...secResult.passed);

      // 5. Check complexity
      const complexityResult = this.checkComplexity(fileContent);
      review.scores.complexity = complexityResult.score;
      review.warnings.push(...complexityResult.warnings);
      review.passed.push(...complexityResult.passed);

      // 6. Check documentation
      const docResult = this.checkDocumentation(fileContent);
      review.scores.documentation = docResult.score;
      review.suggestions.push(...docResult.suggestions);
      review.passed.push(...docResult.passed);

      // Calculate overall score
      const scores = Object.values(review.scores);
      review.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      review.status = review.issues.some(i => i.severity === 'critical') ? 'FAIL' :
                      review.overallScore >= 80 ? 'PASS' :
                      review.overallScore >= 60 ? 'WARNING' : 'FAIL';

      await logAgent('dev-layer', 'code_review_completed', {
        description: `Code review: ${filePath} - Score: ${review.overallScore}%`,
        metadata: {
          file: filePath,
          score: review.overallScore,
          status: review.status,
          criticalIssues: review.issues.filter(i => i.severity === 'critical').length
        }
      });

      return review;
    } catch (error) {
      await logError('dev-layer', error, { action: 'code_review', file: filePath });
      throw error;
    }
  }

  /**
   * Check HolidaiButler code conventions
   */
  checkConventions(content, filePath) {
    const result = { score: 100, issues: [], passed: [] };

    // Check if file needs AI text processing
    if (content.includes('mistral') || content.includes('claude') || content.includes('AI') ||
        content.includes('generate') || content.includes('LLM')) {
      if (!CODE_CONVENTIONS.AI_TEXT_PROCESSING.pattern.test(content)) {
        result.score -= 15;
        result.issues.push({
          type: 'CONVENTION_VIOLATION',
          convention: CODE_CONVENTIONS.AI_TEXT_PROCESSING.name,
          severity: 'warning',
          message: CODE_CONVENTIONS.AI_TEXT_PROCESSING.message,
          recommendation: 'Import and use cleanAIText() from holibot.js'
        });
      } else {
        result.passed.push('Using cleanAIText() for AI output');
      }
    }

    // Check if file handles POIs
    if (content.includes('POI') || content.includes('poi') || filePath.includes('poi')) {
      if (content.includes('filter') || content.includes('find') || content.includes('map')) {
        // Should use isPOIClosed
        if (!CODE_CONVENTIONS.POI_FILTERING.pattern.test(content)) {
          result.issues.push({
            type: 'CONVENTION_VIOLATION',
            convention: CODE_CONVENTIONS.POI_FILTERING.name,
            severity: 'info',
            message: CODE_CONVENTIONS.POI_FILTERING.message
          });
        } else {
          result.passed.push('Using isPOIClosed() for POI filtering');
        }
      }
    }

    // Check for error logging
    if (content.includes('catch') || content.includes('error') || content.includes('Error')) {
      if (!CODE_CONVENTIONS.ERROR_LOGGING.pattern.test(content)) {
        result.score -= 10;
        result.issues.push({
          type: 'CONVENTION_VIOLATION',
          convention: CODE_CONVENTIONS.ERROR_LOGGING.name,
          severity: 'warning',
          message: 'Errors should be logged to Bugsink'
        });
      } else {
        result.passed.push('Errors logged to monitoring service');
      }
    }

    // Check for conventional commit-style naming
    const functionNames = content.match(/(?:function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=\(]/g) || [];
    const nonCamelCase = functionNames.filter(fn => {
      const name = fn.match(/(?:function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)[1];
      return !/^[a-z][a-zA-Z0-9]*$/.test(name) && !name.startsWith('_') && name !== name.toUpperCase();
    });

    if (nonCamelCase.length > 3) {
      result.issues.push({
        type: 'NAMING_CONVENTION',
        severity: 'info',
        message: 'Use camelCase for function and variable names'
      });
    }

    return result;
  }

  /**
   * Check error handling
   */
  checkErrorHandling(content) {
    const result = { score: 100, issues: [], warnings: [], passed: [] };

    // Check for try-catch in async functions
    const asyncFunctions = content.match(/async\s+(?:function\s+)?\w*\s*\([^)]*\)\s*{[^}]*}/g) || [];
    const asyncWithoutTry = asyncFunctions.filter(fn => !fn.includes('try'));

    if (asyncWithoutTry.length > 0 && asyncFunctions.length > 0) {
      const percentage = (asyncWithoutTry.length / asyncFunctions.length) * 100;
      if (percentage > 50) {
        result.score -= 20;
        result.issues.push({
          type: 'MISSING_ERROR_HANDLING',
          severity: 'error',
          message: `${asyncWithoutTry.length} async functions without try-catch (${Math.round(percentage)}%)`,
          recommendation: 'Wrap async operations in try-catch blocks'
        });
      } else if (percentage > 25) {
        result.warnings.push({
          type: 'MISSING_ERROR_HANDLING',
          message: `${asyncWithoutTry.length} async functions might need try-catch`
        });
      }
    }

    if (asyncFunctions.length > 0 && asyncWithoutTry.length === 0) {
      result.passed.push('All async functions have error handling');
    }

    // Check for proper error re-throwing
    const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*}/g) || [];
    const silentCatches = catchBlocks.filter(cb =>
      !cb.includes('throw') && !cb.includes('console') && !cb.includes('log')
    );

    if (silentCatches.length > 0) {
      result.score -= 15;
      result.issues.push({
        type: 'SILENT_CATCH',
        severity: 'warning',
        message: `${silentCatches.length} catch block(s) silently swallow errors`,
        recommendation: 'Log or re-throw errors, never silently catch'
      });
    }

    // Check for Promise rejection handling
    if (content.includes('.then(') && !content.includes('.catch(')) {
      result.warnings.push({
        type: 'UNHANDLED_PROMISE',
        message: 'Promise chains should include .catch() for error handling'
      });
    }

    return result;
  }

  /**
   * Check performance patterns
   */
  checkPerformance(content) {
    const result = { score: 100, warnings: [], passed: [] };

    for (const [key, pattern] of Object.entries(PERFORMANCE_ANTIPATTERNS)) {
      if (pattern.pattern.test(content)) {
        result.score -= 10;
        result.warnings.push({
          type: key,
          message: pattern.message,
          pattern: pattern.name
        });
      }
    }

    // Check for efficient array methods
    const hasEfficientMethods = /\.map\(|\.filter\(|\.reduce\(|\.find\(|\.some\(|\.every\(/.test(content);
    if (hasEfficientMethods) {
      result.passed.push('Using efficient array methods');
    }

    // Check for debounce/throttle on event handlers
    if (content.includes('scroll') || content.includes('resize') || content.includes('input')) {
      if (!content.includes('debounce') && !content.includes('throttle')) {
        result.warnings.push({
          type: 'EVENT_OPTIMIZATION',
          message: 'Consider debounce/throttle for scroll/resize/input handlers'
        });
      } else {
        result.passed.push('Event handlers optimized with debounce/throttle');
      }
    }

    // Check for memoization hints
    if (content.includes('useMemo') || content.includes('useCallback') || content.includes('memo(')) {
      result.passed.push('Using React memoization');
    }

    return result;
  }

  /**
   * Check security patterns
   */
  checkSecurity(content) {
    const result = { score: 100, issues: [], passed: [] };

    for (const [key, pattern] of Object.entries(SECURITY_PATTERNS)) {
      if (pattern.pattern.test(content)) {
        result.score -= pattern.severity === 'critical' ? 30 : 15;
        result.issues.push({
          type: key,
          severity: pattern.severity,
          message: pattern.message,
          pattern: pattern.name
        });
      }
    }

    // Check for input validation
    if (content.includes('req.body') || content.includes('req.params') || content.includes('req.query')) {
      if (!content.includes('validate') && !content.includes('Joi') && !content.includes('zod') && !content.includes('yup')) {
        result.issues.push({
          type: 'INPUT_VALIDATION',
          severity: 'warning',
          message: 'User input should be validated',
          recommendation: 'Use Joi, Zod, or Yup for input validation'
        });
      } else {
        result.passed.push('Input validation present');
      }
    }

    // Check for proper authentication checks
    if (content.includes('router.') || content.includes('app.')) {
      if (content.includes('authMiddleware') || content.includes('isAuthenticated') || content.includes('verifyToken')) {
        result.passed.push('Authentication middleware used');
      }
    }

    if (result.issues.filter(i => i.severity === 'critical').length === 0) {
      result.passed.push('No critical security issues');
    }

    return result;
  }

  /**
   * Check code complexity
   */
  checkComplexity(content) {
    const result = { score: 100, warnings: [], passed: [] };

    // Check function length
    const functions = content.match(/(?:function|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|const\s+\w+\s*=\s*(?:async\s*)?function)[^}]*}/g) || [];
    const longFunctions = functions.filter(fn => fn.split('\n').length > 50);

    if (longFunctions.length > 0) {
      result.score -= 10;
      result.warnings.push({
        type: 'LONG_FUNCTION',
        message: `${longFunctions.length} function(s) exceed 50 lines`,
        recommendation: 'Break down into smaller, focused functions'
      });
    }

    // Check nesting depth
    const deepNesting = content.match(/\{[^{}]*\{[^{}]*\{[^{}]*\{[^{}]*\{/g);
    if (deepNesting && deepNesting.length > 2) {
      result.score -= 10;
      result.warnings.push({
        type: 'DEEP_NESTING',
        message: 'Deeply nested code detected (>4 levels)',
        recommendation: 'Use early returns or extract functions to reduce nesting'
      });
    }

    // Check file length
    const lineCount = content.split('\n').length;
    if (lineCount > 500) {
      result.warnings.push({
        type: 'LONG_FILE',
        message: `File has ${lineCount} lines (consider splitting)`
      });
    } else {
      result.passed.push(`File length acceptable (${lineCount} lines)`);
    }

    // Check cyclomatic complexity indicators
    const conditionals = (content.match(/if\s*\(|else\s*if|switch|case|\?\s*.*:/g) || []).length;
    const loops = (content.match(/for\s*\(|while\s*\(|\.forEach|\.map|\.filter/g) || []).length;

    const complexityScore = conditionals + loops;
    if (complexityScore > 30) {
      result.score -= 15;
      result.warnings.push({
        type: 'HIGH_COMPLEXITY',
        message: `High cyclomatic complexity (${complexityScore} branches/loops)`,
        recommendation: 'Simplify logic or split into smaller modules'
      });
    }

    return result;
  }

  /**
   * Check documentation
   */
  checkDocumentation(content) {
    const result = { score: 100, suggestions: [], passed: [] };

    // Check for JSDoc comments
    const functions = content.match(/(?:function|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g) || [];
    const jsdocComments = content.match(/\/\*\*[\s\S]*?\*\//g) || [];

    if (functions.length > 5 && jsdocComments.length < functions.length / 2) {
      result.score -= 10;
      result.suggestions.push({
        type: 'MISSING_JSDOC',
        message: 'Less than 50% of functions have JSDoc comments',
        recommendation: 'Add JSDoc comments for public functions'
      });
    } else if (jsdocComments.length > 0) {
      result.passed.push('JSDoc documentation present');
    }

    // Check for file-level comment
    if (content.trim().startsWith('/**') || content.trim().startsWith('//')) {
      result.passed.push('File has header comment');
    } else {
      result.suggestions.push({
        type: 'MISSING_FILE_HEADER',
        message: 'Consider adding a file header comment describing purpose'
      });
    }

    // Check for TODO/FIXME comments
    const todos = content.match(/\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK/gi) || [];
    if (todos.length > 3) {
      result.suggestions.push({
        type: 'TECH_DEBT',
        message: `${todos.length} TODO/FIXME comments - consider resolving`,
        details: 'Technical debt should be tracked and addressed'
      });
    }

    return result;
  }

  /**
   * Scheduled execution: lightweight grep-based code scan on platform-core
   * Called by dev-quality-report BullMQ job (weekly Monday 06:00)
   */
  async execute() {
    const srcPath = '/var/www/api.holidaibutler.com/platform-core/src';
    const results = {
      timestamp: new Date().toISOString(),
      consoleLogs: 0,
      hardcodedStrings: 0,
      todos: 0,
      fixmes: 0,
      hacks: 0,
      fileCount: 0,
      lineCount: 0,
      error: null
    };

    try {
      // 1. Count console.log statements (excluding test files and node_modules)
      try {
        const clOutput = execSync(
          `grep -rn "console\\.log" "${srcPath}" --include="*.js" --include="*.mjs" -c 2>/dev/null || echo "0"`,
          { encoding: 'utf8', timeout: 30000 }
        );
        results.consoleLogs = clOutput.trim().split('\n')
          .reduce((sum, line) => sum + (parseInt(line.split(':').pop()) || 0), 0);
      } catch { results.consoleLogs = -1; }

      // 2. Detect potential hardcoded secrets (password, apikey, secret with string values)
      try {
        const hsOutput = execSync(
          `grep -rn "\\(password\\|apikey\\|api_key\\|secret\\).*[=:].*['\\"]\\.\\{8,\\}" "${srcPath}" --include="*.js" --include="*.mjs" -c 2>/dev/null || echo "0"`,
          { encoding: 'utf8', timeout: 30000 }
        );
        results.hardcodedStrings = hsOutput.trim().split('\n')
          .reduce((sum, line) => sum + (parseInt(line.split(':').pop()) || 0), 0);
      } catch { results.hardcodedStrings = -1; }

      // 3. Count TODO/FIXME/HACK comments
      try {
        const todoOutput = execSync(
          `grep -rn "TODO\\|FIXME\\|HACK" "${srcPath}" --include="*.js" --include="*.mjs" 2>/dev/null | wc -l`,
          { encoding: 'utf8', timeout: 30000 }
        );
        const totalTodos = parseInt(todoOutput.trim()) || 0;
        results.todos = totalTodos;
      } catch { results.todos = -1; }

      // 4. File count + line count
      try {
        const fcOutput = execSync(
          `find "${srcPath}" -name "*.js" -o -name "*.mjs" | wc -l`,
          { encoding: 'utf8', timeout: 15000 }
        );
        results.fileCount = parseInt(fcOutput.trim()) || 0;
      } catch { results.fileCount = -1; }

      try {
        const lcOutput = execSync(
          `find "${srcPath}" \\( -name "*.js" -o -name "*.mjs" \\) -exec cat {} + | wc -l`,
          { encoding: 'utf8', timeout: 30000 }
        );
        results.lineCount = parseInt(lcOutput.trim()) || 0;
      } catch { results.lineCount = -1; }

    } catch (e) {
      results.error = e.message;
    }

    try {
      await logAgent('code', 'code_quality_scan', {
        description: `Code scan: ${results.fileCount} files, ${results.lineCount} lines, ${results.consoleLogs} console.logs, ${results.todos} TODOs`,
        status: results.error ? 'failed' : 'completed',
        metadata: results
      });
    } catch (logErr) {
      console.error('[CodeReviewer] Failed to log scan result:', logErr.message);
    }

    console.log(`[CodeReviewer] Code scan: ${results.fileCount} files, ${results.lineCount} lines, ${results.consoleLogs} console.logs, ${results.todos} TODOs`);
    return results;
  }
}

export { CODE_CONVENTIONS, PERFORMANCE_ANTIPATTERNS, SECURITY_PATTERNS };
export default new CodeReviewer();
