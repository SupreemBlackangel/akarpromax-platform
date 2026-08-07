# Vinext Runtime Patches

Status: **Verified** · 2026-08-06 · For `vinext@0.0.50` on Windows

## The problem

Under `vinext start`, all static CSS/JS assets under `/assets/*` return **404**
on Windows. Root cause: `walkFilesWithStats` in
`node_modules/vinext/dist/server/static-file-cache.js` builds the on-disk cache
key with `path.relative(base, file)`, which on Windows yields backslash segments
(`assets\index-abc.css`). Incoming requests use forward slashes
(`/assets/index-abc.css`), so the cache lookup **always misses** and the asset
is treated as absent → 404.

Root-level assets such as `/favicon.svg` (served via a separate code path) are
unaffected.

## Manual patch (one-liner)

In `node_modules/vinext/dist/server/static-file-cache.js`, at the
`batch[j]` loop that records cache entries, change `relativePath` to use forward
slashes:

```diff
- relativePath: path.relative(base, batch[j]),
+ relativePath: path.relative(base, batch[j]).split(path.sep).join("/"),
```

This normalizes Windows backslash separators to forward slashes so the key
matches the incoming request path.

## Reproducibility

This patch lives in `node_modules` and is **lost on `npm install`/`npm ci`**.
To make it reproducible across machines and CI:

1. Verify the line after install:
   ```bash
   grep -n "relativePath: path.relative(base, batch[j]" node_modules/vinext/dist/server/static-file-cache.js
   ```
2. Apply the patch (idempotent):
   ```bash
   node -e 'const f="node_modules/vinext/dist/server/static-file-cache.js";\
   let s=require("fs").readFileSync(f,"utf8");\
   const before="relativePath: path.relative(base, batch[j])";\
   const after=before.replace("(", "(").slice(0,-1)+".split(path.sep).join(\"/\"),";\
   if(!s.includes(after)){s=s.replace(before,after);require("fs").writeFileSync(f,s);console.log("patched");}else{console.log("already patched");}'
   ```
   (Equivalent to `sed -i 's#relativePath: path.relative(base, batch[j])#relativePath: path.relative(base, batch[j]).split(path.sep).join("/")#' ...`.)
3. Add an npm hook so it survives installs. In `package.json`:
   ```jsonc
   "scripts": {
     "postinstall": "node ./scripts/patch-vinext-windows.js"
   }
   ```
   where `scripts/patch-vinext-windows.js` performs the replacement above in a
   version-checked, idempotent way (no-op if the exact original string is
   absent, e.g. on non-Windows or after the upstream fix lands).

## Verification

After `npm install` + patch + `npm run build` + `vinext start`:

```bash
curl -o /dev/null -w "%{http_code}\n" http://localhost:3011/assets/index-*.css   # 200
curl -o /dev/null -w "%{http_code}\n" http://localhost:3011/                    # 200
```

## When the patch is no longer needed

- Upstream `vinext` fixes `walkFilesWithStats` (cross-platform `path.posix` or
  separator-normalized keys), or
- The project stops serving assets from `vinext` and moves to a CDN/static host.

Remove the `postinstall` hook and delete `scripts/patch-vinext-windows.js`.
The check is keyed on the original string, so a no-op is safe in the meantime.
