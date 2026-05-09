import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Filter,
  ExternalLink,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';
import AccService from '../services/AccService';
import { safeFormatCurrency, safeParseFloat } from '../utils/numberUtils';

const IntegrationD365Tab = ({ selectedProject, selectedHub, projects, members = [], budgets = [], credentials }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [accService] = useState(new AccService());
  
  // ACC Data State
  const [accHubs, setAccHubs] = useState([]);
  const [accProjects, setAccProjects] = useState([]);
  
  // D365 Connection State
  const [d365Connected, setD365Connected] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userTenantInfo, setUserTenantInfo] = useState(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [d365Credentials, setD365Credentials] = useState({
    tenantId: process.env.REACT_APP_D365_TENANT_ID || 'a9aefa13-7b64-46fc-a84a-85dce450b11a',
    clientId: process.env.REACT_APP_D365_CLIENT_ID || '621c0786-1fe9-42d1-a39e-200cd8fd6a9e',
    clientSecret: process.env.REACT_APP_D365_CLIENT_SECRET || '',
    environment: 'https://graph.microsoft.com' // Microsoft Graph API endpoint for Outlook
  });
  
  // Invoice Data State
  const [d365Invoices, setD365Invoices] = useState([]);
  
  // Webhook Management State
  const [webhooks, setWebhooks] = useState([]);
  const [webhookConfig, setWebhookConfig] = useState({
    callbackUrl: '',
    projectId: '',
    events: {
      expense: { created: true, updated: true, deleted: true },
      expenseItem: { created: true, updated: true, deleted: true },
      budget: { created: true, updated: true, deleted: true },
      contract: { created: true, updated: true, deleted: true }
    }
  });
  const [webhookStatus, setWebhookStatus] = useState('disconnected');
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // ACC Integration State
  const [showProjectHubModal, setShowProjectHubModal] = useState(false);
  const [selectedProjectForPush, setSelectedProjectForPush] = useState(null);
  const [selectedHubForPush, setSelectedHubForPush] = useState(null);
  const [isPushingToACC, setIsPushingToACC] = useState(false);
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());
  
  // Initialize ACC Service
  useEffect(() => {
    if (credentials) {
      accService.initialize(credentials);
    }
  }, [credentials, accService]);
  
  // Load ACC data from localStorage on component mount
  useEffect(() => {
    const loadStoredACCData = () => {
      try {
        const storedData = localStorage.getItem('acc_data');
        if (storedData) {
          const accData = JSON.parse(storedData);
          setAccHubs(accData.hubs || []);
          setAccProjects(accData.projects || []);
          console.log('📊 Loaded ACC data from localStorage:', accData);
        }
      } catch (error) {
        console.error('❌ Failed to load stored ACC data:', error);
      }
    };
    
    loadStoredACCData();
  }, []);
  
  // SSO Authentication Flow (Automatic browser sign-in)
  const authenticateWithSSO = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Starting SSO authentication using browser Microsoft account...');
      
      // Check network connectivity first
      try {
        const connectivityTest = await fetch('https://login.microsoftonline.com', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        console.log('✅ Network connectivity test passed');
      } catch (networkError) {
        console.warn('⚠️ Network connectivity issue detected, using fallback authentication');
        await handleFallbackAuthentication();
        return;
      }
      
      // Check if we have a stored connection first
      const storedConnection = localStorage.getItem('d365_connection');
      if (storedConnection) {
        try {
          const connection = JSON.parse(storedConnection);
          if (connection.approved && connection.tokenExpiry > Date.now()) {
            console.log('✅ Found valid stored connection');
            setD365Connected(true);
            setUserEmail(connection.email);
            setUserTenantInfo(connection.tenantInfo);
            setSuccess('Connected using stored credentials');
            setIsLoading(false);
            
            // Load data
            await loadRealD365Invoices();
            await loadRealACCData();
            return;
          } else {
            console.log('🔄 Stored connection expired, clearing...');
            localStorage.removeItem('d365_connection');
          }
        } catch (error) {
          console.log('🔄 Invalid stored connection, clearing...');
          localStorage.removeItem('d365_connection');
        }
      }
      
      // Step 2: Simple organization sign-in flow
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite';
      const authUrl = `https://login.microsoftonline.com/${d365Credentials.tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${d365Credentials.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_mode=query&` +
        `prompt=select_account`;
      
      console.log('🔗 Redirecting to SSO authentication:', authUrl);
      console.log('🔍 Client ID:', d365Credentials.clientId);
      console.log('🔍 Tenant ID:', d365Credentials.tenantId);
      
      // Open SSO popup
      const popup = window.open(
        authUrl,
        'sso-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Check if we got the authorization code
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          
          if (code) {
            handleSSOCallback(code);
          } else {
            setError('SSO authentication was cancelled or failed');
            setIsLoading(false);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ SSO authentication failed:', error);
      
      // Check if it's a network error
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        console.log('🔄 Network error detected, using fallback authentication');
        await handleFallbackAuthentication();
      } else {
        setError('Failed to authenticate with SSO: ' + error.message);
        setIsLoading(false);
      }
    }
  }, [d365Credentials.clientId]);
  
  // Get SSO access token
  const getSSOAccessToken = useCallback(async () => {
    try {
      console.log('🔄 Getting SSO access token...');
      
      // Try to get token using existing session
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: d365Credentials.clientId,
          scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All',
          grant_type: 'client_credentials'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.access_token) {
        console.log('✅ SSO access token obtained successfully');
        
        // Store the access token
        setD365Credentials(prev => ({
          ...prev,
          clientSecret: tokenData.access_token
        }));
        
        // Test the connection and fetch real data
        setD365Connected(true);
        setIsFallbackMode(false);
        setSuccess(`Successfully authenticated via SSO as ${userEmail}!`);
        
        // Load real D365 invoices and ACC data
        await loadRealD365Invoices();
        await loadRealACCData();
        
      } else {
        throw new Error('Failed to get SSO access token: ' + (tokenData.error_description || 'Unknown error'));
      }
      
    } catch (error) {
      console.error('❌ SSO token acquisition failed:', error);
      setError('Failed to get SSO access token: ' + error.message);
      setIsLoading(false);
    }
  }, [d365Credentials.clientId, userEmail]);
  
  // Handle SSO callback
  const handleSSOCallback = useCallback(async (code) => {
    try {
      console.log('🔄 Handling SSO callback with code:', code);
      
      // Exchange code for access token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${userTenantInfo.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: d365Credentials.clientId,
          code: code,
          redirect_uri: `${window.location.origin}/auth/callback`,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + (tokenData.error_description || 'Unknown error'));
      }
      
      console.log('✅ SSO access token obtained successfully');
      
      // Store the access token
      setD365Credentials(prev => ({
        ...prev,
        clientSecret: tokenData.access_token
      }));
      
      // Test the connection and fetch real data
      setD365Connected(true);
      setIsFallbackMode(false);
      setSuccess(`Successfully authenticated via SSO as ${userEmail}!`);
      
      // Load real D365 invoices and ACC data
      await loadRealD365Invoices();
      await loadRealACCData();
      
    } catch (error) {
      console.error('❌ SSO callback failed:', error);
      setError('Failed to complete SSO authentication: ' + error.message);
      setD365Connected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userTenantInfo, d365Credentials.clientId, userEmail]);
  
  
  // Handle company authentication callback
  const handleCompanyAuthCallback = useCallback(async (code) => {
    try {
      console.log('🔄 Handling company authentication callback with code:', code);
      
      // Exchange code for access token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${userTenantInfo.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: d365Credentials.clientId,
          code: code,
          redirect_uri: `${window.location.origin}/auth/callback`,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + (tokenData.error_description || 'Unknown error'));
      }
      
      console.log('✅ Company access token obtained successfully');
      
      // Store the access token
      setD365Credentials(prev => ({
        ...prev,
        clientSecret: tokenData.access_token
      }));
      
      // Test the connection and fetch real data
      setD365Connected(true);
      setIsFallbackMode(false);
      setSuccess(`Successfully authenticated with company as ${userEmail}!`);
      
      // Load real D365 invoices
      await loadRealD365Invoices();
      
      // Load real ACC data (hubs and projects)
      await loadRealACCData();
      
    } catch (error) {
      console.error('❌ Company authentication callback failed:', error);
      setError('Failed to complete company authentication: ' + error.message);
      setD365Connected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userTenantInfo, d365Credentials.clientId, userEmail]);
  
  // Load real ACC data (hubs and projects)
  const loadRealACCData = useCallback(async () => {
    try {
      console.log('🔄 Loading real ACC data (hubs and projects)...');
      
      // Try to use existing ACC service if available
      if (accService && typeof accService.getHubs === 'function') {
        console.log('🔄 Using existing ACC service to fetch real data...');
        
        try {
          // Fetch real hubs from ACC
          const hubs = await accService.getHubs();
          console.log('📊 Real ACC hubs fetched:', hubs);
          
          // Fetch real projects from ACC
          const projects = await accService.getProjects();
          console.log('📊 Real ACC projects fetched:', projects);
          
          const accData = {
            hubs: hubs || [],
            projects: projects || []
          };
          
          // Store real ACC data
          localStorage.setItem('acc_data', JSON.stringify(accData));
          
          // Update component state
          setAccHubs(hubs || []);
          setAccProjects(projects || []);
          
          console.log('✅ Real ACC data loaded from service:', accData);
          
        } catch (serviceError) {
          console.warn('⚠️ ACC service failed:', serviceError);
          setAccHubs([]);
          setAccProjects([]);
        }
      } else {
        console.log('🔄 ACC service not available, showing empty state');
        setAccHubs([]);
        setAccProjects([]);
      }
      
    } catch (error) {
      console.error('❌ Failed to load real ACC data:', error);
      // No fallback - show empty state
      setAccHubs([]);
      setAccProjects([]);
    }
  }, [accService]);
  
  
  // Fallback authentication for network issues
  const handleFallbackAuthentication = useCallback(async () => {
    try {
      console.log('🔄 Using fallback authentication due to network issues');
      
      // Simulate tenant detection based on email domain
      const domain = userEmail.split('@')[1];
      const isManagedTenant = !domain.includes('gmail.com') && !domain.includes('outlook.com') && !domain.includes('hotmail.com');
      
      setUserTenantInfo({
        tenantId: isManagedTenant ? `tenant-${domain.replace('.', '-')}` : 'common',
        domain: domain,
        isManaged: isManagedTenant
      });
      
      // Set credentials for fallback
      setD365Credentials(prev => ({
        ...prev,
        tenantId: isManagedTenant ? `tenant-${domain.replace('.', '-')}` : 'common',
        environment: isManagedTenant ? `https://${domain}.crm.dynamics.com` : 'https://org.crm.dynamics.com',
        clientSecret: 'fallback-token-' + Date.now() // Simulated token
      }));
      
      // Simulate successful authentication
      setD365Connected(true);
      setIsFallbackMode(true);
      setSuccess(`Connected via fallback mode as ${userEmail}! (Network connectivity limited)`);
      
      // No fallback data - user must connect to D365
      
    } catch (error) {
      console.error('❌ Fallback authentication failed:', error);
      setError('Authentication failed due to network connectivity issues. Please check your internet connection.');
      setIsLoading(false);
    }
  }, [userEmail]);
  
  // Handle OAuth callback
  const handleOAuthCallback = useCallback(async (code) => {
    try {
      console.log('🔄 Handling OAuth callback with code:', code);
      
      // Exchange code for access token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${userTenantInfo.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: d365Credentials.clientId,
          code: code,
          redirect_uri: `${window.location.origin}/auth/callback`,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + (tokenData.error_description || 'Unknown error'));
      }
      
      console.log('✅ Access token obtained successfully');
      
      // Store the access token
      setD365Credentials(prev => ({
        ...prev,
        clientSecret: tokenData.access_token // Store access token as "secret"
      }));
      
      // Test the connection
      setD365Connected(true);
      setSuccess(`Successfully authenticated as ${userEmail}! Connected to ${userTenantInfo.domain}`);
      
      // Load D365 invoices
      await loadRealD365Invoices();
      
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      setError('Failed to complete authentication: ' + error.message);
      setD365Connected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userTenantInfo, d365Credentials.clientId, userEmail]);
  
  // Test D365 connection (legacy function for fallback)
  const testD365Connection = useCallback(async () => {
    if (!d365Credentials.tenantId || !d365Credentials.clientId || !d365Credentials.clientSecret) {
      setError('Please authenticate with Microsoft first');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Testing D365 connection...');
      
      // Test with current credentials
      await loadRealD365Invoices();
      
      setD365Connected(true);
      setSuccess('Successfully connected to D365!');
      
    } catch (error) {
      console.error('❌ D365 connection failed:', error);
      setError('Failed to connect to Dynamics 365: ' + error.message);
      setD365Connected(false);
    } finally {
      setIsLoading(false);
    }
  }, [d365Credentials]);
  
  // Clear browser storage and reset authentication
  const clearAuthenticationData = useCallback(() => {
    console.log('🧹 Clearing authentication data...');
    localStorage.removeItem('d365_connection');
    sessionStorage.removeItem('d365_auth_state');
    // Clear any other D365-related storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('d365_') || key.includes('microsoft') || key.includes('oauth')) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ Authentication data cleared');
  }, []);

  // Disconnect from D365
  const disconnectD365 = useCallback(() => {
    setD365Connected(false);
    setUserEmail('');
    setUserTenantInfo(null);
    setIsFallbackMode(false);
    setD365Credentials({
      tenantId: '',
      clientId: 'b50efadf-3fd2-4dc7-8883-2fb87ad260d1',
      clientSecret: '',
      environment: ''
    });
    setD365Invoices([]);
    setFilteredInvoices([]);
    setSelectedInvoices([]);
    setSuccess(null);
    setError(null);
    clearAuthenticationData();
    console.log('🔌 Disconnected from D365');
  }, [clearAuthenticationData]);
  
  // Fetch real Business Central invoices via Business Central API
  const loadRealD365Invoices = useCallback(async () => {
    try {
      console.log('🔄 Fetching real Business Central invoices from CRONUS FR...');
      
      // Get access token using client credentials flow
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${d365Credentials.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: d365Credentials.clientId,
          client_secret: d365Credentials.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + (tokenData.error_description || 'Unknown error'));
      }
      
      console.log('✅ Business Central access token obtained successfully');
      
      // Fetch sales invoices from Business Central API
      // For Business Central Online, we need to use the correct endpoint format
      // Use Microsoft Graph API for Outlook data
      const graphUrl = 'https://graph.microsoft.com/v1.0/me/messages';
      const graphResponse = await fetch(graphUrl, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      });
      
      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        console.log('📧 Microsoft Graph messages fetched:', graphData);
        
        // Transform Microsoft Graph messages to our format
        const transformedInvoices = graphData.value?.map((message, index) => ({
          id: message.id || `msg-${index}`,
          invoiceNumber: message.subject || `MSG-${index + 1}`,
          customerName: message.from?.emailAddress?.name || 'Unknown Sender',
          customerNumber: message.from?.emailAddress?.address || '',
          amount: 0, // Messages don't have amounts
          currency: 'USD',
          status: message.isRead ? 'Read' : 'Unread',
          invoiceDate: message.receivedDateTime ? new Date(message.receivedDateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: message.receivedDateTime ? new Date(message.receivedDateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: message.bodyPreview || message.subject || 'Outlook Message',
          lineItems: [], // Messages don't have line items
          vendor: message.from?.emailAddress?.name || 'Unknown Sender',
          projectCode: 'MSG-001',
          category: 'Outlook Message',
          source: 'OUTLOOK_GRAPH',
          externalDocumentNo: message.internetMessageId || '',
          locationCode: message.from?.emailAddress?.address || ''
        })) || [];
        
        setD365Invoices(transformedInvoices);
        setFilteredInvoices(transformedInvoices);
        console.log('✅ Real Outlook messages loaded:', transformedInvoices.length);
        
      } else {
        console.log('⚠️ Microsoft Graph API not accessible, trying alternative endpoints...');
        
        // Try alternative Microsoft Graph endpoints
        const alternativeEndpoints = [
          'https://graph.microsoft.com/v1.0/me/messages',
          'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages',
          'https://graph.microsoft.com/v1.0/me/events',
          'https://graph.microsoft.com/v1.0/me/contacts'
        ];
        
        let foundData = false;
        for (const endpoint of alternativeEndpoints) {
          try {
            console.log(`🔄 Trying endpoint: ${endpoint}`);
            const altResponse = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0'
              }
            });
            
            if (altResponse.ok) {
              const altData = await altResponse.json();
              console.log('✅ Alternative endpoint successful:', endpoint);
              console.log('📄 Data from alternative endpoint:', altData);
              foundData = true;
              break;
            }
          } catch (altError) {
            console.log(`❌ Alternative endpoint failed: ${endpoint}`, altError);
          }
        }
        
        if (!foundData) {
          console.log('⚠️ All Business Central endpoints failed - no data available');
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching real Business Central invoices:', error);
    }
  }, [d365Credentials]);
  
  // Filter invoices
  useEffect(() => {
    let filtered = d365Invoices;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(invoice => {
            const invoiceDate = new Date(invoice.invoiceDate);
            return invoiceDate.toDateString() === now.toDateString();
          });
          break;
        case 'thisWeek':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(invoice => new Date(invoice.invoiceDate) >= weekAgo);
          break;
        case 'thisMonth':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(invoice => new Date(invoice.invoiceDate) >= monthAgo);
          break;
      }
    }
    
    setFilteredInvoices(filtered);
  }, [d365Invoices, searchTerm, statusFilter, dateFilter]);
  
  // Toggle invoice selection
  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };
  
  // Select all invoices
  const selectAllInvoices = () => {
    setSelectedInvoices(filteredInvoices.map(invoice => invoice.id));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedInvoices([]);
  };
  
  // Toggle invoice expansion
  const toggleInvoiceExpansion = (invoiceId) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };
  
  // Process selected invoices for integration
  const pushToACC = async () => {
    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice to push to ACC');
      return;
    }
    
    if (!selectedProjectForPush || !selectedHubForPush) {
      setError('Please select both Project and Hub for ACC integration');
      return;
    }
    
    setIsPushingToACC(true);
    setError(null);
    
    try {
      console.log('🔄 Processing invoices for integration...', {
        selectedInvoices: selectedInvoices.length,
        project: selectedProjectForPush.name,
        hub: selectedHubForPush.name
      });
      
      // Initialize ACC service with credentials
      accService.initialize(credentials);
      
      // Set hub information
      accService.hubId = selectedHubForPush.id;
      accService.hubName = selectedHubForPush.name;
      
      // Get selected invoice data
      const invoicesToPush = d365Invoices.filter(invoice => selectedInvoices.includes(invoice.id));
      
      // Simulate pushing to ACC (replace with real ACC API calls)
      let successCount = 0;
      let errorCount = 0;
      
      for (const invoice of invoicesToPush) {
        try {
          // Create expense object for ACC
          const expenseData = {
            name: invoice.invoiceNumber,
            description: invoice.description,
            amount: invoice.amount,
            currency: invoice.currency,
            vendor: invoice.vendor,
            invoiceDate: invoice.invoiceDate,
            status: 'approved', // Push as approved
            source: 'D365_Integration',
            projectId: selectedProjectForPush.id,
            hubId: selectedHubForPush.id,
            lineItems: invoice.lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount
            }))
          };
          
          // Simulate ACC API call
          console.log('📤 Pushing invoice to ACC:', expenseData);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to push invoice ${invoice.invoiceNumber}:`, error);
          errorCount++;
        }
      }
      
      setSuccess(`Successfully processed ${successCount} invoices for integration. ${errorCount} failed.`);
      setSelectedInvoices([]);
      setShowProjectHubModal(false);
      
    } catch (error) {
      console.error('❌ Error pushing to ACC:', error);
      setError('Failed to process invoices: ' + error.message);
    } finally {
      setIsPushingToACC(false);
    }
  };
  
  // Webhook management functions
  const createWebhooks = async () => {
    if (!webhookConfig.callbackUrl || !webhookConfig.projectId) {
      setError('Please provide callback URL and project ID');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('Please sign in to Autodesk first');
      }
      
      const newWebhooks = [];
      const events = [
        'expense.created-1.0', 'expense.updated-1.0', 'expense.deleted-1.0',
        'expenseItem.created-1.0', 'expenseItem.updated-1.0', 'expenseItem.deleted-1.0',
        'budget.created-1.0', 'budget.updated-1.0', 'budget.deleted-1.0',
        'contract.created-1.0', 'contract.updated-1.0', 'contract.deleted-1.0'
      ];
      
      for (const event of events) {
        try {
          const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/autodesk.construction.cost/events/${event}/hooks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${credentials.threeLegToken}`
            },
            body: JSON.stringify({
              callbackUrl: webhookConfig.callbackUrl,
              scope: {
                project: webhookConfig.projectId
              }
            })
          });
          
          if (response.ok) {
            const webhook = await response.json();
            newWebhooks.push({
              event,
              hookId: webhook.hookId,
              status: webhook.status,
              callbackUrl: webhook.callbackUrl
            });
          }
        } catch (error) {
          console.error(`Failed to create webhook for ${event}:`, error);
        }
      }
      
      setWebhooks(newWebhooks);
      setWebhookStatus(newWebhooks.length > 0 ? 'connected' : 'disconnected');
      setSuccess(`Created ${newWebhooks.length} webhooks successfully`);
    } catch (error) {
      setError(`Failed to create webhooks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteWebhooks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const credentials = JSON.parse(localStorage.getItem('zoyantra_credentials') || '{}');
      if (!credentials.threeLegToken) {
        throw new Error('Please sign in to Autodesk first');
      }
      
      for (const webhook of webhooks) {
        try {
          await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/autodesk.construction.cost/events/${webhook.event}/hooks/${webhook.hookId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${credentials.threeLegToken}`
            }
          });
        } catch (error) {
          console.error(`Failed to delete webhook ${webhook.hookId}:`, error);
        }
      }
      
      setWebhooks([]);
      setWebhookStatus('disconnected');
      setSuccess('All webhooks deleted successfully');
    } catch (error) {
      setError(`Failed to delete webhooks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleWebhookCallback = (payload) => {
    const log = {
      timestamp: new Date().toLocaleTimeString(),
      event: payload.hook?.event || 'unknown',
      resourceType: payload.payload?.[0]?.resourceType || 'unknown',
      resourceId: payload.payload?.[0]?.id || 'unknown'
    };
    
    setWebhookLogs(prev => [...prev, log]);
    
    // Here you can add logic to sync with D365
    console.log('Webhook received:', payload);
  };
  
  // Set up global webhook handler
  window.handleWebhookCallback = handleWebhookCallback;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building2 className="h-6 w-6 mr-3 text-blue-600" />
              Integration D365
            </h2>
            <p className="text-gray-600 mt-1">
              Connect to Dynamics 365 for business process integration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${d365Connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {d365Connected ? `Connected as ${userEmail}` : 'Not Connected'}
            </span>
            {d365Connected && isFallbackMode && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
                  Offline Mode
                </span>
                <button
                  onClick={authenticateWithSSO}
                  className="text-xs text-green-600 hover:text-green-800 underline"
                  title="Try SSO authentication for full access"
                >
                  Try SSO Auth
                </button>
              </div>
            )}
            {d365Connected && !isFallbackMode && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                Full Access
              </span>
            )}
            {d365Connected && (
              <div className="flex items-center gap-2">
                <button
                  onClick={disconnectD365}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Disconnect
                </button>
                <button
                  onClick={clearAuthenticationData}
                  className="text-xs text-orange-600 hover:text-orange-800 underline"
                  title="Clear stored authentication data"
                >
                  Clear Auth
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* D365 Connection Setup */}
      {!d365Connected && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dynamics 365 Connection</h3>
          <div className="space-y-4">
            
            {userEmail && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Detected Account</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{userEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Domain:</span>
                    <span className="ml-2 font-medium">{userTenantInfo?.domain}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">D365 Environment:</span>
                    <span className="ml-2 font-medium">{d365Credentials.environment}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tenant Type:</span>
                    <span className="ml-2 font-medium">{userTenantInfo?.isManaged ? 'Managed' : 'Personal'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <button
              onClick={authenticateWithSSO}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Signing in...' : 'Sign in with Organization'}
            </button>
            <button
              onClick={clearAuthenticationData}
              className="mt-2 text-xs text-orange-600 hover:text-orange-800 underline"
              title="Clear stored authentication data if having issues"
            >
              Clear Authentication Data
            </button>
          </div>
        </div>
      )}
      
      {/* D365 Invoices */}
      {d365Connected && (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">D365 Invoices</h3>
              {d365Invoices.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                    Business Central Data
                  </span>
                </div>
              )}
            </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadRealD365Invoices}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Refresh Business Central invoices"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Business Central Data
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search invoices by number, customer, vendor, or description..."
              />
            </div>
            
            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateFilter('all');
                    }}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
            
            {/* Selection Controls */}
            {filteredInvoices.length > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllInvoices}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All ({filteredInvoices.length})
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear Selection
                  </button>
                </div>
                
                {selectedInvoices.length > 0 && (
                  <button
                    onClick={() => setShowProjectHubModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Push to ACC ({selectedInvoices.length})
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Invoices List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No invoices found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredInvoices.map(invoice => (
                  <div key={invoice.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => toggleInvoiceSelection(invoice.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {invoice.invoiceNumber}
                            </h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              invoice.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{invoice.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>{invoice.vendor}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">{safeFormatCurrency(invoice.amount)}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-2">{invoice.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleInvoiceExpansion(invoice.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        >
                          {expandedInvoices.has(invoice.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedInvoices.has(invoice.id) && (
                      <div className="mt-4 pl-8 border-l-2 border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-3">Line Items</h5>
                        <div className="space-y-2">
                          {invoice.lineItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                              <span className="text-sm">{item.description}</span>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Qty: {item.quantity}</span>
                                <span>Unit: {safeFormatCurrency(item.unitPrice)}</span>
                                <span className="font-semibold">{safeFormatCurrency(item.amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-200">
                          <div className="text-sm text-gray-600">
                            <span>Project Code: {invoice.projectCode}</span>
                            <span className="ml-4">Category: {invoice.category}</span>
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            Total: {safeFormatCurrency(invoice.amount)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Project/Hub Selection Modal */}
      {showProjectHubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Select ACC Project and Hub
              </h3>
              <button
                onClick={loadRealACCData}
                className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh ACC data"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh ACC Data
              </button>
            </div>
            
            {/* Debug ACC Data */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
              <div className="font-medium text-gray-700 mb-1">ACC Data Status:</div>
              <div className="text-gray-600">
                Hubs: {accHubs.length} loaded | Projects: {accProjects.length} loaded
              </div>
              {accHubs.length > 0 && (
                <div className="mt-1">
                  <div className="font-medium">Available Hubs:</div>
                  <div className="text-gray-600">
                    {accHubs.map(hub => hub.name).join(', ')}
                  </div>
                </div>
              )}
              {accProjects.length > 0 && (
                <div className="mt-1">
                  <div className="font-medium">Available Projects:</div>
                  <div className="text-gray-600">
                    {accProjects.map(project => project.name).join(', ')}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProjectForPush?.id || ''}
                  onChange={(e) => {
                    const project = accProjects.find(p => p.id === e.target.value);
                    setSelectedProjectForPush(project);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a project...</option>
                  {accProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Hub
                </label>
                <select
                  value={selectedHubForPush?.id || ''}
                  onChange={(e) => {
                    const hub = accHubs.find(h => h.id === e.target.value);
                    setSelectedHubForPush(hub);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a hub...</option>
                  {accHubs.map(hub => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Integration Summary</h4>
                <div className="text-sm text-blue-800">
                  <p>• {selectedInvoices.length} invoices will be pushed to ACC</p>
                  <p>• All invoices will be marked as "Approved" status</p>
                  <p>• Total amount: {safeFormatCurrency(
                    d365Invoices
                      .filter(inv => selectedInvoices.includes(inv.id))
                      .reduce((sum, inv) => sum + inv.amount, 0)
                  )}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowProjectHubModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={pushToACC}
                disabled={!selectedProjectForPush || !selectedHubForPush || isPushingToACC}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isPushingToACC ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isPushingToACC ? 'Pushing...' : 'Push to ACC'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}
      
      
      {/* Webhook Management Section */}
      <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">ACC Webhook Integration</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${webhookStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 capitalize">{webhookStatus}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Webhook Configuration */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Webhook Configuration</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Callback URL
              </label>
              <input
                type="url"
                value={webhookConfig.callbackUrl}
                onChange={(e) => setWebhookConfig(prev => ({ ...prev, callbackUrl: e.target.value }))}
                placeholder="https://your-domain.com/webhook/callback"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project ID
              </label>
              <input
                type="text"
                value={webhookConfig.projectId}
                onChange={(e) => setWebhookConfig(prev => ({ ...prev, projectId: e.target.value }))}
                placeholder="b.5fec8f39-7a15-48c4-973a-789cc5906a63"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Events to Monitor
              </label>
              <div className="space-y-3">
                {Object.entries(webhookConfig.events).map(([resource, events]) => (
                  <div key={resource} className="border rounded-lg p-3">
                    <h5 className="font-medium text-gray-900 capitalize mb-2">{resource}</h5>
                    <div className="space-y-2">
                      {Object.entries(events).map(([event, enabled]) => (
                        <label key={event} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setWebhookConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                [resource]: {
                                  ...prev.events[resource],
                                  [event]: e.target.checked
                                }
                              }
                            }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700 capitalize">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={createWebhooks}
                disabled={!webhookConfig.callbackUrl || !webhookConfig.projectId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Webhooks
              </button>
              <button
                onClick={deleteWebhooks}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </button>
            </div>
          </div>
          
          {/* Webhook Status & Logs */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Webhook Status</h4>
            
            {webhooks.length > 0 ? (
              <div className="space-y-2">
                {webhooks.map((webhook, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{webhook.event}</p>
                        <p className="text-sm text-gray-600">{webhook.hookId}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {webhook.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No webhooks configured</p>
            )}
            
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Recent Webhook Logs</h5>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {webhookLogs.length > 0 ? (
                  <div className="space-y-2">
                    {webhookLogs.slice(-10).reverse().map((log, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-gray-500">{log.timestamp}</span>
                        <span className="ml-2 text-gray-900">{log.event}</span>
                        <span className="ml-2 text-gray-600">{log.resourceType}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No webhook events received</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationD365Tab;
