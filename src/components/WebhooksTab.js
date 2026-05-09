import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Eye, 
  EyeOff,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import AccService from '../services/AccService';

const WebhooksTab = ({ selectedProject, selectedHub }) => {
  const [webhooks, setWebhooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    callbackUrl: '',
    events: [],
    scope: {
      folder: selectedProject?.id || ''
    }
  });
  const [webhookLogs, setWebhookLogs] = useState([]);

  const availableEvents = [
    { id: 'issues.created', name: 'Issue Created', description: 'When a new issue is created' },
    { id: 'issues.updated', name: 'Issue Updated', description: 'When an issue is modified' },
    { id: 'issues.deleted', name: 'Issue Deleted', description: 'When an issue is deleted' },
    { id: 'rfis.created', name: 'RFI Created', description: 'When a new RFI is created' },
    { id: 'rfis.updated', name: 'RFI Updated', description: 'When an RFI is modified' },
    { id: 'rfis.deleted', name: 'RFI Deleted', description: 'When an RFI is deleted' },
    { id: 'reviews.created', name: 'Review Created', description: 'When a new review is created' },
    { id: 'reviews.updated', name: 'Review Updated', description: 'When a review is modified' },
    { id: 'reviews.deleted', name: 'Review Deleted', description: 'When a review is deleted' },
    { id: 'files.uploaded', name: 'File Uploaded', description: 'When a file is uploaded' },
    { id: 'files.deleted', name: 'File Deleted', description: 'When a file is deleted' },
    { id: 'models.translated', name: 'Model Translated', description: 'When a model translation completes' }
  ];

  useEffect(() => {
    if (selectedProject?.id) {
      loadWebhooks();
    }
  }, [selectedProject?.id]);

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading webhooks...');
      const response = await AccService.getWebhooks();
      setWebhooks(response.data || []);
      console.log(`✅ Loaded ${response.data?.length || 0} webhooks`);
    } catch (error) {
      console.error('❌ Error loading webhooks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      console.log('🔄 Creating webhook:', webhookForm);
      
      const webhookData = {
        hookAttribute: {
          scope: webhookForm.scope
        },
        callbackUrl: webhookForm.callbackUrl,
        scope: webhookForm.scope,
        events: webhookForm.events
      };

      const result = await AccService.createWebhook(webhookData);
      console.log('✅ Webhook created:', result);
      
      // Reset form and refresh list
      setWebhookForm({
        callbackUrl: '',
        events: [],
        scope: {
          folder: selectedProject?.id || ''
        }
      });
      setShowCreateForm(false);
      loadWebhooks();
      
      alert('Webhook created successfully!');
    } catch (error) {
      console.error('❌ Error creating webhook:', error);
      alert('Failed to create webhook. Check console for details.');
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      console.log('🔄 Deleting webhook:', webhookId);
      await AccService.deleteWebhook(webhookId);
      console.log('✅ Webhook deleted');
      loadWebhooks();
      alert('Webhook deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting webhook:', error);
      alert('Failed to delete webhook. Check console for details.');
    }
  };

  const handleEventToggle = (eventId) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(id => id !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhooks Management</h2>
          <p className="text-gray-600">Configure real-time notifications for project events</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadWebhooks}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Webhook
          </button>
        </div>
      </div>

      {/* Create Webhook Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Webhook</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Callback URL
              </label>
              <input
                type="url"
                value={webhookForm.callbackUrl}
                onChange={(e) => setWebhookForm({...webhookForm, callbackUrl: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://your-domain.com/webhook/callback"
              />
              <p className="text-xs text-gray-500 mt-1">
                The URL where webhook notifications will be sent
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events to Monitor
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      webhookForm.events.includes(event.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleEventToggle(event.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(event.id)}
                        onChange={() => handleEventToggle(event.id)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-sm text-gray-900">{event.name}</div>
                        <div className="text-xs text-gray-500">{event.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createWebhook}
                disabled={!webhookForm.callbackUrl || webhookForm.events.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Webhooks</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading webhooks...</span>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No webhooks configured for this project.</p>
              <p className="text-sm text-gray-500 mt-2">Create a webhook to receive real-time notifications.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          Webhook {webhook.id}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(webhook.status)}`}>
                          {getStatusIcon(webhook.status)}
                          <span className="ml-1">{webhook.status}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div className="flex items-center">
                          <Bell className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            <strong>Callback:</strong> {webhook.callbackUrl}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            <strong>Created:</strong> {formatDate(webhook.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {webhook.events && webhook.events.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">Events:</div>
                          <div className="flex flex-wrap gap-2">
                            {webhook.events.map((event, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {event}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {webhook.scope && (
                        <div className="text-sm text-gray-600">
                          <strong>Scope:</strong> {webhook.scope.folder || 'All projects'}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Webhook Testing Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhook Testing</h3>
          <p className="text-gray-600 mb-4">
            Test your webhook endpoints to ensure they're working correctly.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Test Webhook Payload</h4>
            <pre className="text-sm text-gray-600 bg-white p-3 rounded border overflow-x-auto">
{`{
  "event": "issues.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "issue-123",
    "title": "Test Issue",
    "status": "open",
    "projectId": "${selectedProject?.id || 'project-id'}",
    "createdBy": "user@example.com"
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhooksTab;
