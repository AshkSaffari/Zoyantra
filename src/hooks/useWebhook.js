/**
 * React Hook for Webhook Integration
 * Provides real-time webhook event handling for APS events
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import WebhookService from '../services/WebhookService';

const useWebhook = (projectId, credentials) => {
  const [webhookService] = useState(() => new WebhookService());
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const eventListeners = useRef(new Map());

  // Initialize webhook service
  useEffect(() => {
    if (credentials && projectId) {
      webhookService.initialize(credentials);
      webhookService.registerAllHandlers();
      setIsConnected(true);
      
      // Get initial statistics
      setStatistics(webhookService.getStatistics());
    }
  }, [credentials, projectId, webhookService]);

  // Listen for webhook refresh events
  useEffect(() => {
    const handleWebhookRefresh = (event) => {
      const { tab, eventType, payload, timestamp } = event.detail;
      
      setLastEvent({
        tab,
        eventType,
        payload,
        timestamp
      });
      
      // Add to event history
      setEventHistory(prev => [
        { tab, eventType, payload, timestamp },
        ...prev.slice(0, 99) // Keep last 100 events
      ]);
      
      console.log(`🔄 Webhook refresh received for ${tab}: ${eventType}`);
    };

    window.addEventListener('webhookRefresh', handleWebhookRefresh);
    
    return () => {
      window.removeEventListener('webhookRefresh', handleWebhookRefresh);
    };
  }, []);

  // Register event listener for specific tab
  const registerTabListener = useCallback((tabName, callback) => {
    const listener = (event) => {
      if (event.detail.tab === tabName) {
        callback(event.detail);
      }
    };
    
    eventListeners.current.set(`${tabName}_${callback.name || 'anonymous'}`, listener);
    window.addEventListener('webhookRefresh', listener);
    
    return () => {
      window.removeEventListener('webhookRefresh', listener);
      eventListeners.current.delete(`${tabName}_${callback.name || 'anonymous'}`);
    };
  }, []);

  // Create webhook subscription
  const createSubscription = useCallback(async (events = ['*']) => {
    try {
      const result = await webhookService.createSubscription(projectId, events);
      console.log('✅ Webhook subscription created:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to create webhook subscription:', error);
      throw error;
    }
  }, [webhookService, projectId]);

  // Delete webhook subscription
  const deleteSubscription = useCallback(async () => {
    try {
      await webhookService.deleteSubscription(projectId);
      console.log('✅ Webhook subscription deleted');
    } catch (error) {
      console.error('❌ Failed to delete webhook subscription:', error);
      throw error;
    }
  }, [webhookService, projectId]);

  // Process webhook payload (for testing or manual processing)
  const processPayload = useCallback(async (payload) => {
    try {
      await webhookService.processWebhookPayload(payload);
    } catch (error) {
      console.error('❌ Failed to process webhook payload:', error);
      throw error;
    }
  }, [webhookService]);

  // Get webhook statistics
  const getStatistics = useCallback(() => {
    return webhookService.getStatistics();
  }, [webhookService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all event listeners
      eventListeners.current.forEach((listener) => {
        window.removeEventListener('webhookRefresh', listener);
      });
      eventListeners.current.clear();
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    eventHistory,
    statistics,
    registerTabListener,
    createSubscription,
    deleteSubscription,
    processPayload,
    getStatistics
  };
};

export default useWebhook;
