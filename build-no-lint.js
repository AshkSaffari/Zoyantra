const { execSync } = require('child_process');

// Set environment variables to disable ESLint
process.env.GENERATE_SOURCEMAP = 'false';
process.env.CI = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.ESLINT_NO_DEV_ERRORS = 'true';

console.log('🔨 Building without ESLint warnings as errors...');

try {
  execSync('react-scripts build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
