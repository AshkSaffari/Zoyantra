/**
 * Project Diagnostic Tool
 * 
 * This tool helps diagnose specific issues with your project ID
 * and provides step-by-step solutions.
 */

import AccService from './src/services/AccService.js';

/**
 * Diagnose a specific project ID issue
 * @param {string} projectId - The project ID to diagnose
 */
async function diagnoseProject(projectId) {
  console.log('🔍 Project Diagnostic Tool');
  console.log('=' .repeat(50));
  console.log(`📋 Project ID: ${projectId}`);
  console.log(`📋 Clean ID: ${projectId.startsWith('b.') ? projectId.substring(2) : projectId}`);
  console.log('');

  const results = {
    projectId,
    cleanId: projectId.startsWith('b.') ? projectId.substring(2) : projectId,
    steps: [],
    errors: [],
    recommendations: []
  };

  try {
    // Step 1: Check authentication
    console.log('🔐 Step 1: Checking Authentication...');
    const authStatus = AccService.getAuthStatus();
    results.steps.push({
      step: 'Authentication',
      success: authStatus.isAuthenticated,
      details: authStatus
    });

    if (!authStatus.isAuthenticated) {
      results.errors.push('User not authenticated');
      results.recommendations.push('Sign in to ACC first');
      console.log('❌ Not authenticated');
      return results;
    }
    console.log('✅ Authenticated');

    // Step 2: Check if project exists and is accessible
    console.log('\n📁 Step 2: Checking Project Access...');
    try {
      const projectDetails = await AccService.getProjectDetails(projectId);
      results.steps.push({
        step: 'Project Access',
        success: !!projectDetails,
        details: projectDetails
      });
      console.log('✅ Project accessible');
    } catch (error) {
      results.steps.push({
        step: 'Project Access',
        success: false,
        error: error.message
      });
      results.errors.push(`Project not accessible: ${error.message}`);
      results.recommendations.push('Check if project ID is correct and you have access');
      console.log('❌ Project not accessible:', error.message);
      return results;
    }

    // Step 3: Check Cost Management availability
    console.log('\n💰 Step 3: Checking Cost Management...');
    try {
      const hasCostManagement = await AccService.hasCostManagement(projectId);
      results.steps.push({
        step: 'Cost Management Check',
        success: hasCostManagement,
        details: { hasCostManagement }
      });

      if (!hasCostManagement) {
        results.errors.push('Cost Management not available for this project');
        results.recommendations.push('Enable Cost Management in ACC project settings');
        results.recommendations.push('Verify project type supports Cost Management');
        console.log('❌ Cost Management not available');
        console.log('💡 This is why you\'re getting the 404 error');
        return results;
      }
      console.log('✅ Cost Management available');
    } catch (error) {
      results.steps.push({
        step: 'Cost Management Check',
        success: false,
        error: error.message
      });
      results.errors.push(`Cost Management check failed: ${error.message}`);
      results.recommendations.push('Check Cost Management setup and permissions');
      console.log('❌ Cost Management check failed:', error.message);
      return results;
    }

    // Step 4: Try to get cost container ID
    console.log('\n🔍 Step 4: Getting Cost Container ID...');
    try {
      const costContainerId = await AccService.getCostContainerId(projectId);
      results.steps.push({
        step: 'Cost Container ID',
        success: !!costContainerId,
        details: { costContainerId }
      });
      console.log(`✅ Cost Container ID: ${costContainerId}`);
    } catch (error) {
      results.steps.push({
        step: 'Cost Container ID',
        success: false,
        error: error.message
      });
      results.errors.push(`Could not get cost container ID: ${error.message}`);
      results.recommendations.push('Check if project has proper Cost Management setup');
      console.log('❌ Could not get cost container ID:', error.message);
    }

    // Step 5: Test expenses endpoint directly
    console.log('\n📊 Step 5: Testing Expenses Endpoint...');
    try {
      const expenses = await AccService.getExpenses(projectId);
      results.steps.push({
        step: 'Expenses Endpoint',
        success: true,
        details: { expenseCount: expenses.length }
      });
      console.log(`✅ Expenses endpoint working: ${expenses.length} expenses found`);
    } catch (error) {
      results.steps.push({
        step: 'Expenses Endpoint',
        success: false,
        error: error.message
      });
      results.errors.push(`Expenses endpoint failed: ${error.message}`);
      
      // Parse error details
      if (error.message.includes('40004')) {
        results.recommendations.push('Error 40004: Project not found in Cost Management');
        results.recommendations.push('Enable Cost Management in ACC project settings');
      } else if (error.message.includes('403')) {
        results.recommendations.push('Error 403: Permission denied - check Cost Management permissions');
      } else if (error.message.includes('404')) {
        results.recommendations.push('Error 404: Cost Management not available for this project');
      }
      
      console.log('❌ Expenses endpoint failed:', error.message);
    }

  } catch (error) {
    results.errors.push(`Diagnostic failed: ${error.message}`);
    console.error('❌ Diagnostic failed:', error);
  }

  // Display summary
  console.log('\n📊 Diagnostic Summary');
  console.log('=' .repeat(50));
  console.log(`✅ Successful steps: ${results.steps.filter(s => s.success).length}`);
  console.log(`❌ Failed steps: ${results.steps.filter(s => !s.success).length}`);
  console.log(`💡 Recommendations: ${results.recommendations.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Issues Found:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  return results;
}

/**
 * Quick fix suggestions based on error code
 * @param {string} errorMessage - The error message to analyze
 */
function getQuickFixSuggestions(errorMessage) {
  const suggestions = [];

  if (errorMessage.includes('40004')) {
    suggestions.push('🔧 Error 40004: Project not found in Cost Management');
    suggestions.push('   → Enable Cost Management in ACC project settings');
    suggestions.push('   → Verify project type supports Cost Management');
    suggestions.push('   → Check if you have Cost Management permissions');
  }

  if (errorMessage.includes('403')) {
    suggestions.push('🔧 Error 403: Permission denied');
    suggestions.push('   → Check your OAuth scopes include cost:read');
    suggestions.push('   → Verify you have Cost Management access');
    suggestions.push('   → Contact project admin for permissions');
  }

  if (errorMessage.includes('404')) {
    suggestions.push('🔧 Error 404: Not found');
    suggestions.push('   → Verify project ID is correct');
    suggestions.push('   → Check if project has Cost Management enabled');
    suggestions.push('   → Ensure project exists and is accessible');
  }

  if (errorMessage.includes('401')) {
    suggestions.push('🔧 Error 401: Unauthorized');
    suggestions.push('   → Sign in to ACC again');
    suggestions.push('   → Refresh your access token');
    suggestions.push('   → Check if token has expired');
  }

  return suggestions;
}

/**
 * Test the specific project ID from your error
 */
async function testYourProject() {
  const projectId = 'e5eec484-7a66-44c8-a9af-cecb02df3ce5';
  console.log('🧪 Testing your specific project...');
  console.log('');

  const results = await diagnoseProject(projectId);
  
  console.log('\n🎯 Specific Error Analysis');
  console.log('=' .repeat(50));
  console.log('Your error: "Project not found" (Code 40004)');
  console.log('');
  
  const quickFixes = getQuickFixSuggestions('40004');
  console.log('🔧 Quick Fix Suggestions:');
  quickFixes.forEach(suggestion => {
    console.log(suggestion);
  });

  return results;
}

// Export functions
export {
  diagnoseProject,
  getQuickFixSuggestions,
  testYourProject
};

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.diagnoseProject = diagnoseProject;
  window.getQuickFixSuggestions = getQuickFixSuggestions;
  window.testYourProject = testYourProject;
}
