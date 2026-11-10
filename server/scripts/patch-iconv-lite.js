const fs = require('node:fs');
const path = require('node:path');

// Wrangler's Worker bundler can misinterpret iconv-lite's browser field and
// replace its Node stream helpers with empty modules. Express/body-parser needs
// those helpers in the Workers Node.js compatibility runtime.
let current = path.dirname(require.resolve('iconv-lite'));
let packagePath;

while (current !== path.dirname(current)) {
  const candidate = path.join(current, 'package.json');
  if (fs.existsSync(candidate)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (pkg.name === 'iconv-lite') {
        packagePath = candidate;
        break;
      }
    } catch {
      // Continue walking up if this is not the package manifest.
    }
  }
  current = path.dirname(current);
}

if (!packagePath) {
  throw new Error('Could not locate the installed iconv-lite package to apply the Cloudflare Workers compatibility patch.');
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.browser) {
  delete pkg.browser;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Applied Cloudflare Workers compatibility patch to iconv-lite.');
} else {
  console.log('iconv-lite has no browser field; no compatibility patch was needed.');
}
