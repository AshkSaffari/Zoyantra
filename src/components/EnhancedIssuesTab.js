import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  FileText, 
  Eye, 
  Settings,
  RefreshCw,
  Plus,
  Filter,
  Download,
  Upload,
  Bell,
  Users,
  Tag,
  Calendar
} from 'lucide-react';
import AccService from '../services/AccService';

const EnhancedIssuesTab = ({ selectedProject, selectedHub }) => {
  const [activeView, setActiveView] = useState('issues');
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState([]);
  const [attributeMappings, setAttributeMappings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  const views = [
    { id: 'issues', name: 'Issues', icon: AlertTriangle, color: 'red' },
    { id: 'types', name: 'Types & Categories', icon: Tag, color: 'blue' },
    { id: 'attributes', name: 'Custom Fields', icon: Settings, color: 'green' },
    { id: 'webhooks', name: 'Webhooks', icon: Bell, color: 'purple' }
  ];

  useEffect(() => {
    if (selectedProject?.id) {
      loadAllData();
    }
  }, [selectedProject?.id]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading enhanced issues data...');
      
      // Load all data in parallel
      const [
        issuesData,
        typesData,
        attributesData,
        mappingsData,
        profileData,
        webhooksData
      ] = await Promise.allSettled([
        AccService.getProjectIssues(selectedProject.id, { limit: 50 }),
        AccService.getIssueTypes(selectedProject.id, { include: 'subtypes' }),
        AccService.getIssueAttributeDefinitions(selectedProject.id, { limit: 100 }),
        AccService.getIssueAttributeMappings(selectedProject.id, { limit: 100 }),
        AccService.getIssueUserProfile(selectedProject.id),
        AccService.getWebhooks()
      ]);

      // Process results
      if (issuesData.status === 'fulfilled') {
        setIssues(issuesData.value || []);
        console.log(`✅ Loaded ${issuesData.value?.length || 0} issues`);
      }

      if (typesData.status === 'fulfilled') {
        setIssueTypes(typesData.value?.data || []);
        console.log(`✅ Loaded ${typesData.value?.data?.length || 0} issue types`);
      }

      if (attributesData.status === 'fulfilled') {
        setAttributeDefinitions(attributesData.value?.data || []);
        console.log(`✅ Loaded ${attributesData.value?.data?.length || 0} attribute definitions`);
      }

      if (mappingsData.status === 'fulfilled') {
        setAttributeMappings(mappingsData.value?.data || []);
        console.log(`✅ Loaded ${mappingsData.value?.data?.length || 0} attribute mappings`);
      }

      if (profileData.status === 'fulfilled') {
        setUserProfile(profileData.value);
        console.log('✅ Loaded user profile');
      }

      if (webhooksData.status === 'fulfilled') {
        setWebhooks(webhooksData.value?.data || []);
        console.log(`✅ Loaded ${webhooksData.value?.data?.length || 0} webhooks`);
      }

    } catch (error) {
      console.error('❌ Error loading enhanced issues data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      const webhookData = {
        hookAttribute: {
          scope: {
            folder: selectedProject.id
          }
        },
        callbackUrl: `${window.location.origin}/api/webhook/callback`,
        scope: {
          folder: selectedProject.id
        },
        events: ['issues.created', 'issues.updated', 'issues.deleted']
      };

      const result = await AccService.createWebhook(webhookData);
      console.log('✅ Webhook created:', result);
      alert('Webhook created successfully!');
      loadAllData(); // Refresh webhooks list
    } catch (error) {
      console.error('❌ Error creating webhook:', error);
      alert('Failed to create webhook. Check console for details.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'text-red-600 bg-red-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'closed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderIssues = () => (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div key={issue.id} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-lg font-medium text-gray-900">{issue.title}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                  {issue.status}
                </span>
                {issue.priority && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    issue.priority === 'high' ? 'bg-red-100 text-red-800' :
                    issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {issue.priority}
                  </span>
                )}
              </div>
              
              <p className="text-gray-600 mb-3">{issue.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Created: {formatDate(issue.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Due: {formatDate(issue.dueDate)}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{issue.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="flex items-center">
                  <Tag className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{issue.issueSubtypeId || 'No type'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <button className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-1" />
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTypes = () => (
    <div className="space-y-4">
      {issueTypes.map((type) => (
        <div key={type.id} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-medium text-gray-900">{type.name}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              type.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {type.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {type.description && (
            <p className="text-gray-600 mb-3">{type.description}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Created: {formatDate(type.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Updated: {formatDate(type.updatedAt)}</span>
            </div>
            {type.subtypes && (
              <div className="flex items-center">
                <Tag className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-600">{type.subtypes.length} subtypes</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderAttributes = () => (
    <div className="space-y-4">
      {attributeDefinitions.map((attr) => (
        <div key={attr.id} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-medium text-gray-900">{attr.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              attr.dataType === 'text' ? 'bg-blue-100 text-blue-800' :
              attr.dataType === 'numeric' ? 'bg-green-100 text-green-800' :
              attr.dataType === 'list' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {attr.dataType}
            </span>
          </div>
          
          {attr.description && (
            <p className="text-gray-600 mb-3">{attr.description}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Created: {formatDate(attr.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Updated: {formatDate(attr.updatedAt)}</span>
            </div>
            <div className="flex items-center">
              <Settings className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Required: {attr.required ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Webhooks</h3>
        <button
          onClick={createWebhook}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Webhook
        </button>
      </div>
      
      {webhooks.map((webhook) => (
        <div key={webhook.id} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-medium text-gray-900">Webhook {webhook.id}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {webhook.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Bell className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Callback: {webhook.callbackUrl}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Created: {formatDate(webhook.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Issues Management</h2>
          <p className="text-gray-600">Advanced issue tracking with custom fields, types, and real-time notifications</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                isActive 
                  ? `bg-${view.color}-600 text-white` 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {view.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading enhanced issues data...</span>
            </div>
          ) : (
            <>
              {activeView === 'issues' && renderIssues()}
              {activeView === 'types' && renderTypes()}
              {activeView === 'attributes' && renderAttributes()}
              {activeView === 'webhooks' && renderWebhooks()}
            </>
          )}
        </div>
      </div>

      {/* User Profile Info */}
      {userProfile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">User Permissions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center">
              <Users className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-blue-800">Can Create: {userProfile.canCreate ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-blue-800">Can Read: {userProfile.canRead ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <Settings className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-blue-800">Can Update: {userProfile.canUpdate ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-blue-800">Can Delete: {userProfile.canDelete ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedIssuesTab;
