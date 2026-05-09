import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, Trash2, Download, AlertTriangle, Shield, User, Lock, Unlock, Eye, EyeOff, Mail, UserPlus, CheckCircle, XCircle, Edit, Trash, Info, Building } from 'lucide-react';
import ResourceService from '../services/ResourceService';
import AccService from '../services/AccService';
import { safeParseFloat } from '../utils/numberUtils';

const AdminTab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], archivedTimesheets = [], archivedExpenses = [], credentials }) => {
  const [userRoles, setUserRoles] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);
  const [tabPermissions, setTabPermissions] = useState({
    'plan-workahead': { roles: ['Project Manager', 'Project Admin', 'Engineer'], enabled: true },
    'timesheet': { roles: ['Project Manager', 'Project Admin', 'Engineer', 'Supervisor', 'Team Member'], enabled: true },
    'site-progress': { roles: ['Project Manager', 'Project Admin', 'Engineer', 'Supervisor'], enabled: true },
    'earned-value': { roles: ['Project Manager', 'Project Admin'], enabled: true },
    'expense-tracking': { roles: ['Project Manager', 'Project Admin', 'Engineer'], enabled: true },
    'crew-management': { roles: ['Project Manager', 'Project Admin', 'Supervisor'], enabled: true },
    'calendar': { roles: ['Project Manager', 'Project Admin', 'Engineer', 'Supervisor', 'Team Member'], enabled: true },
    'resource-management': { roles: ['Project Manager', 'Project Admin'], enabled: true },
    'permissions': { roles: ['Project Manager', 'Project Admin'], enabled: true },
    'debug': { roles: ['Project Manager', 'Project Admin'], enabled: true }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [projectSettings, setProjectSettings] = useState({
    defaultCurrency: 'USD',
    timeZone: 'UTC',
    workingHours: { start: '08:00', end: '17:00' },
    reportingPeriod: 'weekly',
    autoArchiveTimesheets: false,
    autoArchiveDays: 7,
    requireApproval: true,
    allowOvertime: false,
    maxOvertimeHours: 2
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Team Member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('settings');

  const [resourceService] = useState(new ResourceService());

  const loadUserRoles = useCallback(async () => {
    if (!selectedProject || !selectedHub || !credentials) return;
    
    setIsLoading(true);
    
    // Use real members from props if available
    if (members && members.length > 0) {
      console.log('👥 Using real members from props:', members.length);
      setProjectUsers(members);
      setIsLoading(false);
      return;
    }
    setError(null);
    
    try {
      // Use the new advanced project users endpoint with comprehensive filtering
      const projectUsersResponse = await AccService.getProjectUsersAdvanced(selectedProject.id, {
        fields: ['name', 'email', 'firstName', 'lastName', 'autodeskId', 'accessLevels', 'companyName', 
                'phone', 'addressLine1', 'city', 'stateOrProvince', 'country', 'jobTitle', 'industry', 
                'aboutMe', 'imageUrl', 'addedOn', 'updatedAt', 'roles', 'products', 'status'],
        sort: ['name'],
        limit: 200,
        status: ['active', 'pending']
      });
      
      const projectUsers = projectUsersResponse.results || [];
      setProjectUsers(projectUsers);
      
      // Process user roles data with enhanced information
      const userRolesData = projectUsers.map(user => ({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userAutodeskId: user.autodeskId,
        userRole: user.accessLevels?.accountAdmin ? 'account_admin' : 
                 user.accessLevels?.projectAdmin ? 'project_admin' : 'account_user',
        userStatus: user.status || 'active',
        companyName: user.companyName,
        defaultRole: user.roles?.[0]?.name || 'Team Member',
        roles: user.roles || [],
        accessLevels: user.accessLevels,
        products: user.products || [],
        // Additional user details
        userPhone: user.phone?.number || '',
        userAddress: user.addressLine1 || '',
        userCity: user.city || '',
        userState: user.stateOrProvince || '',
        userCountry: user.country || '',
        userJobTitle: user.jobTitle || '',
        userIndustry: user.industry || '',
        userAbout: user.aboutMe || '',
        userImageUrl: user.imageUrl || '',
        userAddedOn: user.addedOn || '',
        userUpdatedAt: user.updatedAt || ''
      }));
      
      setUserRoles(userRolesData);
      
      console.log('✅ Loaded project users (advanced):', projectUsers.length);
      console.log('✅ Processed user roles:', userRolesData.length);
      console.log('📊 User roles breakdown:', {
        accountAdmins: userRolesData.filter(u => u.userRole === 'account_admin').length,
        projectAdmins: userRolesData.filter(u => u.userRole === 'project_admin').length,
        regularUsers: userRolesData.filter(u => u.userRole === 'account_user').length
      });
      
    } catch (error) {
      console.error('❌ Error loading user roles (advanced):', error);
      setError('Failed to load user roles. Please check your permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedHub, credentials]);

  const loadTabPermissions = useCallback(() => {
    try {
      const storedPermissions = localStorage.getItem(`z_${selectedProject.id}_tab_permissions`);
      if (storedPermissions) {
        setTabPermissions(JSON.parse(storedPermissions));
      }
    } catch (error) {
      console.error('❌ Error loading tab permissions:', error);
    }
  }, [selectedProject]);

  const loadSettings = useCallback(() => {
    try {
      const storedProjectSettings = localStorage.getItem(`z_${selectedProject.id}_project_settings`);
      if (storedProjectSettings) {
        setProjectSettings(JSON.parse(storedProjectSettings));
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }, [selectedProject]);



  const saveProjectSettings = () => {
    try {
      localStorage.setItem(`z_${selectedProject.id}_project_settings`, JSON.stringify(projectSettings));
      console.log('✅ Project settings saved');
    } catch (error) {
      console.error('❌ Error saving project settings:', error);
    }
  };

  const clearProjectData = () => {
    if (window.confirm('⚠️ This will permanently delete ALL project data. This action cannot be undone. Are you sure?')) {
      try {
        console.log('🧹 Clearing ALL project data for:', selectedProject.id);
        
        // Get all localStorage keys
        const allKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          allKeys.push(localStorage.key(i));
        }
        
        // Clear project-specific data with various key patterns
        const projectId = selectedProject.id;
        const keysToRemove = [
          // Project-specific keys with z_ prefix
          `z_${projectId}_timesheets`,
          `z_${projectId}_tasks`,
          `z_${projectId}_crews`,
          `z_${projectId}_budgets`,
          `z_${projectId}_project_settings`,
          `z_${projectId}_tab_permissions`,
          
          // Project-specific keys with other patterns
          `phases_${projectId}`,
          `gates_${projectId}`,
          `tasks_${projectId}`,
          `enhanced_tasks_${projectId}`,
          `budget_mappings_${projectId}`,
          `task_budget_links_${projectId}`,
          `gantt_data_${projectId}`,
          `gantt_enhanced_${projectId}`,
          `gantt_legacy_${projectId}`,
          `gantt_legacy_enhanced_${projectId}`,
          
          // Global keys that might contain project data
          'zoyantra_timesheets',
          'zoyantra_tasks',
          'zoyantra_crews',
          'zoyantra_budgets',
          'zoyantra_members',
          'zoyantra_projects',
          'zoyantra_archived_timesheets',
          'zoyantra_created_expenses',
          'zoyantra_expense_data',
          'zoyantra_project_phases',
          'zoyantra_project_tasks',
          'zoyantra_project_budgets',
          'zoyantra_project_members',
          'zoyantra_project_crews',
          'zoyantra_member_rates',
          'zoyantra_hubs_cache',
          'zoyantra_projects_cache',
          'zoyantra_members_cache',
          'zoyantra_budgets_cache',
          'cewa_timesheets_archived',
          'cewa_credentials',
          'selectedProject',
          'selectedHub',
          'tasks', // Legacy global key
          'enhanced_tasks', // Legacy global key
          
          // OAuth and processing keys
          'oauth_state',
          'oauth_in_progress',
          'processing_oauth_callback'
        ];
        
        // Remove specific keys
        keysToRemove.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed: ${key}`);
          }
        });
        
        // Remove any remaining keys that contain the project ID
        // Exclude global settings like reminder settings (not project-specific)
        const globalKeysToPreserve = ['zoyantra_auto_reminder_settings'];
        allKeys.forEach(key => {
          if (key && !globalKeysToPreserve.includes(key) && (key.includes(projectId) || key.includes('zoyantra') || key.includes('cewa'))) {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed project-related key: ${key}`);
          }
        });
        
        // Clear any keys that match common patterns
        // Exclude global reminder settings
        const patternsToRemove = [
          /^zoyantra_(?!auto_reminder_settings)/, // Match zoyantra_ but not auto_reminder_settings
          /^cewa_/,
          /timesheet/,
          /expense/,
          /project/,
          /member/,
          /budget/,
          /crew/,
          /task/,
          /phase/,
          /gate/,
          /gantt/
        ];
        
        allKeys.forEach(key => {
          if (key && patternsToRemove.some(pattern => pattern.test(key))) {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed pattern-matched key: ${key}`);
          }
        });
        
        console.log('✅ Project data cleared successfully');
        alert('✅ All project data has been cleared successfully!');
        
      } catch (error) {
        console.error('❌ Error clearing project data:', error);
        alert('❌ Error clearing project data. Check console for details.');
      }
    }
  };

  const exportProjectData = () => {
    try {
      const exportData = {
        project: selectedProject,
        timesheets: JSON.parse(localStorage.getItem('zoyantra_timesheets') || '[]')
          .filter(ts => ts.projectId === selectedProject.id),
        tasks: JSON.parse(localStorage.getItem('zoyantra_tasks') || '[]')
          .filter(task => task.selectedProjectId === selectedProject.id),
        crews: JSON.parse(localStorage.getItem('zoyantra_crews') || '[]')
          .filter(crew => crew.projectId === selectedProject.id),
        budgets: JSON.parse(localStorage.getItem('zoyantra_budgets') || '[]')
          .filter(budget => budget.projectId === selectedProject.id),
        settings: {
          projectSettings
        },
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zoyantra-${selectedProject.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📤 Project data exported');
    } catch (error) {
      console.error('❌ Error exporting project data:', error);
    }
  };

  // User invitation functions
  const sendInvitation = async () => {
    if (!inviteEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create invitation data
      const invitation = {
        email: inviteEmail,
        role: inviteRole,
        message: inviteMessage,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        invitedAt: new Date().toISOString(),
        status: 'pending',
        invitedBy: credentials.userEmail || 'Admin'
      };

      // Store invitation locally
      const existingInvitations = JSON.parse(localStorage.getItem('zoyantra_invitations') || '[]');
      existingInvitations.push(invitation);
      localStorage.setItem('zoyantra_invitations', JSON.stringify(existingInvitations));

      // Update invited users list
      setInvitedUsers([...invitedUsers, invitation]);

      // Reset form
      setInviteEmail('');
      setInviteRole('Team Member');
      setInviteMessage('');
      setShowInviteModal(false);

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvitedUsers = () => {
    try {
      const invitations = JSON.parse(localStorage.getItem('zoyantra_invitations') || '[]');
      const projectInvitations = invitations.filter(inv => inv.projectId === selectedProject.id);
      setInvitedUsers(projectInvitations);
    } catch (error) {
      console.error('Error loading invited users:', error);
    }
  };

  const removeInvitation = (invitationId) => {
    try {
      const invitations = JSON.parse(localStorage.getItem('zoyantra_invitations') || '[]');
      const updatedInvitations = invitations.filter(inv => inv.email !== invitationId);
      localStorage.setItem('zoyantra_invitations', JSON.stringify(updatedInvitations));
      setInvitedUsers(updatedInvitations.filter(inv => inv.projectId === selectedProject.id));
    } catch (error) {
      console.error('Error removing invitation:', error);
    }
  };

  // Load settings when project changes
  useEffect(() => {
    if (selectedProject) {
      loadSettings();
      loadInvitedUsers();
    }
  }, [selectedProject, loadSettings]);

  if (!selectedProject) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-yellow-800 font-medium">Project Selection Required</p>
              <p className="text-yellow-700 text-sm mt-1">
                Please select a project to access admin settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Admin & Configuration
          </h2>
          <p className="text-gray-600">Manage project settings, optimization rules, and data</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUserManagement(!showUserManagement)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <User className="w-4 h-4" />
            {showUserManagement ? 'Hide Users' : 'Manage Users'}
          </button>
          <button
            onClick={exportProjectData}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>



      {/* User Management Section */}
      {showUserManagement && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>

          {/* Current Project Users */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Current Project Users</h4>
            {projectUsers.length > 0 ? (
              <div className="space-y-2">
                {projectUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.accessLevels?.projectAdmin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.accessLevels?.projectAdmin ? 'Admin' : 'Member'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No users found for this project</p>
              </div>
            )}
          </div>

          {/* Invited Users */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Pending Invitations</h4>
            {invitedUsers.length > 0 ? (
              <div className="space-y-2">
                {invitedUsers.map((invitation) => (
                  <div key={invitation.email} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-yellow-600" />
                      <div>
                        <p className="font-medium text-gray-900">{invitation.email}</p>
                        <p className="text-sm text-gray-500">Role: {invitation.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                      <button
                        onClick={() => removeInvitation(invitation.email)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No pending invitations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Project Settings</h3>
          <button
            onClick={saveProjectSettings}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto-archive timesheets</label>
              <p className="text-xs text-gray-500">Automatically archive approved timesheets after specified days</p>
            </div>
            <input
              type="checkbox"
              checked={projectSettings.autoArchiveTimesheets}
              onChange={(e) => setProjectSettings(prev => ({ ...prev, autoArchiveTimesheets: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {projectSettings.autoArchiveTimesheets && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Archive after (days)</label>
              <input
                type="number"
                value={projectSettings.autoArchiveDays}
                onChange={(e) => setProjectSettings(prev => ({ ...prev, autoArchiveDays: safeParseFloat(e.target.value, 7) }))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="30"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Require approval for timesheets</label>
              <p className="text-xs text-gray-500">Timesheets must be approved before being considered final</p>
            </div>
            <input
              type="checkbox"
              checked={projectSettings.requireApproval}
              onChange={(e) => setProjectSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow overtime</label>
              <p className="text-xs text-gray-500">Permit logging hours beyond daily maximum</p>
            </div>
            <input
              type="checkbox"
              checked={projectSettings.allowOvertime}
              onChange={(e) => setProjectSettings(prev => ({ ...prev, allowOvertime: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {projectSettings.allowOvertime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max overtime hours per day</label>
              <input
                type="number"
                value={projectSettings.maxOvertimeHours}
                onChange={(e) => setProjectSettings(prev => ({ ...prev, maxOvertimeHours: safeParseFloat(e.target.value, 2) }))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0.5"
                max="8"
                step="0.5"
              />
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900">Clear Project Data</h4>
              <p className="text-sm text-red-700">Permanently delete all timesheets, tasks, crews, and budgets for this project</p>
            </div>
            <button
              onClick={clearProjectData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invite User to Project</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Team Member">Team Member</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Project Admin">Project Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message (Optional)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Welcome to the project! Please review the project guidelines..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvitation}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            {success}
          </div>
        </div>
      )}
      
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <div className="flex items-center">
            <XCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTab;
