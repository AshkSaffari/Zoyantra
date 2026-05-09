/**
 * Webhook Integration Component
 * Provides real-time webhook event handling for APS events
 * Integrates with expense, D365, and EVM tabs for live data updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, RefreshCw, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react';
import useWebhook from '../hooks/useWebhook';

const WebhookIntegration = ({ selectedProject, selectedHub, credentials, onTabRefresh }) => {
  const {
    isConnected,
    lastEvent,
    eventHistory,
    statistics,
    registerTabListener,
    createSubscription,
    deleteSubscription,
    processPayload,
    getStatistics
  } = useWebhook(selectedProject?.id, credentials);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('disconnected');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Register tab listeners for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Expense tab listener
    const unsubscribeExpense = registerTabListener('expense', (event) => {
      console.log('💰 Expense tab webhook event:', event);
      if (onTabRefresh) {
        onTabRefresh('expense', event);
      }
    });

    // EVM tab listener
    const unsubscribeEVM = registerTabListener('evm', (event) => {
      console.log('📊 EVM tab webhook event:', event);
      if (onTabRefresh) {
        onTabRefresh('evm', event);
      }
    });

    // D365 tab listener
    const unsubscribeD365 = registerTabListener('d365', (event) => {
      console.log('🏢 D365 tab webhook event:', event);
      if (onTabRefresh) {
        onTabRefresh('d365', event);
      }
    });

    // Docs tab listener
    const unsubscribeDocs = registerTabListener('docs', (event) => {
      console.log('📄 Docs tab webhook event:', event);
      if (onTabRefresh) {
        onTabRefresh('docs', event);
      }
    });

    // Issues tab listener
    const unsubscribeIssues = registerTabListener('issues', (event) => {
      console.log('🐛 Issues tab webhook event:', event);
      if (onTabRefresh) {
        onTabRefresh('issues', event);
      }
    });

    return () => {
      unsubscribeExpense();
      unsubscribeEVM();
      unsubscribeD365();
      unsubscribeDocs();
      unsubscribeIssues();
    };
  }, [isConnected, registerTabListener, onTabRefresh]);

  // Create webhook subscription
  const handleCreateSubscription = useCallback(async () => {
    try {
      setSubscriptionStatus('connecting');
      
      // Define events to listen for
      const events = [
        // Cost Management events
        'autodesk.construction.cost.budget.*',
        'autodesk.construction.cost.expense.*',
        'autodesk.construction.cost.expenseItem.*',
        'autodesk.construction.cost.contract.*',
        'autodesk.construction.cost.mainContract.*',
        'autodesk.construction.cost.cor.*',
        'autodesk.construction.cost.oco.*',
        'autodesk.construction.cost.sco.*',
        'autodesk.construction.cost.pco.*',
        'autodesk.construction.cost.scheduleOfValue.*',
        'autodesk.construction.cost.budgetPayment.*',
        'autodesk.construction.cost.costPayment.*',
        
        // Data Management events
        'dm.version.*',
        'dm.folder.*',
        'dm.operation.*',
        
        // ACC Issues events
        'autodesk.construction.issues.issue.*'
      ];

      await createSubscription(events);
      setIsSubscribed(true);
      setSubscriptionStatus('connected');
      
      console.log('✅ Webhook subscription created successfully');
    } catch (error) {
      console.error('❌ Failed to create webhook subscription:', error);
      setSubscriptionStatus('error');
    }
  }, [createSubscription]);

  // Delete webhook subscription
  const handleDeleteSubscription = useCallback(async () => {
    try {
      setSubscriptionStatus('disconnecting');
      await deleteSubscription();
      setIsSubscribed(false);
      setSubscriptionStatus('disconnected');
      
      console.log('✅ Webhook subscription deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete webhook subscription:', error);
      setSubscriptionStatus('error');
    }
  }, [deleteSubscription]);

  // Test webhook with sample payload
  const handleTestWebhook = useCallback(async () => {
    const samplePayload = {
      eventType: 'autodesk.construction.cost.expense.created-1.0',
      system: 'autodesk.construction.cost',
      data: {
        projectId: selectedProject?.id,
        expenseId: 'test-expense-123',
        amount: 1000.00,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    };

    try {
      await processPayload(samplePayload);
      console.log('✅ Test webhook processed successfully');
    } catch (error) {
      console.error('❌ Failed to process test webhook:', error);
    }
  }, [processPayload, selectedProject]);

  // Get status icon
  const getStatusIcon = () => {
    switch (subscriptionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'connecting':
      case 'disconnecting':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (subscriptionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnecting':
        return 'Disconnecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Webhook Integration</h3>
            <p className="text-sm text-gray-600">Real-time data synchronization</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${
            subscriptionStatus === 'connected' ? 'text-green-600' :
            subscriptionStatus === 'error' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Connection</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isConnected ? 'Active' : 'Inactive'}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Events</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {eventHistory.length}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Handlers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statistics?.totalHandlers || 0}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={handleCreateSubscription}
          disabled={isSubscribed || subscriptionStatus === 'connecting'}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isSubscribed ? 'Subscribed' : 'Subscribe to Events'}
        </button>
        
        <button
          onClick={handleDeleteSubscription}
          disabled={!isSubscribed || subscriptionStatus === 'disconnecting'}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Unsubscribe
        </button>
        
        <button
          onClick={handleTestWebhook}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Activity className="h-4 w-4 mr-2" />
          Test Webhook
        </button>
      </div>

      {/* Event History */}
      {eventHistory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Recent Events</h4>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {eventHistory.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.tab === 'expense' ? 'bg-green-500' :
                      event.tab === 'evm' ? 'bg-blue-500' :
                      event.tab === 'd365' ? 'bg-purple-500' :
                      event.tab === 'docs' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">
                      {event.tab.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {event.eventType}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Webhook Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{statistics.totalHandlers}</p>
              <p className="text-sm text-gray-600">Event Handlers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{statistics.totalSubscriptions}</p>
              <p className="text-sm text-gray-600">Subscriptions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{statistics.registeredEvents.length}</p>
              <p className="text-sm text-gray-600">Event Types</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{eventHistory.length}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </div>
          </div>
        </div>
      )}

      {/* Last Event Details */}
      {lastEvent && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 className="text-md font-medium text-blue-900 mb-2">Last Event</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Tab:</strong> {lastEvent.tab}</p>
            <p><strong>Event:</strong> {lastEvent.eventType}</p>
            <p><strong>Time:</strong> {new Date(lastEvent.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookIntegration;
