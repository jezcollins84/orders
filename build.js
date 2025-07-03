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
  external: ['react', 'react-dom'], // <<< ADD THIS CRUCIAL LINE
}).catch(() => process.exit(1));

console.log('Build complete: bundle.js created.');
