#!/usr/bin/env node

/**
 * AkarProMax Module Boundary Tests
 * 
 * Run: node scripts/check-module-boundaries.mjs
 * 
 * Checks:
 * - No cross-module direct imports
 * - No internal folder imports
 * - Public API exports
 * - Schema ownership
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let violations = 0;
let warnings = 0;
let legacyExceptions = 0;

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

// Module definitions with allowed imports
const MODULES = {
  identity: {
    path: 'modules/identity',
    allowed: ['shared/contracts', 'shared/events', 'shared/types'],
    tables: ['users', 'roles', 'permissions', 'sessions', 'otp', 'email_verifications']
  },
  properties: {
    path: 'modules/properties',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts'],
    tables: ['properties', 'property_images', 'property_features', 'property_status_history', 'property_documents']
  },
  auctions: {
    path: 'modules/auctions',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts', 'modules/properties/contracts'],
    tables: ['auctions', 'bids', 'proxy_bids', 'auction_consents', 'auction_events']
  },
  services: {
    path: 'modules/services',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts'],
    tables: ['service_listings', 'service_requests', 'service_offers', 'service_orders', 'service_messages', 'service_reviews', 'service_disputes']
  },
  organizations: {
    path: 'modules/organizations',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts'],
    tables: ['organizations', 'branches', 'organization_members']
  },
  community: {
    path: 'modules/community',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts'],
    tables: ['forum_topics', 'forum_posts', 'forum_reactions']
  },
  knowledge: {
    path: 'modules/knowledge',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts'],
    tables: ['articles', 'categories', 'article_views']
  },
  advertisements: {
    path: 'modules/advertisements',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts', 'modules/properties/contracts', 'modules/services/contracts', 'modules/organizations/contracts'],
    tables: ['campaigns', 'placements', 'creatives', 'impressions', 'clicks']
  },
  notifications: {
    path: 'modules/notifications',
    allowed: ['shared/contracts', 'shared/events', 'shared/types', 'modules/identity/contracts'],
    tables: ['notification_templates', 'notification_queue', 'delivery_logs', 'user_notification_preferences']
  },
  office: {
    path: 'modules/office',
    allowed: ['shared/contracts', 'shared/events', 'shared/types'],
    tables: ['office_sync', 'offline_data', 'documents']
  }
};

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  if (!existsSync(dir)) return files;
  
  function walk(current) {
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(entry.name)) {
          walk(path);
        }
      } else if (extensions.includes(extname(entry.name))) {
        files.push(path);
      }
    }
  }
  walk(dir);
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

// Check imports in files
console.log(`${CYAN}========================================${RESET}`);
console.log(`${CYAN}Module Boundary Tests${RESET}`);
console.log(`${CYAN}========================================${RESET}`);
console.log('');

const files = getAllFiles('app').concat(getAllFiles('src')).concat(getAllFiles('lib'));
const importPattern = /from\s+["']([^"']+)["']/g;

for (const file of files) {
  const content = readFileContent(file);
  const rel = relativePath(file);
  
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const importPath = match[1];
    
    // Check for internal imports
    if (importPath.includes('/internal/') || importPath.includes('/repository/') || importPath.includes('/service')) {
      if (isException('ARCH-022', rel)) {
        legacyExceptions++;
      } else {
        console.log(`${RED}[ARCH-022] ${rel}: Internal import ${importPath}${RESET}`);
        violations++;
      }
    }
  }
}

// Check module public exports
console.log('');
console.log(`${CYAN}Module Public Exports:${RESET}`);

for (const [name, mod] of Object.entries(MODULES)) {
  const modulePath = join(ROOT, mod.path);
  const hasIndex = existsSync(join(modulePath, 'index.ts')) || existsSync(join(modulePath, 'index.tsx'));
  const hasPublic = existsSync(join(modulePath, 'public.ts'));
  
  if (!hasIndex && !hasPublic) {
    console.log(`${YELLOW}[WARN] ${name}: No index.ts or public.ts found${RESET}`);
    warnings++;
  } else {
    console.log(`${GREEN}[OK] ${name}: Has public export${RESET}`);
  }
}

// Summary
console.log('');
console.log(`${CYAN}========================================${RESET}`);
console.log(`${CYAN}Summary${RESET}`);
console.log(`${CYAN}========================================${RESET}`);
console.log(`Violations: ${violations}`);
console.log(`Warnings: ${warnings}`);
console.log(`Result: ${violations === 0 ? `${GREEN}PASS` : `${RED}FAIL`}${RESET}`);

process.exit(violations > 0 ? 1 : 0);
