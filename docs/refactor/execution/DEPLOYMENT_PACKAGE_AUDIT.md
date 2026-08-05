# Deployment Package Audit

Generated: 2026-08-05

## Current Package Contents

### Included Now (should NOT be in deployment)

| Item | Reason | Action |
|------|--------|--------|
| `node_modules/` | Local dev dependencies | Exclude from deployment |
| `.git/` | Version control | Exclude from deployment |
| `.vs/` | Visual Studio state | Exclude from deployment |
| `.vscode/` | IDE config | Exclude from deployment |
| `.agent-cache/` | Agent cache | Exclude from deployment |
| `.wrangler/` | Wrangler state | Exclude from deployment |
| `*.log` | Log files | Exclude from deployment |
| `.env*` | Secrets | Exclude from deployment |
| `dist/` | Build output | Include in deployment |
| `build/` | Build output | Include in deployment |

### Should Be Included in Deployment

| Item | Purpose |
|------|---------|
| `dist/` or `build/` | Production build output |
| `package.json` | Dependencies |
| `package-lock.json` | Lock file |
| `worker/index.ts` | Workers entry (if deploying to CF) |
| Static assets | Images, fonts, etc. |

### Must Be Excluded from Deployment

| Item | Reason |
|------|--------|
| `node_modules/` from dev machine | Use `npm ci --production` |
| `.git/` | Not needed in production |
| `.env*` | Secrets must be injected at deploy time |
| `*.log` | No logs in deployment |
| `.vs/`, `.vscode/`, `.idea/` | IDE state |
| `.agent-cache/` | Agent cache |
| `.wrangler/` | Wrangler state |
| `docs/` | Internal documentation |
| `.local-backup/` | Refactor protection |
| `scripts/` | Dev-only scripts |
| `tests/` | Test files |

## Build Strategy

```
vinext build → Creates dist/ with Workers bundle
```

**Note:** The current build targets Workers runtime. For Node.js deployment,
a separate build configuration is needed (deferred to Phase 2+).

## Dependency Installation Strategy

```
npm ci --production  (for deployment)
npm install          (for development)
```

**Note:** The patched `vinext` static-file-cache.js fix in `node_modules/`
will be lost on `npm install`. Must re-apply after reinstall.

## Environment Injection Strategy

1. Never commit `.env` files
2. Inject secrets at deploy time via:
   - Docker: `--env-file` or `--env`
   - CI/CD: Secret variables
   - VM: System environment or `.env` file on server
3. Use `.env.example` as template

## Recommendations

1. Create a `.dockerignore` file for Docker deployments
2. Create a `.deployignore` file for generic deployments
3. Ensure build output is self-contained
4. Test deployment in isolated environment before production
5. Document deployment process in README

## Deferred Actions

- [ ] Create Dockerfile with proper exclusions
- [ ] Create .dockerignore
- [ ] Create deployment documentation
- [ ] Test Node.js build target (Phase 2)
