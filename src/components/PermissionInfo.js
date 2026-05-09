import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import AccService from '../services/AccService';

const PermissionInfo = ({ credentials, onPermissionCheck }) => {
  const [permissionLevel, setPermissionLevel] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (credentials && credentials.threeLegToken) {
      checkPermissions();
    }
  }, [credentials]);

  const checkPermissions = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      AccService.initialize(credentials);
      
      // Test hub access
      const hubs = await AccService.getHubs();
      
      if (hubs.length > 0) {
        // Test project access using the first hub
        const firstHub = hubs[0];
        console.log('🔍 Testing projects access for hub:', firstHub.id);
        const allProjects = await AccService.getProjects(firstHub.id);
        
        // Filter out Component Library projects
        const projects = allProjects.filter(project => 
          !project.name?.toLowerCase().includes('component library')
        );
        
        let newPermissionLevel;
        if (projects.length > 0) {
          newPermissionLevel = 'account_admin';
        } else {
          newPermissionLevel = 'project_admin';
        }
        setPermissionLevel(newPermissionLevel);
        
        if (onPermissionCheck) {
          onPermissionCheck(newPermissionLevel);
        }
      } else {
        setPermissionLevel('project_member');
        if (onPermissionCheck) {
          onPermissionCheck('project_member');
        }
      }
      
    } catch (err) {
      console.error('Permission check failed:', err);
      let errorPermissionLevel;
      if (err.message.includes('Access denied')) {
        errorPermissionLevel = 'no_access';
      } else if (err.message.includes('invalid_scope') || err.message.includes('invalid_grant') || err.message.includes('expired')) {
        setError('Authentication failed. Please sign in again.');
        errorPermissionLevel = 'auth_error';
      } else {
        setError(err.message);
        errorPermissionLevel = 'error';
      }
      
      setPermissionLevel(errorPermissionLevel);
      if (onPermissionCheck) {
        onPermissionCheck(errorPermissionLevel);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const getPermissionInfo = () => {
    switch (permissionLevel) {
      case 'account_admin':
        return {
          level: 'Account Admin',
          icon: Shield,
          color: 'green',
          description: 'Full access to all hubs and projects',
          features: [
            'View all hubs in the account',
            'Access all projects in any hub',
            'Manage phases for any project',
            'Generate reports for all projects'
          ]
        };
      case 'project_admin':
        return {
          level: 'Project Admin',
          icon: CheckCircle,
          color: 'blue',
          description: 'Access to projects you administer',
          features: [
            'View hubs with your projects',
            'Access projects you administer',
            'Manage phases for your projects',
            'Generate reports for your projects'
          ]
        };
      case 'project_member':
        return {
          level: 'Project Member',
          icon: AlertTriangle,
          color: 'yellow',
          description: 'Limited access to assigned projects',
          features: [
            'May see limited project information',
            'Cannot manage project phases',
            'Limited reporting capabilities',
            'Contact your Account Admin for full access'
          ]
        };
      case 'no_access':
        return {
          level: 'No Access',
          icon: AlertTriangle,
          color: 'red',
          description: 'Insufficient permissions',
          features: [
            'Cannot access hubs or projects',
            'Contact your Account Admin',
            'Verify your account permissions',
            'Check with your ACC administrator'
          ]
        };
      case 'auth_error':
        return {
          level: 'Authentication Error',
          icon: AlertTriangle,
          color: 'red',
          description: 'Authentication failed. Please sign in again.',
          features: [
            'Your session may have expired',
            'Please sign in again to continue',
            'Check your internet connection'
          ]
        };
      case 'error':
        return {
          level: 'Error',
          icon: AlertTriangle,
          color: 'red',
          description: 'An error occurred while checking permissions',
          features: [
            'Please try refreshing the page',
            'Contact support if the issue persists'
          ]
        };
      default:
        return null;
    }
  };

  if (isChecking) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-autodesk-blue mr-2"></div>
          <span className="text-sm text-gray-600">Checking permissions...</span>
        </div>
      </div>
    );
  }

  const permissionInfo = getPermissionInfo();
  if (!permissionInfo) return null;

  const IconComponent = permissionInfo.icon;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center mb-3">
        <IconComponent className={`h-5 w-5 mr-2 text-${permissionInfo.color}-500`} />
        <h3 className="text-lg font-medium text-gray-900">Permission Level</h3>
      </div>
      
      <div className={`p-3 rounded-md bg-${permissionInfo.color}-50 border border-${permissionInfo.color}-200`}>
        <div className="flex items-center mb-2">
          <IconComponent className={`h-4 w-4 mr-2 text-${permissionInfo.color}-500`} />
          <span className={`text-sm font-medium text-${permissionInfo.color}-900`}>
            {permissionInfo.level}
          </span>
        </div>
        <p className={`text-sm text-${permissionInfo.color}-700 mb-3`}>
          {permissionInfo.description}
        </p>
        
        <div className="space-y-1">
          {permissionInfo.features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <div className={`w-1.5 h-1.5 rounded-full bg-${permissionInfo.color}-500 mt-2 mr-2 flex-shrink-0`}></div>
              <span className={`text-xs text-${permissionInfo.color}-700`}>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {permissionLevel === 'project_member' && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <Info className="h-4 w-4 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <strong>Need more access?</strong> Contact your Account Admin to request Project Admin or Account Admin permissions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionInfo;

