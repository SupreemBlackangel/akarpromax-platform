#!/usr/bin/env node

/**
 * AkarProMax Architecture Enforcement Tests
 * 
 * This script checks architectural rules from ADR-000, ADR-001, ADR-002.
 * Run: node scripts/check-architecture.mjs
 * 
 * Rules checked:
 * - Module boundaries
 * - Schema ownership
 * - UI separation (Public/Admin)
 * - Auth patterns
 * - Database systems
 * - AdSlot usage
 * - Layout rules
 * - File size limits
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let totalViolations = 0;
let totalWarnings = 0;
let legacyExceptions = 0;
const violations = [];
const warnings = [];

// Load exceptions
let exceptions = [];
try {
  const excFile = readFileSync(join(ROOT, 'architecture-exceptions.json'), 'utf8');
  exceptions = JSON.parse(excFile).exceptions || [];
} catch {
  // No exceptions file
}

function isException(rule, path) {
  return exceptions.some(e => e.rule === rule && path.includes(e.path));
}

function addViolation(rule, file, line, detail) {
  if (isException(rule, file)) {
    legacyExceptions++;
    return;
  }
  totalViolations++;
  violations.push({ rule, file, line, detail });
}

function addWarning(rule, file, line, detail) {
  totalWarnings++;
  warnings.push({ rule, file, line, detail });
}

function getAllFiles(dirs, extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs']) {
  const files = [];
  for (const dir of dirs) {
    const fullPath = join(ROOT, dir);
    if (!existsSync(fullPath)) continue;
    
    function walk(current) {
      const entries = readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const path = join(current, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.next', 'dist', 'build', '.git', '.agent-cache'].includes(entry.name)) {
            walk(path);
          }
        } else if (extensions.includes(extname(entry.name))) {
          files.push(path);
        }
      }
    }
    walk(fullPath);
  }
  return files;
}

function readFileContent(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function relativePath(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

// ============================================================
// TEST 1: Module Boundary Imports
// ============================================================
function testModuleBoundaries() {
  console.log(`${CYAN}[TEST 1] Module Boundary Imports${RESET}`);
  
  const files = getAllFiles(['app', 'src', 'lib']);
  const modulePattern = /from\s+["']@?\/(modules\/[^/]+)\//g;
  const internalPattern = /from\s+["']@?\/(modules\/[^/]+\/(?:internal|repository|schema|service))/g;
  
  for (const file of files) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    // Check for cross-module internal imports
    const internalMatches = content.matchAll(internalPattern);
    for (const match of internalMatches) {
      addViolation('ARCH-022', rel, 0, `Internal import from ${match[1]}`);
    }
    
    // Check for direct module imports (non-contract)
    const moduleMatches = content.matchAll(modulePattern);
    for (const match of moduleMatches) {
      if (!match[1].includes('/contracts') && !match[1].includes('/public')) {
        addViolation('ARCH-001', rel, 0, `Direct import from ${match[1]} (not contract/public)`);
      }
    }
  }
  
  console.log(`  Files checked: ${files.length}`);
}

// ============================================================
// TEST 2: Circular Dependencies
// ============================================================
function testCircularDependencies() {
  console.log(`${CYAN}[TEST 2] Circular Dependencies${RESET}`);
  
  // Simplified: check for obvious circular patterns
  const files = getAllFiles(['lib', 'app']);
  const imports = new Map();
  
  for (const file of files) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    const importPattern = /from\s+["']([^"']+)["']/g;
    const fileImports = [];
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      if (match[1].startsWith('@/')) {
        fileImports.push(match[1]);
      }
    }
    imports.set(rel, fileImports);
  }
  
  // Simple cycle detection
  for (const [file, fileImports] of imports) {
    for (const imp of fileImports) {
      const impFile = imports.get(imp);
      if (impFile && impFile.includes(`@/${file.split('/')[0]}`)) {
        addViolation('ARCH-003', file, 0, `Potential circular with ${imp}`);
      }
    }
  }
  
  console.log(`  Import maps analyzed: ${imports.size}`);
}

// ============================================================
// TEST 3: Public/Admin Separation
// ============================================================
function testPublicAdminSeparation() {
  console.log(`${CYAN}[TEST 3] Public/Admin Separation${RESET}`);
  
  const publicPages = getAllFiles(['app']).filter(f => 
    !f.includes('admin') && 
    !f.includes('api') && 
    (f.includes('page.tsx') || f.includes('page.ts'))
  );
  
  // Only flag actual imports of admin-module code (import statements that
  // resolve into the admin tree), not substring matches like permission
  // names (`ADMIN_DASHBOARD_VIEW`) or `/admin` hrefs inside a public page.
  const adminImportPattern = /(?:from|import)\s+["'][^"']*\/(?:admin|Admin)(?:\/[^"']*)?["']/g;
  
  for (const file of publicPages) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    const adminImports = content.match(adminImportPattern);
    if (adminImports && adminImports.length) {
      const resolved = adminImports.map((m) => m.replace(/(?:from|import)\s+/, "").replace(/["']/g, ""));
      const realAdminImports = resolved.filter((spec) =>
        spec.startsWith("@/app/admin") ||
        spec.startsWith("@/components/admin") ||
        spec.startsWith("@/src/components/admin") ||
        spec.startsWith("../../admin/") ||
        spec.includes("/admin/")
      );
      if (realAdminImports.length) {
        addViolation('ARCH-005', rel, 0, `Public page imports admin content: ${realAdminImports.join(', ')}`);
      }
    }
  }
  
  // Check admin pages importing public navigation
  const adminPages = getAllFiles(['app/admin']).filter(f => 
    f.includes('page.tsx') || f.includes('page.ts')
  );
  
  for (const file of adminPages) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    if (content.includes('PublicLayout') || content.includes('PublicPageShell')) {
      addViolation('ARCH-006', rel, 0, `Admin page imports public layout`);
    }
  }
  
  console.log(`  Public pages: ${publicPages.length}, Admin pages: ${adminPages.length}`);
}

// ============================================================
// TEST 4: Layout Count
// ============================================================
function testLayoutCount() {
  console.log(`${CYAN}[TEST 4] Layout Count${RESET}`);
  
  const allLayouts = [];
  
  // Search for layout files
  const files = getAllFiles(['app', 'src', 'components']);
  for (const file of files) {
    if (file.includes('layout.tsx') || file.includes('layout.ts')) {
      allLayouts.push(relativePath(file));
    }
  }
  
  // Check for unauthorized layouts
  const allowedLayoutPatterns = [
    'app/(account)/layout',
    'app/(admin)/layout',
    'app/(public)/layout',
    'app/(workspace)/layout',
    'app/layout',
    'app/admin/layout',
    'standard-public-ad-layout',
    'public-shell-layout',
  ];
  for (const layout of allLayouts) {
    const isAllowed = allowedLayoutPatterns.some(pattern => layout.includes(pattern));
    
    if (!isAllowed && !layout.includes('node_modules')) {
      addWarning('ARCH-007', layout, 0, `Layout not in allowed list`);
    }
  }
  
  console.log(`  Layouts found: ${allLayouts.length}`);
}

// ============================================================
// TEST 5: Local Header/Footer
// ============================================================
function testLocalHeaderFooter() {
  console.log(`${CYAN}[TEST 5] Local Header/Footer${RESET}`);
  
  const pages = getAllFiles(['app', 'src']).filter(f => 
    f.includes('page.tsx') || f.includes('page.ts')
  );
  
  for (const file of pages) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    if (content.includes('<header') || content.includes('<Header')) {
      addViolation('ARCH-008', rel, 0, `Page defines local Header`);
    }
    if (content.includes('<footer') || content.includes('<Footer')) {
      addViolation('ARCH-008', rel, 0, `Page defines local Footer`);
    }
  }
  
  console.log(`  Pages checked: ${pages.length}`);
}

// ============================================================
// TEST 6: AdSlot Usage
// ============================================================
function testAdSlotUsage() {
  console.log(`${CYAN}[TEST 6] AdSlot Usage${RESET}`);
  
  const pages = getAllFiles(['app', 'src']).filter(f => 
    f.includes('page.tsx') || f.includes('page.ts')
  );
  
  for (const file of pages) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    // Check for hardcoded ad images
    if (content.includes('/ads/') || content.includes('ad-image') || content.includes('banner')) {
      if (!content.includes('AdSlot')) {
        addViolation('ARCH-009', rel, 0, `Hardcoded ad without AdSlot`);
      }
    }
  }
  
  console.log(`  Pages checked: ${pages.length}`);
}

// ============================================================
// TEST 7: Auth Patterns
// ============================================================
function testAuthPatterns() {
  console.log(`${CYAN}[TEST 7] Auth Patterns${RESET}`);
  
  const files = getAllFiles(['app', 'src', 'lib', 'components']);
  
  for (const file of files) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    // localStorage token
    if (content.includes('localStorage') && content.includes('token')) {
      addViolation('ARCH-010', rel, 0, `localStorage token usage`);
    }
    
    // OpenAI/ChatGPT headers
    if (content.includes('x-openai') || content.includes('x-chatgpt') || content.includes('oai-authenticated')) {
      if (!isException('ARCH-011', rel)) {
        addViolation('ARCH-011', rel, 0, `OpenAI/ChatGPT header identity`);
      }
    }
    
    // Localhost auto-admin
    if (content.includes('localhost') && content.includes('admin') && content.includes('fallback')) {
      addViolation('ARCH-012', rel, 0, `Localhost auto-admin fallback`);
    }
  }
  
  console.log(`  Files checked: ${files.length}`);
}

// ============================================================
// TEST 8: Database Systems
// ============================================================
function testDatabaseSystems() {
  console.log(`${CYAN}[TEST 8] Database Systems${RESET}`);
  
  const files = getAllFiles(['lib', 'app/api', 'db']);
  const dbSystems = new Set();
  
  for (const file of files) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    // PostgreSQL
    if (content.includes('postgresql') || content.includes('pg') || content.includes('postgres')) {
      dbSystems.add('postgresql');
    }
    
    // MySQL
    if (content.includes('mysql') || content.includes('mysql2')) {
      dbSystems.add('mysql');
    }
    
    // D1/SQLite
    if (content.includes('cloudflare:d1') || content.includes('better-sqlite')) {
      dbSystems.add('d1/sqlite');
    }
  }
  
  if (dbSystems.size > 3) {
    addViolation('ARCH-014', 'codebase', 0, `More than 3 database systems: ${[...dbSystems].join(', ')}`);
  }
  
  console.log(`  Database systems found: ${[...dbSystems].join(', ')}`);
}

// ============================================================
// TEST 9: Business Logic in React
// ============================================================
function testBusinessLogicInReact() {
  console.log(`${CYAN}[TEST 9] Business Logic in React${RESET}`);
  
  const pages = getAllFiles(['app']).filter(f => 
    f.includes('page.tsx') || f.includes('page.ts')
  );
  
  const logicPatterns = [
    /await\s+db\./,
    /\.prepare\(/,
    /\.execute\(/,
    /INSERT\s+INTO/i,
    /UPDATE\s+.+\s+SET/i,
    /DELETE\s+FROM/i,
  ];
  
  for (const file of pages) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    
    for (const pattern of logicPatterns) {
      if (pattern.test(content)) {
        addViolation('ARCH-016', rel, 0, `Business logic in React component`);
        break;
      }
    }
  }
  
  console.log(`  Pages checked: ${pages.length}`);
}

// ============================================================
// TEST 10: File Size Limits
// ============================================================
function testFileSizeLimits() {
  console.log(`${CYAN}[TEST 10] File Size Limits${RESET}`);
  
  const files = getAllFiles(['app', 'src', 'lib', 'components']);
  
  for (const file of files) {
    const content = readFileContent(file);
    const rel = relativePath(file);
    const lines = content.split('\n').length;
    
    if (file.includes('page.tsx') || file.includes('page.ts')) {
      if (lines > 800) {
        addViolation('ARCH-025', rel, 0, `Page component ${lines} lines (>800)`);
      } else if (lines > 300) {
        addWarning('ARCH-025', rel, 0, `Page component ${lines} lines (>300)`);
      }
    } else if (file.includes('.tsx') || file.includes('.ts')) {
      if (lines > 400) {
        addWarning('ARCH-025', rel, 0, `Component ${lines} lines (>400)`);
      }
    }
  }
  
  console.log(`  Files checked: ${files.length}`);
}

// ============================================================
// RUN ALL TESTS
// ============================================================
console.log(`${CYAN}========================================${RESET}`);
console.log(`${CYAN}AkarProMax Architecture Enforcement${RESET}`);
console.log(`${CYAN}========================================${RESET}`);
console.log('');

testModuleBoundaries();
testCircularDependencies();
testPublicAdminSeparation();
testLayoutCount();
testLocalHeaderFooter();
testAdSlotUsage();
testAuthPatterns();
testDatabaseSystems();
testBusinessLogicInReact();
testFileSizeLimits();

console.log('');
console.log(`${CYAN}========================================${RESET}`);
console.log(`${CYAN}RESULTS${RESET}`);
console.log(`${CYAN}========================================${RESET}`);
console.log(`Total violations: ${totalViolations}`);
console.log(`Total warnings: ${totalWarnings}`);
console.log(`Legacy exceptions: ${legacyExceptions}`);
console.log('');

if (violations.length > 0) {
  console.log(`${RED}VIOLATIONS:${RESET}`);
  for (const v of violations) {
    console.log(`  ${RED}[${v.rule}]${RESET} ${v.file}: ${v.detail}`);
  }
  console.log('');
}

if (warnings.length > 0) {
  console.log(`${YELLOW}WARNINGS:${RESET}`);
  for (const w of warnings) {
    console.log(`  ${YELLOW}[${w.rule}]${RESET} ${w.file}: ${w.detail}`);
  }
  console.log('');
}

console.log(`${CYAN}Final Result: ${totalViolations === 0 ? `${GREEN}PASS` : `${RED}FAIL`}${RESET}`);

process.exit(totalViolations > 0 ? 1 : 0);
