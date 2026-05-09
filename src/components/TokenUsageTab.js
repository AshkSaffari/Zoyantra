import React, { useState, useEffect, useCallback } from 'react';
import { 
  Coins, RefreshCw, Download, Search, Calendar, TrendingUp, Users, 
  Server, Package, Filter, AlertCircle, CheckCircle, XCircle, Loader,
  BarChart3, PieChart, FileText, Mail, Clock, Activity, Download as DownloadIcon
} from 'lucide-react';
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import AccService from '../services/AccService';

const TokenUsageTab = ({ credentials }) => {
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [manualContractNumber, setManualContractNumber] = useState('');
  const [contractDetails, setContractDetails] = useState(null);
  const [enrichmentCategories, setEnrichmentCategories] = useState([]);
  const [selectedEnrichmentCategory, setSelectedEnrichmentCategory] = useState(null);
  const [enrichmentValues, setEnrichmentValues] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loadingField, setLoadingField] = useState(null);
  const [usageSummary, setUsageSummary] = useState([]);
  const [lastUpdatedDetails, setLastUpdatedDetails] = useState([]);
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [queryId, setQueryId] = useState(null);
  const [queryStatus, setQueryStatus] = useState(null);
  
  // Advanced query state
  const [advancedQuery, setAdvancedQuery] = useState({
    fields: 'usageCategory, productName',
    metrics: 'tokensConsumed',
    usageCategory: '',
    where: 'contractYear >= 1'
  });
  
  // New search and filter states
  const [searchMode, setSearchMode] = useState('byUser'); // 'byUser', 'byProduct', 'byDateRange'
  const [userSearch, setUserSearch] = useState({ email: '', userName: '' });
  const [productSearch, setProductSearch] = useState({ productName: '', category: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [userResults, setUserResults] = useState(null);
  const [activeView, setActiveView] = useState('search'); // 'search', 'dashboard'
  
  // Export state
  const [exportKey, setExportKey] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportFileName, setExportFileName] = useState('');
  const [exportUrl, setExportUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [exportSchedules, setExportSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  const accService = new AccService();

  useEffect(() => {
    if (credentials) {
      accService.initialize(credentials);
    }
  }, [credentials]);

  // Load contracts list
  const loadContracts = useCallback(async () => {
    if (!credentials?.threeLegToken) {
      setError('No authentication token available');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://developer.api.autodesk.com/tokenflex/v1/contract', {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setContracts(data);
      
      if (data.length > 0 && !selectedContract) {
        setSelectedContract(data[0]);
        await loadContractDetails(data[0].contractNumber);
        setSuccess(`Loaded ${data.length} contract(s)`);
      } else if (data.length === 0) {
        setError('No Token Flex contracts found. Please verify your account has Token Flex administrator privileges.');
        setSuccess(null);
      } else {
        setSuccess(`Loaded ${data.length} contract(s)`);
      }
    } catch (err) {
      console.error('Error loading contracts:', err);
      
      if (err.message.includes('401')) {
        setError('Authentication failed. Please log in again.');
      } else if (err.message.includes('403')) {
        setError('Access denied. You need to be a Token Flex administrator.');
      } else if (err.message.includes('404')) {
        setError('No Token Flex contracts found. Your account may not have Token Flex enabled.');
      } else {
        setError(`Failed to load contracts: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [credentials, selectedContract]);

  // Load contract details
  const loadContractDetails = async (contractNumber) => {
    if (!credentials?.threeLegToken) return;
    
    setIsLoading(true);
    
    try {
      // Load contract details
      const response = await fetch(`https://developer.api.autodesk.com/tokenflex/v1/contract/${contractNumber}`, {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setContractDetails(data);

      // Load enrichment categories
      try {
        const enrichmentResponse = await fetch(`https://developer.api.autodesk.com/tokenflex/v1/contract/${contractNumber}/enrichment`, {
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (enrichmentResponse.ok) {
          const enrichmentData = await enrichmentResponse.json();
          // Filter out empty strings
          const validCategories = enrichmentData.filter(cat => cat && cat.trim());
          setEnrichmentCategories(validCategories);
        }
      } catch (enrichmentErr) {
        console.log('No enrichment categories available');
        setEnrichmentCategories([]);
      }
    } catch (err) {
      console.error('Error loading contract details:', err);
      setError(`Failed to load contract details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load enrichment values for a specific category
  const loadEnrichmentValues = async (category) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/contract/${selectedContract.contractNumber}/enrichment/${encodeURIComponent(category)}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEnrichmentValues(data);
        setSelectedEnrichmentCategory(category);
      }
    } catch (err) {
      console.log('Error loading enrichment values:', err);
      setEnrichmentValues([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load field values (products, users, etc.)
  const loadFieldValues = async (field) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;
    if (fieldValues[field]) return; // Already loaded

    setLoadingField(field);
    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/contract/${selectedContract.contractNumber}/${field}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFieldValues(prev => ({ ...prev, [field]: data }));
      }
    } catch (err) {
      console.log(`Error loading ${field}:`, err);
    } finally {
      setLoadingField(null);
    }
  };

  // Load last updated details
  const loadLastUpdatedDetails = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;
    
    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/usage/${selectedContract.contractNumber}/last`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLastUpdatedDetails(data);
      }
    } catch (err) {
      console.log('Error loading last updated details:', err);
    }
  };

  // Load usage summary
  const loadUsageSummary = async (filters = {}) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.minUsageMonth) params.append('minUsageMonth', filters.minUsageMonth);
      if (filters.maxUsageMonth) params.append('maxUsageMonth', filters.maxUsageMonth);
      if (filters.contractYear) params.append('contractYear', filters.contractYear);
      if (filters.usageCategory) params.append('usageCategory', filters.usageCategory);
      
      const queryString = params.toString();
      const url = `https://developer.api.autodesk.com/tokenflex/v1/usage/${selectedContract.contractNumber}/summary${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUsageSummary(data);
      
      const totalTokens = data.reduce((sum, item) => sum + (item.tokensConsumed || 0), 0);
      setSuccess(`Loaded ${data.length} usage records. Total tokens: ${totalTokens.toLocaleString()}`);
    } catch (err) {
      console.error('Error loading usage summary:', err);
      setError(`Failed to load usage summary: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Search users by email or name
  const searchUsers = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) {
      setError('Please select a contract');
      return;
    }

    if (!userSearch.email && !userSearch.userName) {
      setError('Please enter an email or username');
      return;
    }

    setIsLoadingQuery(true);
    setError(null);
    
    try {
      const searchTerm = userSearch.email || userSearch.userName;
      const requestBody = {
        fields: ['userName', 'productName', 'usageCategory', 'usageDate', 'usageMonth', 'tokensConsumed'],
        metrics: ['tokensConsumed', 'usageMinutes', 'useCount'],
        where: `userName LIKE '%${searchTerm}%'`
      };

      if (dateRange.start && dateRange.end) {
        requestBody.where += ` AND usageDate >= '${dateRange.start}' AND usageDate <= '${dateRange.end}'`;
      }

      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/usage/${selectedContract.contractNumber}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.id) {
        await pollAndSetResults(data.id);
      } else if (data.result) {
        setUserResults(data.result);
        setSuccess(`Found ${data.result.rows?.length || 0} record(s)`);
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError(`Failed to search users: ${err.message}`);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Submit advanced query
  const submitAdvancedQuery = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) {
      setError('Please select a contract');
      return;
    }

    setIsLoadingQuery(true);
    setError(null);
    setQueryResults(null);
    
    try {
      const requestBody = {
        fields: advancedQuery.fields.split(',').map(f => f.trim()),
        metrics: advancedQuery.metrics.split(',').map(m => m.trim())
      };

      if (advancedQuery.usageCategory) {
        requestBody.usageCategory = advancedQuery.usageCategory.split(',').map(c => c.trim());
      }

      if (advancedQuery.where) {
        requestBody.where = advancedQuery.where;
      }

      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/usage/${selectedContract.contractNumber}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.id) {
        setQueryId(data.id);
        setQueryStatus(data.status);
        setSuccess('Query submitted successfully');
        await pollAndSetResults(data.id);
      } else if (data.result) {
        setQueryResults(data.result);
        setSuccess('Query completed successfully');
      }
    } catch (err) {
      console.error('Error submitting query:', err);
      setError(`Failed to submit query: ${err.message}`);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Search by product
  const searchByProduct = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;
    
    setIsLoadingQuery(true);
    setError(null);
    
    try {
      const requestBody = {
        fields: ['productName', 'usageCategory', 'usageDate', 'usageMonth', 'userName'],
        metrics: ['tokensConsumed', 'uniqueUsers', 'usageMinutes'],
        where: `productName LIKE '%${productSearch.productName}%'`
      };

      if (productSearch.category) {
        requestBody.where += ` AND usageCategory = '${productSearch.category}'`;
      }

      if (dateRange.start && dateRange.end) {
        requestBody.where += ` AND usageDate >= '${dateRange.start}' AND usageDate <= '${dateRange.end}'`;
      }

      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/usage/${selectedContract.contractNumber}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.id) {
        await pollAndSetResults(data.id);
      } else if (data.result) {
        setUserResults(data.result);
      }
    } catch (err) {
      console.error('Error searching by product:', err);
      setError(`Failed to search: ${err.message}`);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Poll and get results
  const pollAndSetResults = async (queryIdToPoll, offset = 0, limit = 100) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `https://developer.api.autodesk.com/tokenflex/v1/usage/${selectedContract.contractNumber}/query/${queryIdToPoll}?offset=${offset}&limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.status === 'DONE') {
          clearInterval(pollInterval);
          setUserResults(data.result);
          setQueryStatus(data.status);
          
          const tokenCount = data.result?.rows?.reduce((sum, row) => {
            const tokensIndex = data.result.columns.indexOf('tokensConsumed');
            return sum + (row[tokensIndex] || 0);
          }, 0) || 0;
          
          setSuccess(`Query completed. Total tokens: ${tokenCount.toLocaleString()} (${data.result?.total || 0} records total)`);
          setIsLoadingQuery(false);
        } else if (['FAILED', 'TIMEOUT', 'EXPIRED'].includes(data.status)) {
          clearInterval(pollInterval);
          setError(`Query ${data.status.toLowerCase()}`);
          setIsLoadingQuery(false);
        } else {
          // Query is still processing
          setQueryStatus(data.status);
        }
      } catch (err) {
        console.error('Error polling:', err);
        clearInterval(pollInterval);
        setError(`Failed: ${err.message}`);
        setIsLoadingQuery(false);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (!userResults) {
        setError('Query timeout');
        setIsLoadingQuery(false);
      }
    }, 60000);
  };

  // Export to CSV using Token Flex Export API with comprehensive fields
  const requestExport = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) {
      setError('Please select a contract');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const requestBody = {
        fields: [
          'usageDate', 
          'usageMonth', 
          'contractYear', 
          'userName', 
          'productName', 
          'usageCategory',
          'productLineCode',
          'productVersion',
          'machineName',
          'licenseServerName',
          'usageType',
          'chargeCategory',
          'chargedItemID',
          'customField1',
          'customField2',
          'customField3',
          'customField4',
          'customField5',
          'tokensConsumed',
          'usageMinutes'
        ],
        metrics: ['tokensConsumed', 'usageMinutes'],
        where: '1=1', // Get all data
        downloadFileName: `TokenUsage_Contract_${selectedContract.contractNumber}_${new Date().toISOString().split('T')[0]}`
      };

      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.Message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setExportKey(data.requestKey);
      setExportStatus(data.requestStatus);
      setExportFileName(data.downloadFileName);
      
      // Start polling for export completion
      pollExportStatus(data.requestKey);
      
      setSuccess('Export request submitted');
    } catch (err) {
      console.error('Error requesting export:', err);
      setError(`Failed to request export: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Load export history with polling for active exports
  const loadExportHistory = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests?fromDate=${oneMonthAgo}&toDate=${now}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExportHistory(data);
        
        // Poll for any "Requested" exports to check if they're ready
        data.forEach(exportItem => {
          if (exportItem.requestStatus === 'Requested') {
            pollExportDetails(exportItem.requestKey);
          }
        });
      }
    } catch (err) {
      console.log('Error loading export history:', err);
    }
  };

  // Poll individual export details
  const pollExportDetails = async (requestKey) => {
    const pollInterval = setInterval(async () => {
      try {
        const encodedKey = encodeURIComponent(requestKey);
        const response = await fetch(
          `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests/${encodedKey}`,
          {
            headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Update export history with new status
          setExportHistory(prev => prev.map(exp => 
            exp.requestKey === requestKey ? data : exp
          ));

          // Stop polling if export is complete or failed
          if (['Download', 'Error'].includes(data.requestStatus)) {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.log('Error polling export:', err);
        clearInterval(pollInterval);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  // Mark exports as read
  const markExportsAsRead = async (requestKeys) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests/markRead`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestKeys)
        }
      );

      if (response.ok) {
        setSuccess(`${requestKeys.length} export(s) marked as read`);
        // Refresh export history to show updated read flags
        await loadExportHistory();
      }
    } catch (err) {
      console.log('Error marking exports as read:', err);
    }
  };

  // Load export schedules
  const loadExportSchedules = async () => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/schedules`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExportSchedules(data);
      }
    } catch (err) {
      console.log('Error loading schedules:', err);
    }
  };

  // Update export schedule
  const updateExportSchedule = async (scheduleId, scheduleConfig) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const encodedId = encodeURIComponent(scheduleId);
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/schedules/${encodedId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(scheduleConfig)
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExportSchedules(prev => prev.map(s => s.scheduleID === scheduleId ? data : s));
        setSuccess('Schedule updated successfully');
      }
    } catch (err) {
      setError(`Failed to update schedule: ${err.message}`);
    }
  };

  // Delete export schedule
  const deleteExportSchedule = async (scheduleId) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const encodedId = encodeURIComponent(scheduleId);
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/schedules/${encodedId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok || response.status === 204) {
        setExportSchedules(prev => prev.filter(s => s.scheduleID !== scheduleId));
        setSuccess('Schedule deleted successfully');
      }
    } catch (err) {
      setError(`Failed to delete schedule: ${err.message}`);
    }
  };

  // Create export schedule
  const createExportSchedule = async (scheduleConfig) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/schedules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(scheduleConfig)
        }
      );

      if (response.ok) {
        const data = await response.json();
        setExportSchedules(prev => [...prev, data]);
        setShowScheduleModal(false);
        setSuccess('Export schedule created successfully');
      } else {
        throw new Error('Failed to create schedule');
      }
    } catch (err) {
      setError(`Failed to create schedule: ${err.message}`);
    }
  };

  // Retry failed export
  const retryExport = async (requestKey) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const encodedKey = encodeURIComponent(requestKey);
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests/${encodedKey}/retry`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update export history with new status
        setExportHistory(prev => prev.map(exp => 
          exp.requestKey === requestKey ? data : exp
        ));
        
        // Start polling for the retried export
        pollExportDetails(requestKey);
        
        setSuccess('Export request retried');
      }
    } catch (err) {
      setError(`Failed to retry export: ${err.message}`);
    }
  };

  // Delete export request
  const deleteExport = async (requestKey) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;
    if (!window.confirm('Are you sure you want to delete this export request?')) return;

    try {
      const encodedKey = encodeURIComponent(requestKey);
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests/${encodedKey}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok || response.status === 204) {
        // Remove from export history
        setExportHistory(prev => prev.filter(exp => exp.requestKey !== requestKey));
        setSuccess('Export request deleted');
      }
    } catch (err) {
      setError(`Failed to delete export: ${err.message}`);
    }
  };

  // Refresh export URL
  const refreshExportUrl = async (requestKey) => {
    if (!selectedContract?.contractNumber || !credentials?.threeLegToken) return;

    try {
      const encodedKey = encodeURIComponent(requestKey);
      const response = await fetch(
        `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests/${encodedKey}/refreshUrl`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentials.threeLegToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update the export history with new URL
        setExportHistory(prev => prev.map(exp => 
          exp.requestKey === requestKey ? data : exp
        ));
        
        setSuccess('Export URL refreshed');
      }
    } catch (err) {
      setError(`Failed to refresh URL: ${err.message}`);
    }
  };

  // Poll export status
  const pollExportStatus = async (requestKey) => {
    const encodedKey = encodeURIComponent(requestKey);
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `https://developer.api.autodesk.com/tokenflex/v1/export/${selectedContract.contractNumber}/requests/${encodedKey}`,
          {
            headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setExportStatus(data.requestStatus);

        if (data.requestStatus === 'Download') {
          clearInterval(pollInterval);
          setExportUrl(data.downloadUrl);
          setExportFileName(data.downloadFileName);
          setSuccess('Export ready for download');
          setIsExporting(false);
        } else if (data.requestStatus === 'Error') {
          clearInterval(pollInterval);
          setError('Export failed');
          setIsExporting(false);
        }
      } catch (err) {
        console.error('Error polling export:', err);
        clearInterval(pollInterval);
        setError(`Failed to poll export: ${err.message}`);
        setIsExporting(false);
      }
    }, 5000);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (exportStatus !== 'Download') {
        setError('Export timeout');
        setIsExporting(false);
      }
    }, 300000); // 5 minutes timeout
  };

  // Download CSV
  const downloadExport = () => {
    if (exportUrl) {
      window.open(exportUrl, '_blank');
      setSuccess('Download started');
    }
  };

  // Export current results to Excel/CSV (client-side)
  const exportResultsToCSV = () => {
    if (!userResults) {
      setError('No data to export');
      return;
    }

    const headers = userResults.columns.join(',');
    const rows = userResults.rows.map(row => row.map(cell => `"${cell}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    const contractNumber = selectedContract?.contractNumber || 'unknown';
    a.download = `TokenUsage_${contractNumber}_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess('Data exported to CSV/Excel');
  };

  // Auto-load contracts when credentials are available
  useEffect(() => {
    const autoLoadContracts = async () => {
      if (credentials?.threeLegToken && credentials?.accountId) {
        console.log('📧 Auto-loading contracts for user:', credentials.accountId);
        await loadContracts();
      }
    };

    autoLoadContracts();
  }, [credentials?.threeLegToken, credentials?.accountId]);

  // Prepare chart data
  const getChartData = () => {
    if (!userResults) return [];

    const tokensIndex = userResults.columns.indexOf('tokensConsumed');
    const productIndex = userResults.columns.indexOf('productName');
    const userIndex = userResults.columns.indexOf('userName');

    if (tokensIndex === -1) return [];

    const grouped = {};
    userResults.rows.forEach(row => {
      const key = userIndex !== -1 ? row[userIndex] : row[productIndex] || 'Unknown';
      grouped[key] = (grouped[key] || 0) + (row[tokensIndex] || 0);
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  useEffect(() => {
    if (credentials?.threeLegToken) {
      loadContracts();
    }
  }, [credentials, loadContracts]);

  useEffect(() => {
    if (selectedContract) {
      loadContractDetails(selectedContract.contractNumber);
      loadLastUpdatedDetails();
      loadExportHistory();
      loadExportSchedules();
    }
  }, [selectedContract]);

  const chartData = getChartData();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            Token Usage & Analytics
          </h2>
          <p className="text-gray-600">Monitor and analyze Autodesk Token Flex consumption</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView(activeView === 'search' ? 'dashboard' : 'search')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {activeView === 'search' ? <BarChart3 className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
                <button
                  onClick={requestExport}
                  disabled={isExporting || !selectedContract}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isExporting ? <Loader className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  onClick={loadContracts}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Contract Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Contract Selection
        </h3>
        
        {contracts.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select from your contracts:</label>
            <select
              value={selectedContract?.contractNumber || ''}
              onChange={(e) => {
                const contract = contracts.find(c => c.contractNumber === e.target.value);
                setSelectedContract(contract);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Contract --</option>
              {contracts.map(contract => (
                <option key={contract.contractNumber} value={contract.contractNumber}>
                  {contract.contractName} ({contract.contractNumber}) - {contract.isActive ? 'Active' : 'Inactive'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or enter contract number manually:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualContractNumber}
              onChange={(e) => {
                setManualContractNumber(e.target.value);
              }}
              placeholder="Enter contract number (e.g., 12345)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (manualContractNumber) {
                  // Check if it exists in loaded contracts
                  const existing = contracts.find(c => c.contractNumber === manualContractNumber);
                  if (existing) {
                    setSelectedContract(existing);
                  } else {
                    // Create a new contract object for manual entry
                    setSelectedContract({
                      contractNumber: manualContractNumber,
                      contractName: `Contract ${manualContractNumber}`,
                      isActive: true
                    });
                  }
                  loadContractDetails(manualContractNumber);
                }
              }}
              disabled={!manualContractNumber}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Load Contract
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter your Token Flex contract number to load usage data
          </p>
        </div>
      </div>

      {/* Contract Details Display */}
      {contractDetails && selectedContract && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-600" />
            Contract Details
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Contract Name</p>
              <p className="font-semibold">{contractDetails.contractName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contract Number</p>
              <p className="font-semibold">{contractDetails.contractNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-semibold">{contractDetails.contractStartDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-semibold">{contractDetails.contractEndDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-semibold ${contractDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {contractDetails.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            {contractDetails.multiyearProvisionedTokens && (
              <div>
                <p className="text-sm text-gray-500">Multiyear Tokens</p>
                <p className="font-semibold">{contractDetails.multiyearProvisionedTokens.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Contract Years Breakdown */}
          {contractDetails.contractYears && contractDetails.contractYears.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Token Allocation by Year</h4>
              <div className="space-y-3">
                {contractDetails.contractYears.map((year) => (
                  <div key={year.year} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">Year {year.year}</p>
                        <p className="text-sm text-gray-600">{year.startDate} to {year.endDate}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Provisioned</p>
                        <p className="text-sm font-semibold text-blue-600">{(year.provisionedTokens || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Consumed</p>
                        <p className="text-sm font-semibold text-orange-600">{(year.consumedTokens || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="text-sm font-semibold text-green-600">{(year.remainingTokens || 0).toLocaleString()}</p>
                      </div>
                      {year.multiyearTokensAtStart > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">Multiyear Tokens</p>
                          <p className="text-sm font-semibold text-purple-600">{(year.multiyearTokensAtStart || 0).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrichment Categories */}
          {enrichmentCategories.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Custom Enrichment Categories</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {enrichmentCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => loadEnrichmentValues(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedEnrichmentCategory === category
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Display enrichment values when a category is selected */}
              {selectedEnrichmentCategory && enrichmentValues.length > 0 && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Values for <span className="text-purple-600">{selectedEnrichmentCategory}:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enrichmentValues.map((value, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white text-gray-700 rounded-full text-sm border border-gray-300"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Click on a category to see all available values for filtering
              </p>
            </div>
          )}

          {/* Last Updated Details */}
          {lastUpdatedDetails.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Last Updated Details
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {lastUpdatedDetails.map((detail, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{detail.usageCategory}</p>
                        <p className="text-xs text-gray-500">{detail.chargeCategory}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Last Usage</p>
                        <p className="text-sm font-semibold text-blue-600">{detail.lastUsageDate}</p>
                        <p className="text-xs text-gray-500 mt-1">Last Processed</p>
                        <p className="text-sm font-semibold text-green-600">{detail.lastProcessDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Values Quick Lookup */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-3">Quick Field Lookup</h4>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => loadFieldValues('productName')}
                disabled={loadingField === 'productName'}
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Products</span>
                  {loadingField === 'productName' ? (
                    <Loader className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <span className="text-xs text-blue-600">View</span>
                  )}
                </div>
                {fieldValues.productName && (
                  <p className="text-xs text-gray-500 mt-1">{fieldValues.productName.length} products</p>
                )}
              </button>

              <button
                onClick={() => loadFieldValues('userName')}
                disabled={loadingField === 'userName'}
                className="p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Users</span>
                  {loadingField === 'userName' ? (
                    <Loader className="w-4 h-4 animate-spin text-green-600" />
                  ) : (
                    <span className="text-xs text-green-600">View</span>
                  )}
                </div>
                {fieldValues.userName && (
                  <p className="text-xs text-gray-500 mt-1">{fieldValues.userName.length} users</p>
                )}
              </button>
            </div>

            {/* Display field values when loaded */}
            {(fieldValues.productName || fieldValues.userName) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                {fieldValues.productName && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Products ({fieldValues.productName.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {fieldValues.productName.slice(0, 10).map((product, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white text-gray-700 rounded text-xs border border-gray-300"
                        >
                          {product}
                        </span>
                      ))}
                      {fieldValues.productName.length > 10 && (
                        <span className="px-2 py-1 text-xs text-gray-500">
                          +{fieldValues.productName.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {fieldValues.userName && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Users ({fieldValues.userName.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {fieldValues.userName.slice(0, 10).map((user, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-white text-gray-700 rounded text-xs border border-gray-300"
                        >
                          {user}
                        </span>
                      ))}
                      {fieldValues.userName.length > 10 && (
                        <span className="px-2 py-1 text-xs text-gray-500">
                          +{fieldValues.userName.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedContract && (
        <>
          {/* Search Interface */}
          {activeView === 'search' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Search & Filter
              </h3>

              {/* Search Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMode('byUser')}
                  className={`px-4 py-2 rounded-lg ${searchMode === 'byUser' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  By User
                </button>
                <button
                  onClick={() => setSearchMode('byProduct')}
                  className={`px-4 py-2 rounded-lg ${searchMode === 'byProduct' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  By Product
                </button>
                <button
                  onClick={() => setSearchMode('advanced')}
                  className={`px-4 py-2 rounded-lg ${searchMode === 'advanced' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  <Activity className="w-4 h-4 inline mr-2" />
                  Advanced Query
                </button>
              </div>

              {/* Search Fields */}
              {searchMode === 'byUser' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email or Username</label>
                    <input
                      type="text"
                      value={userSearch.email || userSearch.userName}
                      onChange={(e) => setUserSearch({ ...userSearch, email: e.target.value, userName: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={searchUsers}
                    disabled={isLoadingQuery}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingQuery ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search Users
                  </button>
                </div>
              )}

              {searchMode === 'byProduct' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                    <input
                      type="text"
                      value={productSearch.productName}
                      onChange={(e) => setProductSearch({ ...productSearch, productName: e.target.value })}
                      placeholder="Revit, AutoCAD, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={searchByProduct}
                    disabled={isLoadingQuery}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingQuery ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search Products
                  </button>
                </div>
              )}

              {searchMode === 'advanced' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fields</label>
                    <input
                      type="text"
                      value={advancedQuery.fields}
                      onChange={(e) => setAdvancedQuery({ ...advancedQuery, fields: e.target.value })}
                      placeholder="usageCategory, productName, userName"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated field names</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Metrics</label>
                    <input
                      type="text"
                      value={advancedQuery.metrics}
                      onChange={(e) => setAdvancedQuery({ ...advancedQuery, metrics: e.target.value })}
                      placeholder="tokensConsumed, uniqueUsers, usageMinutes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated metrics</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usage Category (optional)</label>
                    <input
                      type="text"
                      value={advancedQuery.usageCategory}
                      onChange={(e) => setAdvancedQuery({ ...advancedQuery, usageCategory: e.target.value })}
                      placeholder="DESKTOP_PRODUCT, CLOUD_CONSUMPTION"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated usage categories</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WHERE Clause</label>
                    <input
                      type="text"
                      value={advancedQuery.where}
                      onChange={(e) => setAdvancedQuery({ ...advancedQuery, where: e.target.value })}
                      placeholder="contractYear >= 2 AND productName LIKE 'Revit%'"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">SQL-like WHERE clause (e.g., contractYear = 2 AND userName LIKE 'admin%')</p>
                  </div>

                  <button
                    onClick={submitAdvancedQuery}
                    disabled={isLoadingQuery}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isLoadingQuery ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Submit Advanced Query
                  </button>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Usage Summary Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Usage Summary
              </h3>
              <button
                onClick={loadUsageSummary}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                Load Summary
              </button>
            </div>

            {usageSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contract Year</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unique Users</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tokens Consumed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {usageSummary.map((record, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{record.usageMonth || '-'}</td>
                        <td className="px-4 py-2 text-sm">{record.usageCategory || '-'}</td>
                        <td className="px-4 py-2 text-sm">{record.contractYear || '-'}</td>
                        <td className="px-4 py-2 text-sm">{record.uniqueUsers?.toLocaleString() || '-'}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-blue-600">
                          {record.tokensConsumed?.toLocaleString() || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Click "Load Summary" to fetch usage data</p>
              </div>
            )}
          </div>

          {/* Dashboard View */}
          {activeView === 'dashboard' && userResults && (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Top Users/Products
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-orange-600" />
                    Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
      </>
    )}

    {/* Current Export Status */}
    {exportStatus && (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">
              Export Status: <span className="capitalize text-blue-600">{exportStatus}</span>
            </p>
            {exportFileName && <p className="text-sm text-gray-600">{exportFileName}</p>}
          </div>
          {exportStatus === 'Download' && exportUrl && (
            <button
              onClick={downloadExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <DownloadIcon className="w-4 h-4" />
              Download CSV
            </button>
          )}
        </div>
      </div>
    )}

    {/* Results Table */}
    {userResults && (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Results ({userResults.rows?.length || 0} records)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={exportResultsToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <DownloadIcon className="w-4 h-4" />
              Export Results
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {userResults.columns.map((col, index) => (
                  <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {userResults.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-2 text-sm">
                      {typeof cell === 'number' ? cell.toLocaleString() : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Export History */}
    {selectedContract && exportHistory.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Export History
            </h3>
            <button
              onClick={loadExportHistory}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh
            </button>
          </div>

          <div className="space-y-2">
            {exportHistory.map((exportItem) => (
              <div key={exportItem.requestKey} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{exportItem.downloadFileName}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Status: <span className="capitalize font-medium">{exportItem.requestStatus}</span> | 
                      Created: {new Date(exportItem.exportRequestDate).toLocaleString()}
                    </p>
                    {exportItem.downloadUrlExpireDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        Expires: {new Date(exportItem.downloadUrlExpireDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {exportItem.requestStatus === 'Download' && exportItem.downloadUrl && (
                      <>
                        <button
                          onClick={() => window.open(exportItem.downloadUrl, '_blank')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          <DownloadIcon className="w-4 h-4 inline mr-1" />
                          Download
                        </button>
                        <button
                          onClick={() => refreshExportUrl(exportItem.requestKey)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          <RefreshCw className="w-4 h-4 inline mr-1" />
                          Refresh URL
                        </button>
                        <button
                          onClick={() => deleteExport(exportItem.requestKey)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                          title="Delete this export"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {exportItem.requestStatus === 'Requested' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-lg">
                        Processing...
                      </span>
                    )}
                    {exportItem.requestStatus === 'Error' && (
                      <>
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-lg">
                          Failed
                        </span>
                        <button
                          onClick={() => retryExport(exportItem.requestKey)}
                          className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                        >
                          <RefreshCw className="w-4 h-4 inline mr-1" />
                          Retry
                        </button>
                        <button
                          onClick={() => deleteExport(exportItem.requestKey)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                        >
                          <XCircle className="w-4 h-4 inline mr-1" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    {/* Export Schedules */}
    {selectedContract && exportSchedules.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Scheduled Exports
            </h3>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Create Schedule
            </button>
          </div>

          <div className="space-y-2">
            {exportSchedules.map((schedule) => (
              <div key={schedule.scheduleID} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-gray-900">
                        Schedule {schedule.scheduleID.substring(0, 8)}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded ${
                        schedule.enableFlag === 'Y' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.enableFlag === 'Y' ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Frequency: {schedule.frequencyExpression} | 
                      Date Range: {schedule.dateRangeExpression}
                    </p>
                    {schedule.lastRanDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last Run: {new Date(schedule.lastRanDate).toLocaleString()}
                      </p>
                    )}
                    {schedule.nextRunDate && (
                      <p className="text-xs text-blue-600 mt-1">
                        Next Run: {new Date(schedule.nextRunDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        const newFlag = schedule.enableFlag === 'Y' ? 'N' : 'Y';
                        updateExportSchedule(schedule.scheduleID, {
                          ...schedule,
                          enableFlag: newFlag
                        });
                      }}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        schedule.enableFlag === 'Y' 
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      title={schedule.enableFlag === 'Y' ? 'Disable schedule' : 'Enable schedule'}
                    >
                      {schedule.enableFlag === 'Y' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteExportSchedule(schedule.scheduleID)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      title="Delete this schedule"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Usage Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {schedule.scheduleObjects.map((obj, idx) => (
                      <div key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                        {obj.usageCategory} ({obj.aggregationLevel.join(', ')})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default TokenUsageTab;
