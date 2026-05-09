// Deep Dive Budget API Debugging for AU Hub
// This script will help identify exactly why budgets aren't loading

const debugBudgetAPI = async () => {
  console.log('🔍 DEEP DIVE: Budget API Debugging for AU Hub');
  console.log('================================================');

  // Step 1: Check Authentication
  console.log('\n🔐 STEP 1: Authentication Check');
  const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
  console.log('✅ Credentials available:', !!credentials.threeLegToken);
  console.log('🔑 Token length:', credentials.threeLegToken?.length || 0);
  console.log('⏰ Token expiry:', credentials.tokenExpiry);
  
  if (!credentials.threeLegToken) {
    console.error('❌ No access token found!');
    return;
  }

  // Step 2: Check Selected Hub
  console.log('\n🏢 STEP 2: Hub Information');
  const selectedHub = JSON.parse(localStorage.getItem('selectedHub') || '{}');
  console.log('🏢 Hub ID:', selectedHub.id);
  console.log('🏢 Hub Name:', selectedHub.attributes?.name || selectedHub.name);
  console.log('🌍 Hub Region:', selectedHub.attributes?.region);
  console.log('🔗 Hub Type:', selectedHub.attributes?.extension?.type);

  if (!selectedHub.id) {
    console.error('❌ No hub selected!');
    return;
  }

  // Step 3: Check Selected Project
  console.log('\n📋 STEP 3: Project Information');
  const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');
  console.log('📋 Project ID:', selectedProject.id);
  console.log('📋 Project Name:', selectedProject.attributes?.name || selectedProject.name);
  console.log('📋 Project Type:', selectedProject.attributes?.extension?.type);

  if (!selectedProject.id) {
    console.error('❌ No project selected!');
    return;
  }

  // Step 4: Test Project Details API
  console.log('\n🔍 STEP 4: Project Details API Test');
  const projectUrl = `https://developer.api.autodesk.com/project/v1/hubs/${selectedHub.id}/projects/${selectedProject.id}`;
  console.log('🔗 Project URL:', projectUrl);

  try {
    const projectResponse = await fetch(projectUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.threeLegToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Project API Status:', projectResponse.status);
    console.log('📊 Project API Headers:', Object.fromEntries(projectResponse.headers.entries()));

    if (projectResponse.ok) {
      const projectData = await projectResponse.json();
      console.log('✅ Project data retrieved successfully');
      console.log('📋 Project relationships:', projectData.data?.relationships);
      console.log('💰 Cost relationship:', projectData.data?.relationships?.cost);
      
      const costContainerId = projectData.data?.relationships?.cost?.data?.id;
      if (costContainerId) {
        console.log('✅ Cost container ID found:', costContainerId);
      } else {
        console.log('⚠️ No cost container ID found - Cost Management may not be enabled');
      }
    } else {
      const errorText = await projectResponse.text();
      console.error('❌ Project API failed:', projectResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ Project API error:', error);
  }

  // Step 5: Test Budget API with different approaches
  console.log('\n💰 STEP 5: Budget API Tests');
  
  const budgetTests = [
    {
      name: 'Direct Project ID as Container',
      url: `https://developer.api.autodesk.com/cost/v1/containers/${selectedProject.id}/budgets`,
      region: selectedHub.attributes?.region || 'AUS'
    },
    {
      name: 'Project Budgets Endpoint',
      url: `https://developer.api.autodesk.com/cost/v1/projects/${selectedProject.id}/budgets`,
      region: selectedHub.attributes?.region || 'AUS'
    },
    {
      name: 'Construction Cost Endpoint',
      url: `https://developer.api.autodesk.com/construction/cost/v1/projects/${selectedProject.id}/budgets`,
      region: selectedHub.attributes?.region || 'AUS'
    }
  ];

  for (const test of budgetTests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log('🔗 URL:', test.url);
    console.log('🌍 Region:', test.region);

    try {
      const budgetResponse = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json',
          'region': test.region
        }
      });

      console.log('📊 Status:', budgetResponse.status);
      console.log('📊 Headers:', Object.fromEntries(budgetResponse.headers.entries()));

      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        console.log('✅ Budget API successful!');
        console.log('📊 Response data:', budgetData);
        console.log('💰 Budgets found:', (budgetData.results || budgetData.data || []).length);
        
        if ((budgetData.results || budgetData.data || []).length > 0) {
          console.log('🎉 SUCCESS: Found budget data!');
          return; // Found budgets, stop testing
        }
      } else {
        const errorText = await budgetResponse.text();
        console.log('❌ Budget API failed:', budgetResponse.status);
        console.log('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Budget API error:', error);
    }
  }

  // Step 6: Check Hub Region and API Routing
  console.log('\n🌍 STEP 6: Region and API Routing Check');
  console.log('🏢 Hub region from API:', selectedHub.attributes?.region);
  console.log('🌍 Expected API base:', selectedHub.attributes?.region === 'AUS' ? 'acc.aus.autodesk.com' : 'acc.autodesk.com');
  
  // Step 7: Check Cost Management Module Availability
  console.log('\n🔧 STEP 7: Cost Management Module Check');
  console.log('💡 Common issues:');
  console.log('   - Cost Management not enabled for the project');
  console.log('   - No budget data created in ACC Cost Management');
  console.log('   - Wrong region routing (AUS vs US)');
  console.log('   - Insufficient permissions');
  console.log('   - Project type doesn\'t support Cost Management');

  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('1. Check if Cost Management is enabled in ACC project settings');
  console.log('2. Verify budget data exists in ACC Cost Management module');
  console.log('3. Ensure correct region routing (AUS for Australia)');
  console.log('4. Check user permissions for Cost Management access');
  console.log('5. Try different project types that support Cost Management');
};

// Run the debug function
debugBudgetAPI();
