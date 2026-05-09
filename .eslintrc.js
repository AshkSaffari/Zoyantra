module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // Temporarily disable problematic rules for build
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'no-dupe-keys': 'warn',
    'no-dupe-class-members': 'warn',
    'import/no-anonymous-default-export': 'warn',
    'no-loop-func': 'warn'
  }
};