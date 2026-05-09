import React, { useState, useEffect } from 'react';
import AccService from '../services/AccService_old';

const WebhookCallbackHandler = ({ onWebhookReceived }) => {
  const [isListening, setIsListening] = useState(false);
  const [receivedWebhooks, setReceivedWebhooks] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});

  useEffect(() => {
    // Set up webhook event listener
    const handleWebhookEvent = (event) => {
      console.log('🔔 Webhook event received:', event);
      
      const webhookData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: event.detail?.type || 'unknown',
        data: event.detail?.data || {},
        source: event.detail?.source || 'unknown'
      };

      setReceivedWebhooks(prev => [webhookData, ...prev.slice(0, 99)]); // Keep last 100
      
      // Process the webhook
      processWebhook(webhookData);
      
      // Notify parent component
      if (onWebhookReceived) {
        onWebhookReceived(webhookData);
      }
    };

    // Listen for custom webhook events
    window.addEventListener('webhookReceived', handleWebhookEvent);

    return () => {
      window.removeEventListener('webhookReceived', handleWebhookEvent);
    };
  }, [onWebhookReceived]);

  const processWebhook = async (webhookData) => {
    try {
      setProcessingStatus(prev => ({
        ...prev,
        [webhookData.id]: 'processing'
      }));

      console.log('🔄 Processing webhook:', webhookData);

      // Handle different webhook types
      switch (webhookData.type) {
        case 'dm.version.added':
          await handleFileUpload(webhookData);
          break;
        case 'dm.version.modified':
          await handleFileModification(webhookData);
          break;
        case 'budget.created-1.0':
          await handleBudgetCreated(webhookData);
          break;
        case 'budget.updated-1.0':
          await handleBudgetUpdated(webhookData);
          break;
        default:
          console.log('⚠️ Unknown webhook type:', webhookData.type);
      }

      setProcessingStatus(prev => ({
        ...prev,
        [webhookData.id]: 'completed'
      }));

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      setProcessingStatus(prev => ({
        ...prev,
        [webhookData.id]: 'error'
      }));
    }
  };

  const handleFileUpload = async (webhookData) => {
    console.log('📁 Handling file upload webhook:', webhookData);
    
    const { data } = webhookData;
    const fileInfo = {
      fileName: data.name || 'Unknown',
      fileSize: data.size || 0,
      fileType: data.ext || 'unknown',
      projectId: data.projectId || 'unknown',
      folderUrn: data.folderUrn || 'unknown',
      versionId: data.versionId || 'unknown'
    };

    console.log('📄 File info:', fileInfo);

    // Here you would integrate with SharePoint API
    // For now, we'll simulate the integration
    await simulateSharePointUpload(fileInfo);
  };

  const handleFileModification = async (webhookData) => {
    console.log('📝 Handling file modification webhook:', webhookData);
    
    const { data } = webhookData;
    const fileInfo = {
      fileName: data.name || 'Unknown',
      fileSize: data.size || 0,
      fileType: data.ext || 'unknown',
      projectId: data.projectId || 'unknown',
      versionId: data.versionId || 'unknown',
      action: 'modified'
    };

    console.log('📄 Modified file info:', fileInfo);

    // Here you would update the file in SharePoint
    await simulateSharePointUpdate(fileInfo);
  };

  const handleBudgetCreated = async (webhookData) => {
    console.log('💰 Handling budget created webhook:', webhookData);
    
    const { data } = webhookData;
    const budgetInfo = {
      budgetId: data.budgetId || 'unknown',
      projectId: data.projectId || 'unknown',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      action: 'created'
    };

    console.log('💰 Budget info:', budgetInfo);

    // Here you would create a budget item in SharePoint
    await simulateSharePointBudgetCreate(budgetInfo);
  };

  const handleBudgetUpdated = async (webhookData) => {
    console.log('💰 Handling budget updated webhook:', webhookData);
    
    const { data } = webhookData;
    const budgetInfo = {
      budgetId: data.budgetId || 'unknown',
      projectId: data.projectId || 'unknown',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      action: 'updated'
    };

    console.log('💰 Updated budget info:', budgetInfo);

    // Here you would update the budget item in SharePoint
    await simulateSharePointBudgetUpdate(budgetInfo);
  };

  const simulateSharePointUpload = async (fileInfo) => {
    console.log('🔄 Simulating SharePoint upload for:', fileInfo.fileName);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ File uploaded to SharePoint successfully');
    
    // Here you would make actual SharePoint API calls
    // Example:
    // await sharePointAPI.uploadFile(fileInfo);
  };

  const simulateSharePointUpdate = async (fileInfo) => {
    console.log('🔄 Simulating SharePoint update for:', fileInfo.fileName);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ File updated in SharePoint successfully');
    
    // Here you would make actual SharePoint API calls
    // Example:
    // await sharePointAPI.updateFile(fileInfo);
  };

  const simulateSharePointBudgetCreate = async (budgetInfo) => {
    console.log('🔄 Simulating SharePoint budget creation for:', budgetInfo.budgetId);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Budget created in SharePoint successfully');
    
    // Here you would make actual SharePoint API calls
    // Example:
    // await sharePointAPI.createBudgetItem(budgetInfo);
  };

  const simulateSharePointBudgetUpdate = async (budgetInfo) => {
    console.log('🔄 Simulating SharePoint budget update for:', budgetInfo.budgetId);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Budget updated in SharePoint successfully');
    
    // Here you would make actual SharePoint API calls
    // Example:
    // await sharePointAPI.updateBudgetItem(budgetInfo);
  };

  const startListening = () => {
    setIsListening(true);
    console.log('🎧 Started listening for webhook events');
  };

  const stopListening = () => {
    setIsListening(false);
    console.log('🔇 Stopped listening for webhook events');
  };

  const clearWebhooks = () => {
    setReceivedWebhooks([]);
    setProcessingStatus({});
  };

  const simulateWebhook = (type, data) => {
    const event = new CustomEvent('webhookReceived', {
      detail: {
        type,
        data,
        source: 'simulation'
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Webhook Callback Handler</h2>
      
      {/* Control Panel */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isListening ? 'Listening' : 'Stopped'}
            </span>
          </div>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <button
            onClick={clearWebhooks}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Logs
          </button>
        </div>

        {/* Simulation Controls */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Simulate Webhook Events</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => simulateWebhook('dm.version.added', {
                name: 'test-document.docx',
                size: 1024000,
                ext: 'docx',
                projectId: 'b.5fec8f39-7a15-48c4-973a-789cc5906a63',
                folderUrn: 'urn:adsk.wipprod:fs.folder:co.wT5lCWlXSKeo3razOfHJAw',
                versionId: 'v1'
              })}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              File Upload
            </button>
            <button
              onClick={() => simulateWebhook('dm.version.modified', {
                name: 'test-document.docx',
                size: 1025000,
                ext: 'docx',
                projectId: 'b.5fec8f39-7a15-48c4-973a-789cc5906a63',
                versionId: 'v2'
              })}
              className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
            >
              File Modified
            </button>
            <button
              onClick={() => simulateWebhook('budget.created-1.0', {
                budgetId: 'budget-123',
                projectId: 'b.5fec8f39-7a15-48c4-973a-789cc5906a63',
                amount: 100000,
                currency: 'USD'
              })}
              className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Budget Created
            </button>
            <button
              onClick={() => simulateWebhook('budget.updated-1.0', {
                budgetId: 'budget-123',
                projectId: 'b.5fec8f39-7a15-48c4-973a-789cc5906a63',
                amount: 110000,
                currency: 'USD'
              })}
              className="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
            >
              Budget Updated
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Logs */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Received Webhooks ({receivedWebhooks.length})</h3>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          {receivedWebhooks.length === 0 ? (
            <p className="text-gray-500">No webhooks received yet</p>
          ) : (
            receivedWebhooks.map((webhook) => (
              <div key={webhook.id} className="mb-2 border-b border-gray-700 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400">[{webhook.timestamp}]</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    processingStatus[webhook.id] === 'completed' ? 'bg-green-600' :
                    processingStatus[webhook.id] === 'error' ? 'bg-red-600' :
                    processingStatus[webhook.id] === 'processing' ? 'bg-yellow-600' :
                    'bg-gray-600'
                  }`}>
                    {processingStatus[webhook.id] || 'pending'}
                  </span>
                </div>
                <div className="text-green-400">
                  Type: {webhook.type} | Source: {webhook.source}
                </div>
                <div className="text-gray-400 text-xs">
                  {JSON.stringify(webhook.data, null, 2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Processing Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {receivedWebhooks.length}
          </div>
          <div className="text-sm text-blue-800">Total Received</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {Object.values(processingStatus).filter(status => status === 'completed').length}
          </div>
          <div className="text-sm text-green-800">Processed</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {Object.values(processingStatus).filter(status => status === 'error').length}
          </div>
          <div className="text-sm text-red-800">Errors</div>
        </div>
      </div>
    </div>
  );
};

export default WebhookCallbackHandler;
