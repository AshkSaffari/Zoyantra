#!/usr/bin/env node

/**
 * Clear All App Data Script
 * 
 * This script clears all localStorage and sessionStorage data
 * for the Zoyantra Construction Cloud app.
 * 
 * Usage:
 *   node clear-app-data.js
 */

console.log('🧹 Zoyantra App Data Cleaner');
console.log('============================');

// List of known localStorage keys to clear
const keysToRemove = [
  // Authentication
  'zoyantra_credentials',
  
  // Timesheet data
  'zoyantra_timesheets',
  'cewa_timesheets_archived',
  'zoyantra_archived_timesheets',
  
  // Project data
  'zoyantra_project_phases',
  'zoyantra_project_tasks',
  'zoyantra_project_budgets',
  'zoyantra_project_members',
  'zoyantra_project_crews',
  'zoyantra_member_rates',
  
  // Expense data
  'zoyantra_created_expenses',
  'zoyantra_expense_data',
  
  // Cache data
  'zoyantra_hubs_cache',
  'zoyantra_projects_cache',
  'zoyantra_members_cache',
  'zoyantra_budgets_cache',
];

// Patterns to match for dynamic keys
const keyPatterns = [
  /^members_cache_/,
  /^budgets_cache_/,
  /^zoyantra_/,
  /^cewa_/,
  /timesheet/,
  /expense/,
  /project/,
  /member/,
  /budget/,
  /crew/,
  /task/,
  /phase/
];

console.log('📋 This will clear the following types of data:');
console.log('   • Authentication tokens and credentials');
console.log('   • All timesheet data (active and archived)');
console.log('   • All project data, tasks, and phases');
console.log('   • All expense data');
console.log('   • All member and crew data');
console.log('   • All cached API responses');
console.log('   • All session storage data');
console.log('');

// Note: This script can only clear data when run in a browser context
// For actual clearing, use the "Clear ALL Data" button in the app
console.log('⚠️  Note: This script shows what would be cleared.');
console.log('   To actually clear the data, use the "Clear ALL Data" button in the app.');
console.log('');

console.log('🔍 Known localStorage keys to remove:');
keysToRemove.forEach(key => {
  console.log(`   • ${key}`);
});

console.log('');
console.log('🔍 Key patterns to match:');
keyPatterns.forEach(pattern => {
  console.log(`   • ${pattern}`);
});

console.log('');
console.log('✅ To clear all data, open the app and click "Clear ALL Data" button');
console.log('   or run this in the browser console:');
console.log('');
console.log('   // Clear all app data');
console.log('   localStorage.clear();');
console.log('   sessionStorage.clear();');
console.log('   location.reload();');
console.log('');
console.log('🎉 Data clearing instructions complete!');
