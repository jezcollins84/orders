// build.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['app.js'], // Ensure this is 'app.js' (lowercase)
  bundle: true,
  outfile: 'bundle.js',
  minify: true,
  sourcemap: true,
  target: ['es2020'], // Ensure compatibility with modern browsers
  // Removed jsxFactory and jsxFragment as loader: { '.js': 'jsx' } handles it
  loader: { '.js': 'jsx' },
  // Removed 'external: ['react', 'react-dom']' because app.js no longer imports them.
  // They are now expected to be global.
}).catch(() => process.exit(1));

console.log('Build complete: bundle.js created.');
