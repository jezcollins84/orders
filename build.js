// build.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['app.js'], // Ensure this is 'app.js' (lowercase)
  bundle: true,
  outfile: 'bundle.js',
  minify: true,
  sourcemap: true,
  target: ['es2020'], // Ensure compatibility with modern browsers
  jsxFactory: 'React.createElement', // Required for React JSX
  jsxFragment: 'React.Fragment',
  loader: { '.js': 'jsx' }, // Added this line previously
  // Crucial: Tell esbuild that 'react' and 'react-dom' are external and
  // should be referenced as global variables 'React' and 'ReactDOM' respectively.
  external: ['react', 'react-dom'],
  globalName: 'AppBundle', // A unique global name for your bundled app if needed, though not strictly required for this fix
}).catch(() => process.exit(1));

console.log('Build complete: bundle.js created.');
