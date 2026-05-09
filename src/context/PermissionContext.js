import React, { createContext, useContext, useState, useEffect } from 'react';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // Load permissions from localStorage
  useEffect(() => {
    const savedPermissions = localStorage.getItem('zoyantra_permissions');
    if (savedPermissions) {
      try {
        setPermissions(JSON.parse(savedPermissions));
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    }
  }, []);

  // Get current user email
  const getCurrentUserEmail = () => {
    // Try to get from localStorage first
    const storedUser = localStorage.getItem('zoyantra_user_email');
    if (storedUser) {
      return storedUser;
    }
    
    // Try to get from Autodesk user info
    const autodeskUser = localStorage.getItem('zoyantra_autodesk_user');
    if (autodeskUser) {
      try {
        const user = JSON.parse(autodeskUser);
        return user.email || user.emailAddress;
      } catch (e) {
        console.error('Error parsing Autodesk user:', e);
      }
    }
    
    return null;
  };

  // Check if user has access to a specific tab
  const hasTabAccess = (projectId, tabId) => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail || !projectId) return true; // Default to true if no user or project
    
    const projectPermissions = permissions[projectId] || {};
    const userPermission = projectPermissions[userEmail];
    
    if (!userPermission) return true; // Default to true if no specific permissions
    
    return userPermission.tabs.includes(tabId);
  };

  // Get user's accessible tabs for a project
  const getUserTabs = (projectId) => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail || !projectId) return []; // Return empty if no user or project
    
    const projectPermissions = permissions[projectId] || {};
    const userPermission = projectPermissions[userEmail];
    
    return userPermission ? userPermission.tabs : [];
  };

  // Save permissions
  const savePermissions = (projectId, userEmail, tabs, role) => {
    const newPermissions = {
      ...permissions,
      [projectId]: {
        ...permissions[projectId],
        [userEmail]: {
          tabs,
          role,
          updatedAt: new Date().toISOString()
        }
      }
    };
    
    setPermissions(newPermissions);
    localStorage.setItem('zoyantra_permissions', JSON.stringify(newPermissions));
  };

  // Remove user permissions
  const removeUserPermissions = (projectId, userEmail) => {
    const newPermissions = { ...permissions };
    if (newPermissions[projectId]) {
      delete newPermissions[projectId][userEmail];
      if (Object.keys(newPermissions[projectId]).length === 0) {
        delete newPermissions[projectId];
      }
    }
    
    setPermissions(newPermissions);
    localStorage.setItem('zoyantra_permissions', JSON.stringify(newPermissions));
  };

  // Get all permissions for a project
  const getProjectPermissions = (projectId) => {
    return permissions[projectId] || {};
  };

  // Check if user is admin for a project
  const isUserAdmin = (projectId) => {
    const userEmail = getCurrentUserEmail();
    if (!userEmail || !projectId) return false;
    
    const projectPermissions = permissions[projectId] || {};
    const userPermission = projectPermissions[userEmail];
    
    return userPermission?.role === 'Admin';
  };

  const value = {
    permissions,
    currentUser,
    hasTabAccess,
    getUserTabs,
    savePermissions,
    removeUserPermissions,
    getProjectPermissions,
    isUserAdmin,
    getCurrentUserEmail
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;

