import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Building, UserCheck, Mail, Phone, Briefcase, AlertCircle, CheckCircle, XCircle, Search, Filter, User, UserX, Clock, Shield, Eye, MapPin, Calendar, User as UserIcon, Globe, FolderOpen, Settings, Star, TrendingUp } from 'lucide-react';
import AccService from '../services/AccService_old';

const UserManagementTab = ({ selectedProject, selectedHub }) => {
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [availableProducts] = useState(AccService.getAvailableProducts());
  const [isLoading, setIsLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Account users state
  const [accountUsers, setAccountUsers] = useState([]);
  const [projectUsers, setProjectUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentView, setCurrentView] = useState('account'); // 'account' or 'project'
  
  // User details modal state
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  
  // User projects state
  const [userProjects, setUserProjects] = useState([]);
  const [loadingUserProjects, setLoadingUserProjects] = useState(false);
  const [showUserProjectsModal, setShowUserProjectsModal] = useState(false);
  const [selectedUserForProjects, setSelectedUserForProjects] = useState(null);

  // Form states
  const [userForm, setUserForm] = useState({
    email: '',
    companyId: '',
    roleIds: [],
    products: [],
    suppressAdministrativeEmails: false
  });

  const [bulkUsers, setBulkUsers] = useState([]);
  const [bulkText, setBulkText] = useState('');

  // Load companies and roles when project changes
  useEffect(() => {
    if (selectedProject?.id) {
      loadCompaniesAndRoles();
      loadAccountUsers();
      loadProjectUsers();
    }
  }, [selectedProject?.id, selectedHub?.id]);

  const loadCompaniesAndRoles = async () => {
    setIsLoading(true);
    try {
      const [companiesData, rolesData] = await Promise.all([
        AccService.getProjectCompanies(selectedProject.id),
        AccService.getProjectRoles(selectedProject.id)
      ]);
      
      setCompanies(companiesData);
      setRoles(rolesData);
      console.log('✅ Loaded companies and roles:', { companies: companiesData.length, roles: rolesData.length });
    } catch (error) {
      console.error('❌ Error loading companies and roles:', error);
      setErrorMessage('Failed to load companies and roles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccountUsers = async () => {
    if (!selectedHub?.id) return;
    
    try {
      console.log('👥 Loading account users...');
      const users = await AccService.getAccountUsers(selectedHub.id, {
        limit: 100,
        sort: 'name',
        field: 'id,email,name,first_name,last_name,status,role,company_name,last_sign_in,created_at'
      });
      
      setAccountUsers(users);
      console.log(`✅ Loaded ${users.length} account users`);
    } catch (error) {
      console.error('❌ Error loading account users:', error);
    }
  };

  const loadProjectUsers = async () => {
    if (!selectedProject?.id || !selectedHub?.id) return;
    
    try {
      console.log('👥 Loading project users...');
      const users = await AccService.getProjectUsersReliable(selectedProject.id, selectedHub.id);
      
      setProjectUsers(users);
      console.log(`✅ Loaded ${users.length} project users`);
    } catch (error) {
      console.error('❌ Error loading project users:', error);
    }
  };

  const loadUserDetails = async (userId) => {
    if (!selectedHub?.id) return;
    
    setLoadingUserDetails(true);
    try {
      console.log(`👤 Loading detailed information for user ${userId}`);
      const userDetails = await AccService.getAccountUserDetails(selectedHub.id, userId);
      
      if (userDetails) {
        setSelectedUserDetails(userDetails);
        setShowUserDetailsModal(true);
        console.log('✅ User details loaded successfully');
      } else {
        setErrorMessage('Failed to load user details');
      }
    } catch (error) {
      console.error('❌ Error loading user details:', error);
      setErrorMessage('Failed to load user details');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const loadUserProjects = async (userId, userName) => {
    if (!selectedHub?.id) return;
    
    setLoadingUserProjects(true);
    setSelectedUserForProjects({ id: userId, name: userName });
    setShowUserProjectsModal(true);
    
    try {
      console.log(`🏗️ Loading projects for user ${userId}`);
      const projects = await AccService.getUserProjectsDetailed(selectedHub.id, userId);
      
      setUserProjects(projects);
      console.log(`✅ Loaded ${projects.length} projects for user`);
    } catch (error) {
      console.error('❌ Error loading user projects:', error);
      setErrorMessage('Failed to load user projects');
    } finally {
      setLoadingUserProjects(false);
    }
  };

  const handleAddUser = async () => {
    if (!userForm.email || userForm.products.length === 0) {
      setErrorMessage('Email and at least one product are required');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const userData = {
        email: userForm.email,
        companyId: userForm.companyId || null,
        roleIds: userForm.roleIds,
        products: userForm.products,
        suppressAdministrativeEmails: userForm.suppressAdministrativeEmails
      };

      const result = await AccService.addUserToProject(selectedProject.id, userData);
      
      setSuccessMessage(`Successfully added user ${result.email} to project`);
      setShowAddUserModal(false);
      resetForm();
      
      console.log('✅ User added successfully:', result);
    } catch (error) {
      console.error('❌ Error adding user:', error);
      setErrorMessage(`Failed to add user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (bulkUsers.length === 0) {
      setErrorMessage('No users to import');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await AccService.bulkImportUsersToProject(selectedProject.id, bulkUsers);
      
      setSuccessMessage(`Successfully imported ${bulkUsers.length} users to project`);
      setShowBulkImportModal(false);
      setBulkUsers([]);
      setBulkText('');
      
      console.log('✅ Users imported successfully:', result);
    } catch (error) {
      console.error('❌ Error importing users:', error);
      setErrorMessage(`Failed to import users: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const parseBulkUsers = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const users = [];
    
    lines.forEach((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length >= 1 && parts[0].includes('@')) {
        users.push({
          email: parts[0],
          companyId: parts[1] || '',
          roleIds: parts[2] ? parts[2].split(';').filter(id => id.trim()) : [],
          products: availableProducts.map(p => ({ key: p.key, access: p.access })),
          suppressAdministrativeEmails: true
        });
      }
    });
    
    setBulkUsers(users);
  };

  const resetForm = () => {
    setUserForm({
      email: '',
      companyId: '',
      roleIds: [],
      products: [],
      suppressAdministrativeEmails: false
    });
  };

  const handleProductToggle = (productKey) => {
    setUserForm(prev => ({
      ...prev,
      products: prev.products.some(p => p.key === productKey)
        ? prev.products.filter(p => p.key !== productKey)
        : [...prev.products, { key: productKey, access: 'administrator' }]
    }));
  };

  const handleRoleToggle = (roleId) => {
    setUserForm(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]
    }));
  };

  // Filter users based on search and filters
  const getFilteredUsers = () => {
    const users = currentView === 'account' ? accountUsers : projectUsers;
    
    return users.filter(user => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
          (user.last_name && user.last_name.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }
      
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }
      
      return true;
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'not_invited': return <UserX className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'account_admin': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'project_admin': return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'account_user': return <User className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!selectedProject?.id || !selectedHub?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Please select a project to manage users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
        <p className="text-gray-600">Manage users and their access to the project</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          {errorMessage}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-4 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCurrentView('account')}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentView === 'account' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Account Users ({accountUsers.length})
          </button>
          <button
            onClick={() => setCurrentView('project')}
            className={`px-4 py-2 rounded-md transition-colors ${
              currentView === 'project' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Project Users ({projectUsers.length})
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="not_invited">Not Invited</option>
        </select>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="account_admin">Account Admin</option>
          <option value="project_admin">Project Admin</option>
          <option value="account_user">Account User</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
        
        <button
          onClick={() => setShowBulkImportModal(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Users className="w-4 h-4 mr-2" />
          Bulk Import
        </button>
      </div>

      {/* Project Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Project:</span>
            <p className="font-medium">{selectedProject.name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Hub:</span>
            <p className="font-medium">{selectedHub.name}</p>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentView === 'account' ? 'Account Users' : 'Project Users'} 
            ({getFilteredUsers().length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {getFilteredUsers().map((user) => (
            <div key={user.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => loadUserDetails(user.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {user.image_url ? (
                      <img 
                        src={user.image_url} 
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
                      </p>
                      {getStatusIcon(user.status)}
                      {getRoleIcon(user.role)}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-4 h-4 mr-1" />
                        {user.email}
                      </div>
                      
                      {user.company_name && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Building className="w-4 h-4 mr-1" />
                          {user.company_name}
                        </div>
                      )}
                      
                      {user.last_sign_in && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          Last sign in: {new Date(user.last_sign_in).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : user.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'account_admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : user.role === 'project_admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role?.replace('_', ' ')}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadUserProjects(user.id, user.name || user.email);
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    <FolderOpen className="w-3 h-3 mr-1" />
                    Projects
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {getFilteredUsers().length === 0 && (
          <div className="px-6 py-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add User to Project</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <select
                  value={userForm.companyId}
                  onChange={(e) => setUserForm(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Company (Optional)</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles
                </label>
                <div className="space-y-2">
                  {roles.map(role => (
                    <label key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={userForm.roleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="mr-2"
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Products *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableProducts.map(product => (
                    <label key={product.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={userForm.products.some(p => p.key === product.key)}
                        onChange={() => handleProductToggle(product.key)}
                        className="mr-2"
                      />
                      <span className="text-sm">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="suppressEmails"
                  checked={userForm.suppressAdministrativeEmails}
                  onChange={(e) => setUserForm(prev => ({ ...prev, suppressAdministrativeEmails: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="suppressEmails" className="text-sm text-gray-700">
                  Suppress administrative emails
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Bulk Import Users</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Data (CSV Format)
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Format: email,companyId,roleIds (semicolon-separated)
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => {
                    setBulkText(e.target.value);
                    parseBulkUsers(e.target.value);
                  }}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user1@example.com,company-id-1,role-id-1;role-id-2&#10;user2@example.com,company-id-2,role-id-3"
                />
              </div>

              {bulkUsers.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Preview ({bulkUsers.length} users)
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {bulkUsers.map((user, index) => (
                      <div key={index} className="p-2 border-b border-gray-100 text-sm">
                        <span className="font-medium">{user.email}</span>
                        {user.companyId && <span className="text-gray-600"> • Company: {user.companyId}</span>}
                        {user.roleIds.length > 0 && <span className="text-gray-600"> • Roles: {user.roleIds.length}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkImportModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={isLoading || bulkUsers.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Importing...' : `Import ${bulkUsers.length} Users`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUserDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {loadingUserDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading user details...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Header */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {selectedUserDetails.image_url ? (
                      <img 
                        src={selectedUserDetails.image_url} 
                        alt={selectedUserDetails.name}
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900">
                      {selectedUserDetails.name || `${selectedUserDetails.first_name || ''} ${selectedUserDetails.last_name || ''}`.trim() || 'Unknown User'}
                    </h4>
                    <p className="text-gray-600">{selectedUserDetails.email}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      {getStatusIcon(selectedUserDetails.status)}
                      {getRoleIcon(selectedUserDetails.role)}
                      <span className="text-sm text-gray-500">
                        {selectedUserDetails.company_name || selectedUserDetails.company}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-gray-900">Basic Information</h5>
                    
                    <div className="space-y-3">
                      {selectedUserDetails.first_name && (
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">First Name:</span>
                            <p className="font-medium">{selectedUserDetails.first_name}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserDetails.last_name && (
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Last Name:</span>
                            <p className="font-medium">{selectedUserDetails.last_name}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserDetails.nickname && (
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Nickname:</span>
                            <p className="font-medium">{selectedUserDetails.nickname}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserDetails.uid && (
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Autodesk ID:</span>
                            <p className="font-medium">{selectedUserDetails.uid}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-gray-900">Contact Information</h5>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-600">Email:</span>
                          <p className="font-medium">{selectedUserDetails.email}</p>
                        </div>
                      </div>
                      
                      {selectedUserDetails.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Phone:</span>
                            <p className="font-medium">{selectedUserDetails.phone}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserDetails.job_title && (
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Job Title:</span>
                            <p className="font-medium">{selectedUserDetails.job_title}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserDetails.industry && (
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Industry:</span>
                            <p className="font-medium">{selectedUserDetails.industry}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Information */}
                  {(selectedUserDetails.address_line_1 || selectedUserDetails.city || selectedUserDetails.country) && (
                    <div className="space-y-4">
                      <h5 className="text-lg font-semibold text-gray-900">Address</h5>
                      
                      <div className="space-y-3">
                        {selectedUserDetails.address_line_1 && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <span className="text-sm text-gray-600">Address:</span>
                              <p className="font-medium">{selectedUserDetails.address_line_1}</p>
                              {selectedUserDetails.address_line_2 && (
                                <p className="font-medium">{selectedUserDetails.address_line_2}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {(selectedUserDetails.city || selectedUserDetails.state_or_province || selectedUserDetails.postal_code) && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <span className="text-sm text-gray-600">Location:</span>
                              <p className="font-medium">
                                {[selectedUserDetails.city, selectedUserDetails.state_or_province, selectedUserDetails.postal_code]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedUserDetails.country && (
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <span className="text-sm text-gray-600">Country:</span>
                              <p className="font-medium">{selectedUserDetails.country}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Account Information */}
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-gray-900">Account Information</h5>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-600">Role:</span>
                          <p className="font-medium">{selectedUserDetails.role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {getStatusIcon(selectedUserDetails.status)}
                        <div className="ml-3">
                          <span className="text-sm text-gray-600">Status:</span>
                          <p className="font-medium">{selectedUserDetails.status}</p>
                        </div>
                      </div>
                      
                      {selectedUserDetails.last_sign_in && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Last Sign In:</span>
                            <p className="font-medium">{new Date(selectedUserDetails.last_sign_in).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedUserDetails.created_at && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <span className="text-sm text-gray-600">Created:</span>
                            <p className="font-medium">{new Date(selectedUserDetails.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* About Me */}
                {selectedUserDetails.about_me && (
                  <div className="space-y-4">
                    <h5 className="text-lg font-semibold text-gray-900">About</h5>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedUserDetails.about_me}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Projects Modal */}
      {showUserProjectsModal && selectedUserForProjects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Projects for {selectedUserForProjects.name}
              </h3>
              <button
                onClick={() => setShowUserProjectsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {loadingUserProjects ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading user projects...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userProjects.map((project) => (
                    <div key={project.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                            {project.name}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {project.jobNumber && `Job #${project.jobNumber}`}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {project.accessLevels?.projectAdmin && (
                            <Shield className="w-4 h-4 text-purple-500" title="Project Admin" />
                          )}
                          {project.accessLevels?.projectMember && (
                            <User className="w-4 h-4 text-blue-500" title="Project Member" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            project.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : project.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Type:</span>
                          <span className="text-gray-900">{project.type || 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Platform:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            project.platform === 'acc' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {project.platform?.toUpperCase() || 'N/A'}
                          </span>
                        </div>
                        
                        {project.classification && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Classification:</span>
                            <span className="text-gray-900">{project.classification}</span>
                          </div>
                        )}
                        
                        {project.constructionType && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Construction:</span>
                            <span className="text-gray-900">{project.constructionType}</span>
                          </div>
                        )}
                        
                        {project.deliveryMethod && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Delivery:</span>
                            <span className="text-gray-900">{project.deliveryMethod}</span>
                          </div>
                        )}
                        
                        {project.currentPhase && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Phase:</span>
                            <span className="text-gray-900">{project.currentPhase}</span>
                          </div>
                        )}
                        
                        {project.startDate && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Start:</span>
                            <span className="text-gray-900">{new Date(project.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {project.endDate && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">End:</span>
                            <span className="text-gray-900">{new Date(project.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {project.projectValue && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Value:</span>
                            <span className="text-gray-900">
                              {project.projectValue.currency} {project.projectValue.value?.toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {project.addressLine1 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Location:</span>
                            <span className="text-gray-900 truncate ml-2">
                              {[project.addressLine1, project.city, project.stateOrProvince]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Updated:</span>
                          <span className="text-gray-900">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {userProjects.length === 0 && (
                  <div className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No projects found for this user</p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowUserProjectsModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
