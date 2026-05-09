/**
 * APS Setup Verification Utility
 * Based on Autodesk Platform Services documentation and best practices
 * https://get-started.aps.autodesk.com/learn-more/
 */

class ApsSetupVerification {
  static async verifyApplicationSetup() {
    console.log('🔍 Verifying APS Application Setup...');
    
    const results = {
      authentication: false,
      apiAccess: false,
      projectAccess: false,
      permissions: false,
      recommendations: []
    };

    try {
      // 1. Check Authentication
      console.log('1️⃣ Checking Authentication...');
      const authResult = await this.verifyAuthentication();
      results.authentication = authResult.success;
      if (!authResult.success) {
        results.recommendations.push('❌ Authentication failed: ' + authResult.error);
      }

      // 2. Check API Access
      console.log('2️⃣ Checking API Access...');
      const apiResult = await this.verifyApiAccess();
      results.apiAccess = apiResult.success;
      if (!apiResult.success) {
        results.recommendations.push('❌ API Access failed: ' + apiResult.error);
      }

      // 3. Check Project Access
      console.log('3️⃣ Checking Project Access...');
      const projectResult = await this.verifyProjectAccess();
      results.projectAccess = projectResult.success;
      if (!projectResult.success) {
        results.recommendations.push('❌ Project Access failed: ' + projectResult.error);
      }

      // 4. Check Permissions
      console.log('4️⃣ Checking Permissions...');
      const permissionResult = await this.verifyPermissions();
      results.permissions = permissionResult.success;
      if (!permissionResult.success) {
        results.recommendations.push('❌ Permissions failed: ' + permissionResult.error);
      }

      // 5. Generate Setup Recommendations
      this.generateSetupRecommendations(results);

      return results;
    } catch (error) {
      console.error('❌ Setup verification failed:', error);
      results.recommendations.push('❌ Setup verification failed: ' + error.message);
      return results;
    }
  }

  static async verifyAuthentication() {
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      
      if (!credentials.threeLegToken) {
        return {
          success: false,
          error: 'No 3-legged token found. Please authenticate first.'
        };
      }

      // Test token validity
      const response = await fetch('https://developer.api.autodesk.com/userprofile/v1/users/@me', {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Authentication successful. User:', userData.userName);
        return { success: true, userData };
      } else {
        return {
          success: false,
          error: `Token validation failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Authentication test failed: ' + error.message
      };
    }
  }

  static async verifyApiAccess() {
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      
      // Test Data Management API access
      const response = await fetch('https://developer.api.autodesk.com/project/v1/hubs', {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const hubsData = await response.json();
        console.log('✅ API Access successful. Found hubs:', hubsData.data?.length || 0);
        return { success: true, hubsCount: hubsData.data?.length || 0 };
      } else if (response.status === 403) {
        return {
          success: false,
          error: 'Access denied. Your app may not be provisioned in ACC Account Admin > Custom Integrations.'
        };
      } else {
        return {
          success: false,
          error: `API access failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'API access test failed: ' + error.message
      };
    }
  }

  static async verifyProjectAccess() {
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      
      if (!selectedProject.id) {
        return {
          success: false,
          error: 'No project selected. Please select a project first.'
        };
      }

      // Test project access
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${selectedProject.id}`, {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log('✅ Project access successful. Project:', projectData.data?.attributes?.name);
        return { success: true, projectData };
      } else if (response.status === 404) {
        return {
          success: false,
          error: 'Project not found. Verify project ID and ensure your app has access to this project.'
        };
      } else {
        return {
          success: false,
          error: `Project access failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Project access test failed: ' + error.message
      };
    }
  }

  static async verifyPermissions() {
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      
      if (!selectedProject.id) {
        return {
          success: false,
          error: 'No project selected for permission testing.'
        };
      }

      // Test folder access (this requires specific permissions)
      const response = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${selectedProject.id}/folders`, {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const foldersData = await response.json();
        console.log('✅ Permissions verified. Can access project folders.');
        return { success: true, foldersCount: foldersData.data?.length || 0 };
      } else if (response.status === 403) {
        return {
          success: false,
          error: 'Insufficient permissions. Your app may need additional scopes or ACC provisioning.'
        };
      } else {
        return {
          success: false,
          error: `Permission test failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Permission test failed: ' + error.message
      };
    }
  }

  static generateSetupRecommendations(results) {
    console.log('📋 Generating Setup Recommendations...');

    // Authentication recommendations
    if (!results.authentication) {
      results.recommendations.push('🔧 Authentication Issues:');
      results.recommendations.push('   • Ensure your OAuth callback URL is correctly configured');
      results.recommendations.push('   • Check that your Client ID and Secret are correct');
      results.recommendations.push('   • Verify OAuth scopes include: data:read, data:write, account:read');
    }

    // API Access recommendations
    if (!results.apiAccess) {
      results.recommendations.push('🔧 API Access Issues:');
      results.recommendations.push('   • Add your Client ID to ACC Account Admin > Custom Integrations');
      results.recommendations.push('   • Ensure your app has the required APIs enabled in APS Developer Portal');
      results.recommendations.push('   • Check that Data Management API is enabled for your app');
    }

    // Project Access recommendations
    if (!results.projectAccess) {
      results.recommendations.push('🔧 Project Access Issues:');
      results.recommendations.push('   • Verify the project ID is correct');
      results.recommendations.push('   • Ensure your app is provisioned in the ACC account that owns the project');
      results.recommendations.push('   • Check that the user has access to the project');
    }

    // Permissions recommendations
    if (!results.permissions) {
      results.recommendations.push('🔧 Permission Issues:');
      results.recommendations.push('   • Ensure your app has data:read and data:write scopes');
      results.recommendations.push('   • Check ACC Account Admin permissions for your app');
      results.recommendations.push('   • Verify the user has appropriate project permissions');
    }

    // General recommendations
    results.recommendations.push('📚 Additional Resources:');
    results.recommendations.push('   • APS Developer Portal: https://developer.autodesk.com/');
    results.recommendations.push('   • APS Learning Resources: https://get-started.aps.autodesk.com/learn-more/');
    results.recommendations.push('   • APS GitHub Samples: https://github.com/autodesk-platform-services');
    results.recommendations.push('   • APS Blog: https://aps.autodesk.com/blog/');
  }

  static async runFullVerification() {
    console.log('🚀 Starting Full APS Setup Verification...');
    console.log('Based on: https://get-started.aps.autodesk.com/learn-more/');
    
    const results = await this.verifyApplicationSetup();
    
    console.log('\n📊 Verification Results:');
    console.log('✅ Authentication:', results.authentication ? 'PASS' : 'FAIL');
    console.log('✅ API Access:', results.apiAccess ? 'PASS' : 'FAIL');
    console.log('✅ Project Access:', results.projectAccess ? 'PASS' : 'FAIL');
    console.log('✅ Permissions:', results.permissions ? 'PASS' : 'FAIL');
    
    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach(rec => console.log(rec));
    }
    
    const allPassed = results.authentication && results.apiAccess && results.projectAccess && results.permissions;
    
    if (allPassed) {
      console.log('\n🎉 All checks passed! Your APS setup is working correctly.');
    } else {
      console.log('\n⚠️ Some checks failed. Please review the recommendations above.');
    }
    
    return results;
  }
}

export default ApsSetupVerification;
