/**
 * scripts/preload-server-only.ts
 *
 * Preload module to bypass Next.js 'server-only' package restriction in CLI test runners.
 */
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {}
