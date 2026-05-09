import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  LogOut, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  FileText,
  Key,
  AlertTriangle,
  BarChart3,
  Target,
  Users,
  Calendar,
  DollarSign,
  Scale,
  RefreshCw,
  Clock,
  TrendingUp,
  GanttChart,
  Database,
  UserCog,
  Settings,
  Shield,
  Sparkles,
  PieChart,
  Bug,
  Activity,
  Bell,
  Coins
} from 'lucide-react';
import AccService from './services/AccService_old';
import IntegrationService from './services/IntegrationService';
import ProjectSelector from './components/ProjectSelector';
import TimesheetTab from './components/TimesheetTab';
import PlanWorkaheadTab from './components/PlanWorkaheadTab';
import VerticalTabNavigation from './components/VerticalTabNavigation';
import DocuSignTab from './components/DocuSignTab';
import ExpenseTab from './components/ExpenseTab';
import CrewManagementTab from './components/CrewManagementTab';
import CalendarTab from './components/CalendarTab';
import ResourceManagementTab from './components/ResourceManagementTab';
import TeamLoadBalanceTab from './components/TeamLoadBalanceTab';
import AdminTab from './components/AdminTab';
import GanttChartTab from './components/GanttChartTab';
import EnhancedGanttChartTab from './components/EnhancedGanttChartTab';
import Tasks from './components/TasksTab';
import MspGanttTab from './components/MspGanttTab';
import EarnedValueTab from './components/EarnedValueTab';
import IntegrationD365Tab from './components/IntegrationD365Tab';
import SharePointIntegrationTab from './components/SharePointIntegrationTab';
import CostManagementTab from './components/CostManagementTab';
import BudgetDebugTab from './components/BudgetDebugTab';
import ReminderTab from './components/ReminderTab';
import PLC from './components/plc';
import ZoyantraLogo from './components/ZoyantraLogo';
import TokenUsageTab from './components/TokenUsageTab';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);
  const [members, setMembers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [archivedTimesheets, setArchivedTimesheets] = useState([]);
  const [archivedExpenses, setArchivedExpenses] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('tasks');
  const [credentials, setCredentials] = useState({
    accountId: '',
    clientId: '',
    clientSecret: '', // Moved to server-side
    threeLegToken: '',
    refreshToken: '',
    twoLeggedToken: ''
  });
  const [userProfile, setUserProfile] = useState(null);
  const [integrationService] = useState(new IntegrationService());

  // Get rate for user based on their role
  const getRateForRole = (roles, member) => {
    // Rate configuration based on roles
    const rateConfig = {
      'Project Manager': 75,
      'Project Admin': 80,
      'Engineer': 65,
      'Supervisor': 60,
      'Team Member': 50,
      'Laborer': 40,
      'Architect': 70,
      'Designer': 55
    };
    
    // Find the highest rate role
    let highestRate = 50; // Default rate
    if (roles && roles.length > 0) {
      roles.forEach(role => {
        const roleRate = rateConfig[role.name] || 50;
        if (roleRate > highestRate) {
          highestRate = roleRate;
        }
      });
    }
    
    return highestRate;
  };

  // Clear all authentication data
  const clearAuthentication = () => {
    console.log('🧹 Clearing all authentication data...');
    localStorage.removeItem('zoyantra_credentials');
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_in_progress');
    setCredentials({
      accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
      clientId: 'WN6yXCVdbZB2SOVgVtZFsCtV7eGgNYn95wCm9TaheeUjtvPj',
      clientSecret: '', // Moved to server-side
      threeLegToken: '',
      refreshToken: '',
      twoLeggedToken: ''
    });
    setIsAuthenticated(false);
    setSelectedProject(null);
    setProjects([]);
    setSelectedHub(null);
  };

  // Clear OAuth state when blocked
  const clearOAuthState = () => {
    console.log('🧹 Clearing OAuth state...');
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_in_progress');
    setError(null);
    setOAuthUrlGenerated(false); // Allow OAuth URL to be regenerated
    setOAuthUrl(null);
    console.log('✅ OAuth state cleared, you can now try signing in again');
  };

  // Clear ALL local stored data from the entire app
  const clearAllLocalStorage = () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will clear ALL data from the app including:\n\n' +
      '• All timesheets and archived timesheets\n' +
      '• All project data, tasks, and phases\n' +
      '• All expense data\n' +
      '• All member and crew data\n' +
      '• All cached data\n' +
      '• Authentication tokens\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (!confirmed) {
      console.log('❌ Clear all data cancelled by user');
      return;
    }
    
    console.log('🧹 Clearing ALL local stored data from the app...');
    
    // Clear authentication data
    localStorage.removeItem('zoyantra_credentials');
    
    // Clear timesheet data
    localStorage.removeItem('zoyantra_timesheets');
    localStorage.removeItem('cewa_timesheets_archived');
    localStorage.removeItem('zoyantra_archived_timesheets');
    
    // Clear project data
    localStorage.removeItem('zoyantra_project_phases');
    localStorage.removeItem('zoyantra_project_tasks');
    localStorage.removeItem('zoyantra_project_budgets');
    localStorage.removeItem('zoyantra_project_members');
    localStorage.removeItem('zoyantra_project_crews');
    localStorage.removeItem('zoyantra_member_rates');
    
    // Clear expense data
    localStorage.removeItem('zoyantra_created_expenses');
    localStorage.removeItem('zoyantra_expense_data');
    
    // Clear cache data
    localStorage.removeItem('zoyantra_hubs_cache');
    localStorage.removeItem('zoyantra_projects_cache');
    localStorage.removeItem('zoyantra_members_cache');
    localStorage.removeItem('zoyantra_budgets_cache');
    
    // Clear any cached data with project-specific keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('members_cache_') ||
        key.startsWith('budgets_cache_') ||
        key.startsWith('zoyantra_') ||
        key.startsWith('cewa_') ||
        key.includes('timesheet') ||
        key.includes('expense') ||
        key.includes('project') ||
        key.includes('member') ||
        key.includes('budget') ||
        key.includes('crew') ||
        key.includes('task') ||
        key.includes('phase')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Reset all app state
    setCredentials({
      accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
      clientId: 'WN6yXCVdbZB2SOVgVtZFsCtV7eGgNYn95wCm9TaheeUjtvPj',
      clientSecret: '', // Moved to server-side
      threeLegToken: '',
      refreshToken: '',
      twoLeggedToken: ''
    });
    setIsAuthenticated(false);
    setSelectedProject(null);
    setSelectedHub(null);
    setProjects([]);
    setMembers([]);
    setBudgets([]);
    setArchivedTimesheets([]);
    setError(null);
    setIsLoading(false);
    
    console.log('✅ ALL local stored data cleared from the app');
    console.log('📊 Remaining localStorage items:', localStorage.length);
    console.log('📊 Remaining sessionStorage items:', sessionStorage.length);
  };

  // Load user profile information
  const loadUserProfile = async () => {
    try {
      console.log('🔍 Loading user profile...');
      const profile = await AccService.getCurrentUserProfile();
      setUserProfile(profile);
      console.log('✅ User profile loaded:', profile);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      setUserProfile({
        id: 'current-user',
        email: 'user@example.com',
        name: 'Current User'
      });
    }
  };

  // Test if stored token is still valid
  const testTokenValidity = async (credentials) => {
    try {
      console.log('🔍 Testing token validity...');
      // Ensure AccService is initialized before making API calls
      try {
        AccService.initialize(credentials);
      } catch (initErr) {
        console.warn('⚠️ AccService initialize warning:', initErr?.message || initErr);
      }
      setIsLoading(true);
      const hubs = await AccService.getHubs();
      if (hubs && hubs.length > 0) {
        setIsAuthenticated(true);
        // Initialize integration service
        integrationService.initialize(credentials);
        // Load user profile
        await loadUserProfile();
        console.log('✅ Token is valid, authentication successful');
      } else {
        throw new Error('No hubs returned - token may be invalid');
      }
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      clearAuthentication();
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh archived timesheets
  const refreshArchivedTimesheets = async (project) => {
    if (!project) return;
    
    try {
      const timesheetService = new (require('./services/LocalTimesheetService')).default();
      const allArchivedTimesheets = timesheetService.getArchived();
      console.log('🔄 Refreshing archived timesheets:', allArchivedTimesheets.length);
      console.log('🔄 All archived timesheets:', allArchivedTimesheets);
      
      // Also check active timesheets to see if any should be archived
      const allActiveTimesheets = timesheetService.getAll();
      console.log('🔄 Active timesheets:', allActiveTimesheets.length);
      console.log('🔄 Active timesheets for project:', allActiveTimesheets.filter(t => 
        t.projectId === project.id || t.selectedProjectId === project.id
      ));
      
      const projectArchivedTimesheets = allArchivedTimesheets.filter(t => 
        t.projectId === project.id || t.selectedProjectId === project.id
      );
      
      console.log('🔄 Project archived timesheets for', project.name, ':', projectArchivedTimesheets.length);
      console.log('🔄 Project archived timesheets details:', projectArchivedTimesheets);
      setArchivedTimesheets(projectArchivedTimesheets);
      
      // Also refresh archived expenses
      const allArchivedExpenses = JSON.parse(localStorage.getItem('zoyantra_created_expenses') || '[]');
      const projectArchivedExpenses = allArchivedExpenses.filter(e => 
        e.projectId === project.id || e.selectedProjectId === project.id
      );
      setArchivedExpenses(projectArchivedExpenses);
      
      // Trigger refresh for components that depend on this data
      setRefreshTrigger(prev => prev + 1);
      console.log('🔄 Refresh trigger updated:', refreshTrigger + 1);
      
    } catch (error) {
      console.error('❌ Error refreshing archived timesheets:', error);
    }
  };

  // Load stored credentials on app startup
  useEffect(() => {
    const loadStoredCredentials = async () => {
      try {
        const stored = localStorage.getItem('zoyantra_credentials');
        if (stored) {
          const storedCredentials = JSON.parse(stored);
          console.log('📦 Loading stored credentials:', storedCredentials);
          
          // Check if we have a valid token and it's not expired
          if (storedCredentials.threeLegToken && storedCredentials.threeLegToken.trim() !== '') {
            // Check if token is expired
            const now = Date.now();
            const tokenExpiry = storedCredentials.tokenExpiry 
              ? (typeof storedCredentials.tokenExpiry === 'string' 
                  ? new Date(storedCredentials.tokenExpiry).getTime() 
                  : storedCredentials.tokenExpiry)
              : 0;
            
            // If token is expired or expires in less than 5 minutes, try to refresh it
            if (tokenExpiry > now + (5 * 60 * 1000)) {
              // Token is still valid (more than 5 minutes left)
              console.log('✅ Token is still valid');
              setCredentials(storedCredentials);
              AccService.initialize(storedCredentials);
              
              // Test the token by making a simple API call
              testTokenValidity(storedCredentials);
            } else if (storedCredentials.refreshToken && storedCredentials.refreshToken.trim() !== '') {
              // Token is expired or expiring soon, but we have a refresh token - try to refresh
              console.log('🔄 Token expired or expiring soon, attempting automatic refresh...');
              console.log('⏰ Token expiry:', tokenExpiry ? new Date(tokenExpiry).toISOString() : 'Not set');
              
              try {
                // Initialize AccService with stored credentials first
                AccService.initialize(storedCredentials);
                
                // Attempt to refresh the token
                const refreshedTokenData = await AccService.instance.refreshAccessToken();
                
                // Update credentials with refreshed token
                const refreshedCredentials = {
                  ...storedCredentials,
                  threeLegToken: refreshedTokenData.access_token || AccService.instance.accessToken,
                  refreshToken: refreshedTokenData.refresh_token || AccService.instance.refreshToken || storedCredentials.refreshToken,
                  tokenExpiry: AccService.instance.tokenExpiry
                };
                
                // Save refreshed credentials
                localStorage.setItem('zoyantra_credentials', JSON.stringify(refreshedCredentials));
                setCredentials(refreshedCredentials);
                
                console.log('✅ Token refreshed successfully!');
                setIsAuthenticated(true);
                
                // Test the refreshed token
                testTokenValidity(refreshedCredentials);
              } catch (refreshError) {
                console.error('❌ Failed to refresh token:', refreshError);
                console.log('⚠️ Token refresh failed, requiring re-authentication');
                setIsAuthenticated(false);
                // Don't clear credentials - user might want to try again
              }
            } else {
              console.log('⚠️ Token has expired and no refresh token available');
              console.log('⏰ Token expired at:', tokenExpiry ? new Date(tokenExpiry).toISOString() : 'Unknown');
              setIsAuthenticated(false);
              // Clear expired credentials
              localStorage.removeItem('zoyantra_credentials');
            }
          } else {
            console.log('⚠️ No valid token found in stored credentials');
            setIsAuthenticated(false);
          }
        } else {
          console.log('📦 No stored credentials found - user needs to sign in');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error loading stored credentials:', error);
        setIsAuthenticated(false);
      }
    };

    loadStoredCredentials();
  }, []);

  // Handle OAuth callback (Autodesk, DocuSign, and Outlook)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔍 Checking for OAuth callback...');
      
      // Skip if this is a DocuSign OAuth flow
      if (window.location.pathname === '/docusign/callback' || window.location.hash === '#docusign') {
        console.log('🔍 Skipping DocuSign OAuth callback - handled separately');
        return;
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      console.log('🔍 Checking OAuth callback parameters:');
      console.log('  URL:', window.location.href);
      console.log('  Code:', code ? `Present (${code.substring(0, 20)}...)` : 'Missing');
      console.log('  State:', state || 'Missing');
      console.log('  Error:', error || 'None');
      
      // Check if this is an Outlook OAuth callback
      // Check for stored Outlook state first
      const storedOutlookState = localStorage.getItem('outlook_oauth_state');
      console.log('  Stored Outlook State:', storedOutlookState || 'None');
      
      if (storedOutlookState) {
        // We have a stored Outlook state - check if this callback is for Outlook
        if (state && state === storedOutlookState) {
          console.log('✅ Matched Outlook OAuth state - handling Outlook callback');
          await handleOutlookOAuthCallback(code, state, error, errorDescription);
          return;
        } else if (state) {
          console.log('⚠️ State mismatch - stored state does not match incoming state');
        } else {
          console.log('⚠️ Missing state in callback - might be a different OAuth flow');
        }
      } else if (code || error) {
        // We have a code/error but no stored Outlook state
        // This might be a different OAuth flow or the state was lost
        console.log('⚠️ OAuth callback detected but no stored Outlook state - might be Autodesk OAuth');
      }
      
      // If there's an old Outlook state but no matching state, clean it up
      if (storedOutlookState && (!state || state !== storedOutlookState)) {
        const outlookStartTime = localStorage.getItem('outlook_oauth_started');
        if (outlookStartTime) {
          const timeSinceStart = Date.now() - parseInt(outlookStartTime);
          // If more than 10 minutes have passed, clean up old Outlook state
          if (timeSinceStart > 600000) {
            console.log('🧹 Cleaning up expired Outlook OAuth state');
            localStorage.removeItem('outlook_oauth_state');
            localStorage.removeItem('outlook_oauth_started');
          }
        }
      }
      
      console.log('🔍 OAuth callback parameters:');
      console.log('  Code:', code ? 'Present' : 'Missing');
      console.log('  State:', state || 'Missing');
      console.log('  State type:', typeof state);
      console.log('  State length:', state ? state.length : 'N/A');
      console.log('  Error:', error || 'None');
      console.log('  Error Description:', errorDescription || 'None');
      
      // Also check what's in localStorage
      const storedState = localStorage.getItem('oauth_state');
      console.log('🔍 Stored state in localStorage:', storedState || 'None');
      console.log('🔍 Stored state type:', typeof storedState);
      console.log('🔍 Stored state length:', storedState ? storedState.length : 'N/A');
      
      // If no stored state but we have a code, this might be a page refresh
      if (code && !storedState) {
        console.warn('⚠️ No stored state found but code present - possible page refresh');
        console.warn('⚠️ This might cause state verification to fail');
      }
      
      // Check if OAuth is stuck (no code but oauth_in_progress flag is set)
      const oauthInProgress = localStorage.getItem('oauth_in_progress');
      if (!code && oauthInProgress) {
        const timeSinceStart = Date.now() - parseInt(oauthInProgress);
        if (timeSinceStart > 300000) { // 5 minutes - OAuth is stuck
          console.warn('⚠️ OAuth appears to be stuck, clearing progress flag');
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_state');
        }
      }
      
      if (error) {
        console.error('❌ OAuth Error:', error, errorDescription);
        setError(`OAuth Error: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
        return;
      }
      
      if (code) {
        console.log('✅ OAuth code received, exchanging for token...');
        console.log('🔍 Code value:', code);
        console.log('🔍 Code length:', code.length);
        console.log('🔍 State value:', state);
        
        // Check if we've already processed this code
        const processingKey = `oauth_processing_${code}`;
        const processingTime = localStorage.getItem(processingKey);
        if (processingTime) {
          const timeSinceProcessing = Date.now() - parseInt(processingTime);
          if (timeSinceProcessing < 60000) { // 60 seconds timeout
            console.warn('⚠️ OAuth code already being processed, skipping...');
            return;
          } else {
            console.log('🔄 Processing timeout expired, retrying...');
            localStorage.removeItem(processingKey);
          }
        }
        
        // Mark as processing with timestamp
        localStorage.setItem(processingKey, Date.now().toString());
        
        // Clear URL parameters to prevent re-processing on page refresh
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        setIsLoading(true);
        setError(null);
        
        try {
          // Exchange code for token (older implementation expects state parameter)
          const tokenData = await AccService.exchangeCodeForToken(code, state);
          
          // Normalize token fields (v2 returns access_token/refresh_token)
          const normalizedAccessToken = tokenData.threeLegToken || tokenData.access_token || '';
          const normalizedRefreshToken = tokenData.refreshToken || tokenData.refresh_token || '';
          const normalizedExpiryMs = tokenData.tokenExpiry
            ? new Date(tokenData.tokenExpiry).getTime()
            : (tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined);

          console.log('🔑 TOKEN DATA RECEIVED:');
          console.log('Access Token:', normalizedAccessToken ? 'Present' : 'Missing');
          console.log('Refresh Token:', normalizedRefreshToken ? 'Present' : 'Missing');
          console.log('Expires In:', normalizedExpiryMs ? `${Math.round((normalizedExpiryMs - Date.now()) / 1000)} seconds` : 'undefined seconds');
          console.log('Token Expiry Time:', normalizedExpiryMs ? new Date(normalizedExpiryMs).toISOString() : 'undefined');
          console.log('Full token data:', tokenData);
          
          if (!tokenData.refreshToken) {
            console.warn('⚠️ WARNING: No refresh token received! This means the token will expire in ~1 hour and cannot be refreshed.');
            console.warn('⚠️ Make sure your OAuth scopes include "offline_access"');
          } else {
            console.log('✅ Refresh token received - automatic token refresh is enabled');
          }
          
          // Optionally generate a 2-legged token (disabled by default)
          let twoLeggedToken = tokenData.twoLeggedToken || '';
          if (process.env.REACT_APP_ENABLE_TWO_LEGGED === 'true') {
            try {
              console.log('🔑 Attempting to generate 2-legged token for ACC Data Management API...');
              const twoLegResponse = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                  client_id: credentials.clientId || process.env.REACT_APP_FORGE_CLIENT_ID,
                  client_secret: credentials.clientSecret || process.env.REACT_APP_FORGE_CLIENT_SECRET,
                  grant_type: 'client_credentials',
                  scope: 'data:read data:write'
                })
              });
              if (twoLegResponse.ok) {
                const twoLegData = await twoLegResponse.json();
                twoLeggedToken = twoLegData.access_token;
                console.log('✅ 2-legged token generated successfully');
              } else {
                const errorText = await twoLegResponse.text();
                console.log('ℹ️ 2-legged token not available (optional):', twoLegResponse.status, errorText);
              }
            } catch (error) {
              console.log('ℹ️ 2-legged token generation skipped (optional feature):', error.message);
            }
          }
          
          // Update credentials with the new tokens
          const updatedCredentials = {
            ...credentials,
            threeLegToken: normalizedAccessToken,
            refreshToken: normalizedRefreshToken,
            twoLeggedToken: twoLeggedToken,
            tokenExpiry: normalizedExpiryMs ? new Date(normalizedExpiryMs) : undefined
          };
          
          // Save tokens to localStorage for persistence
          localStorage.setItem('zoyantra_credentials', JSON.stringify(updatedCredentials));

          setCredentials(updatedCredentials);
          // Initialize AccService with fresh credentials before making API calls
          try {
            AccService.initialize(updatedCredentials);
          } catch (e) {
            console.warn('AccService initialize warning:', e?.message || e);
          }
          
          // Clean up processing key
          localStorage.removeItem(processingKey);
          
          // Test authentication by getting hubs
          const hubsData = await AccService.getHubs();
          if (hubsData.length === 0) {
            throw new Error('No hubs found. Please check your permissions.');
          }
          
          // Clear projects initially - user must select a hub first
          setProjects([]);
          setSelectedProject(null);
          setSelectedHub(null);
          
          // Set as authenticated
          setIsAuthenticated(true);
          
          // Initialize integration service
          integrationService.initialize(updatedCredentials);
          
          // Load user profile
          await loadUserProfile();
          
          // Show success message
          setError(null);
          console.log('🎉 Sign-in complete!');
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Clean up processing flag
          localStorage.removeItem(processingKey);
          
        } catch (err) {
          console.error('❌ OAuth Token Exchange Error:', err.message);
          
          // Check if it's a code expiry error
          if (err.message.includes('invalid_grant') || err.message.includes('expired')) {
            console.log('🔄 Authorization code expired, clearing and retrying...');
            // Clear any stored state that might be causing issues
            localStorage.removeItem('oauth_state');
            localStorage.removeItem(processingKey);
            // Remove the code from URL to prevent retry loops
            window.history.replaceState({}, document.title, window.location.pathname);
            setError('Authorization code expired. Please try signing in again.');
          } else {
          setError(`Failed to exchange code for token: ${err.message}`);
          }
          
          // Clean up processing flag on error
          localStorage.removeItem(processingKey);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    handleOAuthCallback();
  }, [credentials]);

  // Handle Outlook OAuth callback
  const handleOutlookOAuthCallback = async (code, state, error, errorDescription) => {
    try {
      if (error) {
        console.error('❌ Outlook OAuth Error:', error, errorDescription);
        // If in popup, send error to parent
        if (window.opener) {
          window.opener.postMessage({
            type: 'OUTLOOK_OAUTH_ERROR',
            error: errorDescription || error
          }, window.location.origin);
          window.close();
        } else {
          setError(`Outlook OAuth Error: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
        }
        return;
      }

      if (!code) {
        console.error('❌ No authorization code received');
        if (window.opener) {
          window.opener.postMessage({
            type: 'OUTLOOK_OAUTH_ERROR',
            error: 'No authorization code received'
          }, window.location.origin);
          window.close();
        }
        return;
      }

      // Verify state
      const storedState = localStorage.getItem('outlook_oauth_state');
      if (state !== storedState) {
        console.error('❌ State mismatch - possible CSRF attack');
        if (window.opener) {
          window.opener.postMessage({
            type: 'OUTLOOK_OAUTH_ERROR',
            error: 'State verification failed'
          }, window.location.origin);
          window.close();
        }
        return;
      }

      console.log('✅ Outlook OAuth code received, exchanging for token...');
      
      // Load Outlook settings
      const storedSettings = localStorage.getItem('zoyantra_auto_reminder_settings');
      if (!storedSettings) {
        throw new Error('Outlook settings not found');
      }
      const settings = JSON.parse(storedSettings);
      
      // Validate required settings
      if (!settings.outlookClientId || !settings.outlookTenantId || !settings.outlookClientSecret) {
        throw new Error('Outlook credentials not configured. Please configure Client ID, Tenant ID, and Client Secret in settings.');
      }
      
      // Exchange code for token using backend proxy (avoids SPA/cross-origin issues)
      // Use /api path which is proxied to backend via setupProxy.js
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      console.log('🔄 Exchanging Outlook OAuth code for token via backend...');
      console.log('🔑 Client ID:', settings.outlookClientId);
      console.log('🔑 Tenant ID:', settings.outlookTenantId);
      console.log('🔑 Client Secret:', settings.outlookClientSecret ? 'Present (length: ' + settings.outlookClientSecret.length + ')' : 'Missing');
      console.log('🔗 Using proxy: /api/outlook/oauth/token → http://localhost:3001/api/outlook/oauth/token');
      
      let tokenResponse;
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        // Use /api path which setupProxy.js will proxy to http://localhost:3001
        tokenResponse = await fetch('/api/outlook/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            clientId: settings.outlookClientId,
            tenantId: settings.outlookTenantId,
            clientSecret: settings.outlookClientSecret.trim(), // Trim whitespace in case of copy-paste issues
            redirectUri: redirectUri
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (networkError) {
        console.error('❌ Network error calling backend:', networkError);
        if (networkError.name === 'AbortError') {
          throw new Error('Request timed out. The backend server took too long to respond. Please check if the backend is running and try again.');
        }
        throw new Error(`Failed to connect to backend server at http://localhost:3001. Please make sure the backend server is running on port 3001.`);
      }

      if (!tokenResponse.ok) {
        let errorData;
        try {
          const errorText = await tokenResponse.text();
          console.error('❌ Backend error response:', errorText);
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          errorData = { 
            error: `Backend request failed: ${tokenResponse.status}`, 
            error_description: `HTTP ${tokenResponse.status} - Could not parse error response` 
          };
        }
        
        console.error('❌ Outlook token exchange failed:', tokenResponse.status, errorData);
        
        // Use error message from backend (already user-friendly)
        const errorMessage = errorData.error || errorData.error_description || `Token exchange failed: ${tokenResponse.status}`;
        throw new Error(errorMessage);
      }

      const tokenData = await tokenResponse.json();
      
      console.log('✅ Outlook tokens received:', {
        accessToken: tokenData.access_token ? 'Present' : 'Missing',
        refreshToken: tokenData.refresh_token ? 'Present' : 'Missing',
        expiresIn: tokenData.expires_in
      });

      // Clean up state
      localStorage.removeItem('outlook_oauth_state');
      localStorage.removeItem('outlook_oauth_started');

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // If in popup, send success message to parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'OUTLOOK_OAUTH_SUCCESS',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in
        }, window.location.origin);
        window.close();
      } else {
        // Direct navigation - save tokens directly
        const outlookTokens = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          tokenExpiry: Date.now() + (tokenData.expires_in * 1000)
        };
        localStorage.setItem('outlook_tokens', JSON.stringify(outlookTokens));
        alert('✅ Successfully signed in to Outlook!');
      }
    } catch (error) {
      console.error('❌ Outlook OAuth callback error:', error);
      if (window.opener) {
        window.opener.postMessage({
          type: 'OUTLOOK_OAUTH_ERROR',
          error: error.message || 'Unknown error'
        }, window.location.origin);
        window.close();
      } else {
        setError(`Outlook sign-in failed: ${error.message}`);
      }
    }
  };

  const [lastAuthUrl, setLastAuthUrl] = useState('');

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we already have a valid 3-legged token
      if (credentials.threeLegToken && credentials.refreshToken) {
        console.log('🔑 Using existing 3-legged token...');
        // Test authentication by getting hubs
        const hubsData = await AccService.getHubs();
        if (hubsData.length === 0) {
          throw new Error('No hubs found. Please check your permissions.');
        }
        
        // Clear projects initially - user must select a hub first
        setProjects([]);
        setSelectedProject(null);
        setSelectedHub(null);
        setIsAuthenticated(true);
        
        // Initialize integration service
        integrationService.initialize(credentials);
        
        // Load user profile
        await loadUserProfile();
        return;
      }
      
      // If no token, redirect to OAuth
      console.log('🔑 No existing token, redirecting to OAuth...');
      const authUrl = AccService.getAuthUrl();
      if (!authUrl) {
        console.warn('⚠️ OAuth already in progress, please wait...');
        setError('OAuth authentication is already in progress. Please wait for it to complete.');
        return;
      }
      console.log('🔑 OAuth URL:', authUrl);
      setLastAuthUrl(authUrl);
      // Force hard navigation in case SPA routing interferes
      window.location.replace(authUrl);
      // Fallback: try assign shortly after
      setTimeout(() => {
        try {
          if (!/auth\/callback/.test(window.location.href)) {
            window.location.assign(authUrl);
          }
        } catch (_) {}
      }, 400);
      
    } catch (err) {
      // Handle authentication errors specifically
      if (err.message.includes('invalid_grant') || err.message.includes('expired')) {
        console.log('🔄 Token expired, redirecting to OAuth...');
        const authUrl = AccService.getAuthUrl();
        if (!authUrl) {
          console.warn('⚠️ OAuth already in progress, please wait...');
          setError('OAuth authentication is already in progress. Please wait for it to complete.');
          return;
        }
        window.location.href = authUrl;
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubSelect = async (hub) => {
    console.log('🔍 Hub selected:', hub);
    setSelectedHub(hub);
    setSelectedProject(null); // Clear selected project when switching hubs
    setIsLoading(true);
    setError(null);
    
    try {
      // Get projects from selected hub
      const projectsData = await AccService.getProjects(hub.id);
      
      // Filter out Component Library projects and enhance with ID formats
      const filteredProjects = projectsData
        .filter(project => !project.name?.toLowerCase().includes('component library'))
        .map(project => ({
          ...project,
          // Store both prefixed and raw IDs for different API needs
          projectId: project.id, // "b.5fec8f39-7a15-48c4-973a-789cc5906a63"
          rawProjectId: project.id.replace(/^b\./, ""), // "5fec8f39-7a15-48c4-973a-789cc5906a63"
          hubId: project.relationships?.hub?.data?.id || hub.id, // Extract from project or use hub.id
          rawHubId: (project.relationships?.hub?.data?.id || hub.id).replace(/^a\./, "") // Raw hub ID
        }));
      
      console.log(`📊 Loaded ${projectsData.length} projects, filtered to ${filteredProjects.length}`);
      console.log('📊 Enhanced projects with ID formats:', filteredProjects.map(p => ({
        name: p.name,
        projectId: p.projectId,
        rawProjectId: p.rawProjectId,
        hubId: p.hubId,
        rawHubId: p.rawHubId
      })));
      setProjects(filteredProjects);
    } catch (err) {
      setError(err.message || 'Failed to load projects from selected hub');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle DocuSign OAuth callback
  useEffect(() => {
    const handleDocuSignCallback = () => {
      // Check if we're returning from DocuSign OAuth with success
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.split('?')[1] || '');
      
      if (hash.includes('docusign') && (hashParams.get('connected') === 'true' || urlParams.get('connected') === 'true')) {
        console.log('✅ DocuSign OAuth callback successful - user authenticated');
        // Set active tab to docusign to stay on DocuSign tab
        setActiveTab('docusign');
        // Clear the URL parameters but keep the hash
        window.history.replaceState({}, document.title, window.location.pathname + '#docusign');
        // The DocuSign tab will automatically check connection status
        // Show success notification
        setTimeout(() => {
          // Trigger a refresh of DocuSign connection status
          window.dispatchEvent(new CustomEvent('docusign-connected'));
        }, 500);
      }
    };

    handleDocuSignCallback();
  }, []);

  const handleLogout = () => {
    // Stop all live syncs
    integrationService.stopAllLiveSyncs();
    
    setIsAuthenticated(false);
    setSelectedProject(null);
    setProjects([]);
    setSelectedHub(null);
    setMembers([]);
    setBudgets([]);
    setUserProfile(null);
    setError(null);
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setIsLoading(true);
    setError(null);
    
    // Set the hub from the project if available
    if (project.hubId && !selectedHub) {
      console.log('🔍 Setting hub from project:', project.hubId);
      // Create a hub object from the project's hub information
      const hubFromProject = {
        id: project.hubId,
        name: project.hubName || project.relationships?.hub?.data?.name || 'Project Hub',
        type: 'hubs'
      };
      setSelectedHub(hubFromProject);
      console.log('✅ Hub set from project:', hubFromProject);
    }
    
    try {
      console.log('🔄 Loading project data for:', project.name);
        
      // Load project members using reliable method
      console.log('👥 Loading members for project:', project.id, 'hub:', selectedHub?.id);
      let membersData = [];
        
      try {
        if (selectedHub?.id) {
          // Use the correct ID format for different APIs
          const hubId = project.hubId || selectedHub.id; // Use project's hubId if available
          const projectId = project.projectId || project.id; // Use prefixed projectId
          
          // Validate ID formats
          if (!hubId || typeof hubId !== 'string') {
            console.error('❌ Invalid hubId:', hubId);
            throw new Error('Invalid hubId format');
          }
          if (!projectId || typeof projectId !== 'string') {
            console.error('❌ Invalid projectId:', projectId);
            throw new Error('Invalid projectId format');
          }
          
          console.log('🔍 Using IDs for user loading:', { projectId, hubId });
          
          // Try the reliable method first
          membersData = await AccService.getProjectUsersReliable(projectId, hubId);
          console.log('👥 Loaded project members via reliable method:', membersData.length);
          
          // If no members found, try the admin method as fallback
          if (membersData.length === 0) {
            console.log('🔄 No members from reliable method, trying admin method...');
            membersData = await AccService.getProjectUsersAdmin(projectId, hubId);
            console.log('👥 Loaded project members via admin method:', membersData.length);
          }
            
          // Enhance members with roles and rates
          membersData = await Promise.all(membersData.map(async (member) => {
            try {
              // Get user roles from account
              const userRoles = await AccService.getUserRoles(hubId, member.id);
              console.log(`👤 Roles for ${member.name}:`, userRoles);
              
              // Add rate based on role (this would come from a rate configuration)
              const rate = getRateForRole(userRoles, member);
              
              return {
                ...member,
                roles: userRoles,
                rate: rate,
                companyName: member.companyName || 'Unknown Company'
              };
            } catch (roleError) {
              console.warn(`⚠️ Could not load roles for ${member.name}:`, roleError.message);
              // Use default rate if roles can't be loaded
              return {
                ...member,
                roles: [{ id: 'default', name: 'Team Member' }],
                rate: 50, // Default rate
                companyName: member.companyName || 'Unknown Company'
              };
            }
          }));
            
          console.log('👥 Enhanced members with roles and rates:', membersData.length);
        } else {
          console.warn('⚠️ No hub ID available, using fallback members...');
          throw new Error('No hub ID available');
        }
      } catch (memberError) {
        console.error('❌ Error loading members:', memberError.message);
        // Create fallback members for testing
        membersData = [
          {
            id: 'fallback-user-1',
            name: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            status: 'active',
            accessLevels: { projectAdmin: true },
            roles: [{ id: 'role-1', name: 'Project Manager' }],
            companyName: 'ACME Construction',
            rate: 75
          },
          {
            id: 'fallback-user-2',
            name: 'Jane Smith',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            status: 'active',
            accessLevels: { projectAdmin: false },
            roles: [{ id: 'role-2', name: 'Team Member' }],
            companyName: 'ACME Construction',
            rate: 50
          },
          {
            id: 'fallback-user-3',
            name: 'Bob Johnson',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@example.com',
            status: 'active',
            accessLevels: { projectAdmin: false },
            roles: [{ id: 'role-3', name: 'Engineer' }],
            companyName: 'ACME Construction',
            rate: 65
          }
        ];
        console.log('👥 Using fallback members:', membersData.length);
      }
        
      setMembers(membersData);
        
      // Load budgets for the project with revised budget data
      // Use rawProjectId for Cost API (budgets)
      const budgetProjectId = project.rawProjectId || project.id.replace(/^b\./, "");
      console.log('💰 Loading budgets with projectId:', budgetProjectId);
      console.log('💰 Project name:', project.name);
      console.log('💰 Hub ID:', selectedHub?.id);
      
      try {
        console.log('💰 Loading budgets...');
        
        const budgetsData = await AccService.getBudgets(budgetProjectId, { hubId: selectedHub?.id });
        console.log('💰 Loaded project budgets:', budgetsData.length);
        console.log('💰 Budgets data:', budgetsData);
        
        // Debug: Look for Construction contract Sum specifically
        const constructionBudgets = budgetsData.filter(b => 
          b.name?.toLowerCase().includes('construction') || 
          b.attributes?.name?.toLowerCase().includes('construction') ||
          b.title?.toLowerCase().includes('construction')
        );
        console.log('🏗️ Construction-related budgets found:', constructionBudgets.length);
        constructionBudgets.forEach(b => {
          console.log('🏗️ Construction budget details:', {
            id: b.id,
            name: b.name,
            attributesName: b.attributes?.name,
            title: b.title,
            amount: b.amount,
            revised: b.revised,
            originalAmount: b.originalAmount,
            totalAmount: b.totalAmount,
            unitPrice: b.unitPrice,
            attributesAmount: b.attributes?.amount,
            fullObject: b
          });
        });
        
        if (budgetsData && budgetsData.length > 0) {
          // Process budgets to include unit information
          const processedBudgets = budgetsData.map(budget => ({
            id: budget.id,
            name: budget.name || budget.attributes?.name || 'Unknown Budget',
            amount: budget.revised || budget.originalAmount || budget.amount || budget.attributes?.amount || budget.unitPrice || 0,
            unitPrice: budget.unitPrice || budget.attributes?.unitPrice || budget.amount || 0,
            quantity: budget.quantity || budget.attributes?.quantity || 0,
            inputQuantity: budget.inputQuantity || budget.attributes?.inputQuantity || 0,
            unit: budget.unit || budget.attributes?.unit || 'units',
            description: budget.description || budget.attributes?.description || '',
            status: budget.status || budget.attributes?.status || 'active',
            originalAmount: budget.revised || budget.originalAmount || budget.amount || 0,
            attributes: budget.attributes || {}
          }));
          
          setBudgets(processedBudgets);
          console.log('✅ Budgets processed and set successfully');
        } else {
          console.log('⚠️ No budgets found for project');
          setBudgets([]);
        }
      } catch (budgetError) {
        console.error('❌ Error loading budgets:', budgetError);
        console.log('🔄 Trying alternative budget loading method...');
        
        // Try alternative method
        try {
          const alternativeBudgets = await AccService.getBudgets(budgetProjectId, selectedHub?.id);
          console.log('💰 Alternative budget loading result:', alternativeBudgets.length);
          
          if (alternativeBudgets && alternativeBudgets.length > 0) {
            // Process budgets to include unit information
            const processedBudgets = alternativeBudgets.map(budget => ({
              id: budget.id,
              name: budget.name || budget.attributes?.name || 'Unknown Budget',
              amount: budget.revised || budget.originalAmount || budget.amount || budget.attributes?.amount || budget.unitPrice || 0,
              unitPrice: budget.unitPrice || budget.attributes?.unitPrice || budget.amount || 0,
              quantity: budget.quantity || budget.attributes?.quantity || 0,
              inputQuantity: budget.inputQuantity || budget.attributes?.inputQuantity || 0,
              unit: budget.unit || budget.attributes?.unit || 'units',
              description: budget.description || budget.attributes?.description || '',
              status: budget.status || budget.attributes?.status || 'active',
              originalAmount: budget.revised || budget.originalAmount || budget.amount || 0,
              attributes: budget.attributes || {}
            }));
            setBudgets(processedBudgets);
          } else {
            setBudgets([]);
          }
        } catch (altError) {
          console.error('❌ Alternative budget loading also failed:', altError);
          console.log('🔄 Trying simple budget loading without options...');
          
          // Try simple approach without complex options
          try {
            const simpleBudgets = await AccService.getBudgets(budgetProjectId, selectedHub?.id);
            console.log('💰 Simple budget loading result:', simpleBudgets.length);
            
            if (simpleBudgets && simpleBudgets.length > 0) {
              // Process budgets to include unit information
              const processedBudgets = simpleBudgets.map(budget => ({
                id: budget.id,
                name: budget.name || budget.attributes?.name || 'Unknown Budget',
                amount: budget.revised || budget.originalAmount || budget.amount || budget.attributes?.amount || budget.unitPrice || 0,
                unitPrice: budget.unitPrice || budget.attributes?.unitPrice || budget.amount || 0,
                quantity: budget.quantity || budget.attributes?.quantity || 0,
                inputQuantity: budget.inputQuantity || budget.attributes?.inputQuantity || 0,
                unit: budget.unit || budget.attributes?.unit || 'units',
                description: budget.description || budget.attributes?.description || '',
                status: budget.status || budget.attributes?.status || 'active',
                originalAmount: budget.revised || budget.originalAmount || budget.amount || 0,
                attributes: budget.attributes || {}
              }));
              setBudgets(processedBudgets);
            } else {
              setBudgets([]);
            }
          } catch (simpleError) {
            console.error('❌ Simple budget loading also failed:', simpleError);
            setBudgets([]);
          }
        }
      }

      // Load archived timesheets for the project using refresh function
      await refreshArchivedTimesheets(project);

      // Load archived expenses for this project
      try {
        const storedExpenses = localStorage.getItem('zoyantra_created_expenses');
        if (storedExpenses) {
          const allArchivedExpenses = JSON.parse(storedExpenses);
          const projectArchivedExpenses = allArchivedExpenses.filter(expense => 
            expense.projectId === project.id && (expense.status === 'synced' || expense.status === 'draft')
          );
          console.log('💰 Project archived expenses for', project.name, ':', projectArchivedExpenses.length, projectArchivedExpenses);
          setArchivedExpenses(projectArchivedExpenses);
        } else {
          console.log('💰 No archived expenses found in localStorage');
          setArchivedExpenses([]);
        }
      } catch (expenseError) {
        console.error('❌ Error loading archived expenses:', expenseError);
        setArchivedExpenses([]);
      }
        
      // Clear any failed validations for this project
      try {
        if (integrationService.liveDataService) {
          integrationService.liveDataService.clearProjectValidation(project.id, selectedHub.id);
        }
      } catch (clearError) {
        console.log('Could not clear project validation:', clearError);
      }
      
      // Start live data synchronization
      try {
        console.log('🔄 Starting live data sync for project:', project.id);
        await integrationService.startLiveSync(project.id, selectedHub.id, {
          syncInterval: 30000 // 30 seconds
        });
        console.log('✅ Live data sync started');
      } catch (syncError) {
        console.error('❌ Error starting live sync:', syncError);
        // Don't fail the project selection if live sync fails
      }
        
    } catch (err) {
      console.error('❌ Error selecting project:', err);
      setError(err.message || 'Failed to select project');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate OAuth URL for manual token generation
  const [oauthUrl, setOAuthUrl] = useState(null);
  const [oauthUrlGenerated, setOAuthUrlGenerated] = useState(false);
  const oauthUrlGenerationRef = useRef(false);

  // Generate OAuth URL only once when component mounts
  useEffect(() => {
    if (!oauthUrlGenerated && !oauthUrl && !oauthUrlGenerationRef.current) {
      oauthUrlGenerationRef.current = true;
      console.log('🔄 Generating OAuth URL...');
      console.log('🔄 Calling AccService.getAuthUrl()...');
      const url = AccService.getAuthUrl();
      console.log('🔄 getAuthUrl() returned:', url);
      if (!url) {
        console.warn('⚠️ OAuth already in progress, URL not available');
        setError('OAuth authentication is already in progress. Please wait for it to complete or clear the OAuth state.');
      } else {
        console.log('✅ OAuth URL generated successfully');
        setOAuthUrl(url);
      }
      setOAuthUrlGenerated(true);
    }
  }, [oauthUrlGenerated, oauthUrl]);

  // Function to regenerate OAuth URL
  const regenerateOAuthUrl = () => {
    console.log('🔄 Regenerating OAuth URL...');
    oauthUrlGenerationRef.current = false;
    setOAuthUrlGenerated(false);
    setOAuthUrl(null);
    setError(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
        {/* Left Side - ZOYANTRA Logo */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            {/* ZOYANTRA Logo */}
            <div className="mx-auto w-32 h-32 mb-8 relative">
              <img 
                src="/zoyantra-logo.svg" 
                alt="ZOYANTRA Logo" 
                className="w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Fallback to a simple text logo if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              {/* Fallback text logo */}
              <div className="hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl">
                <div className="text-center">
                  <div className="text-5xl font-black text-white mb-1" style={{
                    fontFamily: "'Orbitron', 'Exo 2', 'Rajdhani', sans-serif",
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                  }}>Z</div>
                  <div className="text-xs font-bold text-white/80 tracking-widest" style={{
                    fontFamily: "'Orbitron', 'Exo 2', 'Rajdhani', sans-serif"
                  }}>OYANTRA</div>
            </div>
              </div>
            </div>
            
            {/* ZOYANTRA Text */}
            <h1 className="text-6xl font-black text-white mb-4 tracking-wider" style={{
              fontFamily: "'Orbitron', 'Exo 2', 'Rajdhani', 'Titillium Web', 'Roboto Condensed', sans-serif",
              textShadow: '0 0 20px rgba(147, 51, 234, 0.5), 0 0 40px rgba(147, 51, 234, 0.3)',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ZOYANTRA
            </h1>
            <p className="text-xl text-purple-200 font-light tracking-wide" style={{
              fontFamily: "'Exo 2', 'Titillium Web', 'Roboto Condensed', sans-serif",
              textShadow: '0 0 10px rgba(147, 51, 234, 0.3)'
            }}>
              Construction Cloud Platform
            </p>
            
            {/* Decorative Line Separator */}
            <div className="mt-8 mb-8">
              <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full"></div>
              <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full mt-2"></div>
            </div>
          </div>
          </div>

        {/* Right Side - Sign In Options */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                Welcome Back
              </h2>

              {/* Loading States */}
          {isLoading && (
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                    <Loader2 className="h-5 w-5 text-blue-300 animate-spin mr-3" />
                <div>
                      <p className="text-sm text-blue-100 font-medium">
                        Validating authentication...
                  </p>
                      <p className="text-xs text-blue-200 mt-1">
                    Testing stored credentials...
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-300 mr-3" />
                <div>
                      <p className="text-sm text-red-100 font-medium">
                        Authentication Error
                  </p>
                      <p className="text-xs text-red-200 mt-1">
                    {error}
                  </p>
                </div>
                </div>
                {error && error.includes('OAuth authentication is already in progress') && (
                  <button
                    onClick={() => {
                      AccService.clearOAuthState();
                      setError(null);
                      window.location.reload();
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Clear OAuth State
                  </button>
                )}
              </div>
            </div>
          )}


          
              {/* Sign In Options */}
              <div className="space-y-6">
                {/* Autodesk OAuth Sign In */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Sign In with Autodesk</h3>
                  <p className="text-sm text-purple-200">
                    Use your Autodesk account to access the platform
                  </p>
                  
                  <a
                    href={oauthUrl}
                    disabled={!oauthUrl}
                    className={`w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white transition-all duration-300 ${
                      !oauthUrl 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {!oauthUrl ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                        Generating OAuth URL...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-5 w-5 mr-3" />
                    Sign In with Autodesk
                      </>
                    )}
                  </a>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-white/60">or</span>
                  </div>
                </div>

                {/* Manual Token Entry */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Manual Token Entry</h3>
                  <p className="text-sm text-purple-200">
                    Enter your 3-legged token directly
                  </p>
                  
                  <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Three-Legged Token
                      </label>
                    <input
                        type="password"
                        value={credentials.threeLegToken}
                        onChange={(e) => setCredentials(prev => ({ ...prev, threeLegToken: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                        placeholder="Enter your 3-legged token"
                      />
            </div>

            <button
              onClick={handleLogin}
                      disabled={!credentials.threeLegToken || isLoading}
                      className={`w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-xl transition-all duration-300 ${
                        !credentials.threeLegToken || isLoading
                          ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg hover:shadow-xl transform hover:scale-105'
                      }`}
            >
              {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          Validating Token...
                        </>
              ) : (
                <>
                          <Key className="h-5 w-5 mr-3" />
                          Sign In with Token
                </>
              )}
            </button>

            {/* OAuth Button */}
            <button
              onClick={() => {
                console.log('🔐 Starting OAuth flow...');
                const authUrl = AccService.getAuthUrl();
                if (authUrl) {
                  console.log('🔐 Redirecting to OAuth:', authUrl);
                  window.location.href = authUrl;
                } else {
                  console.warn('⚠️ OAuth already in progress');
                  alert('OAuth authentication is already in progress. Please wait for it to complete.');
                }
              }}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-6 py-4 border border-white/20 text-base font-medium rounded-xl text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 mt-3"
            >
              <Key className="h-5 w-5 mr-3" />
              Get 3-Legged Token via OAuth
            </button>
                  </div>
                </div>

                {/* Clear Authentication Button */}
                <div className="pt-4">
                  <button
                    onClick={clearAuthentication}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-white/20 text-sm font-medium rounded-xl text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Clear Authentication
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100 relative">

      {/* Main Content */}
      <main className="flex flex-1">
        {/* Vertical Tab Navigation */}
        <VerticalTabNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          selectedProject={selectedProject}
          selectedHub={selectedHub}
          onLogout={handleLogout}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 p-6 bg-gradient-to-br from-purple-50/50 via-indigo-50/30 to-purple-100/50">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Selected Tab Header - removed per request */}
          {false && activeTab && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {activeTab === 'plan-workahead' && <Target className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'timesheets' && <Clock className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'earned-value' && <TrendingUp className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'gantt-chart' && <GanttChart className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'expense-tracking' && <DollarSign className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'crew-management' && <Users className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'resource-management' && <UserCog className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'team-load-balance' && <Users className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'admin' && <Settings className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'token-usage' && <Coins className="h-5 w-5 text-amber-600" />}
                    {activeTab === 'calendar' && <Calendar className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'permission' && <Shield className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'enhanced-gantt-chart' && <GanttChart className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'integration-d365' && <Building2 className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'sharepoint-integration' && <Building2 className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'cost-management' && <PieChart className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'budget-debug' && <Bug className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'plc' && <Activity className="h-5 w-5 text-blue-600" />}
                    {activeTab === 'reminder' && <Bell className="h-5 w-5 text-blue-600" />}
                    {!['plan-workahead', 'timesheets', 'earned-value', 'gantt-chart', 'expense-tracking', 'crew-management', 'resource-management', 'team-load-balance', 'admin', 'calendar', 'permission', 'enhanced-gantt-chart', 'integration-d365', 'sharepoint-integration', 'cost-management', 'budget-debug', 'plc', 'reminder'].includes(activeTab) && <FileText className="h-5 w-5 text-blue-600" />}
        </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {activeTab === 'plan-workahead' && 'Planner'}
                      {activeTab === 'tasks' && 'Tasks'}
                      {activeTab === 'timesheets' && 'Timesheets'}
                      {activeTab === 'earned-value' && 'Earned Value Management'}
                    {activeTab === 'gantt-chart' && 'Gantt Chart'}
                    {activeTab === 'msp-gantt' && 'MSP Gantt'}
                      {activeTab === 'expense-tracking' && 'Expense Tracking'}
                      {activeTab === 'crew-management' && 'Crew Management'}
                      {activeTab === 'resource-management' && 'Resource Management'}
                      {activeTab === 'team-load-balance' && 'Team Load Balance'}
                      {activeTab === 'admin' && 'Administration'}
                      {activeTab === 'token-usage' && 'Token Usage & Analytics'}
                      {activeTab === 'calendar' && 'Calendar'}
                      {activeTab === 'permission' && 'Permissions'}
                      {activeTab === 'enhanced-gantt-chart' && 'Enhanced Gantt Chart'}
                      {activeTab === 'integration-d365' && 'D365 Integration'}
                      {activeTab === 'sharepoint-integration' && 'SharePoint Integration'}
                      {activeTab === 'cost-management' && 'Cost Management'}
                      {activeTab === 'budget-debug' && 'Budget Debug Tool'}
                    {activeTab === 'plc' && 'PLC - Project Lifecycle Control'}
                    {activeTab === 'reminder' && 'Reminder'}
                    {activeTab === 'docusign' && 'DocuSign'}
                      {!['plan-workahead', 'timesheets', 'earned-value', 'gantt-chart', 'expense-tracking', 'crew-management', 'resource-management', 'team-load-balance', 'admin', 'calendar', 'permission', 'enhanced-gantt-chart', 'integration-d365', 'sharepoint-integration', 'cost-management', 'budget-debug', 'plc', 'reminder', 'docusign'].includes(activeTab) && 'Tab'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {activeTab === 'plan-workahead' && 'Create and manage project plans with budgets, dates, and status'}
                      {activeTab === 'timesheets' && 'Time tracking and management with real project users'}
                      {activeTab === 'earned-value' && 'Earned value management and analysis with project integration'}
                      {activeTab === 'gantt-chart' && 'Project timeline and scheduling with team collaboration'}
                      {activeTab === 'msp-gantt' && 'Load and visualize Microsoft Project (XML)'}
                      {activeTab === 'expense-tracking' && 'Financial tracking and expenses with budget integration'}
                      {activeTab === 'crew-management' && 'Team and crew coordination with project members'}
                      {activeTab === 'resource-management' && 'Resource allocation and planning with user management'}
                      {activeTab === 'team-load-balance' && 'Team workload balancing with project data'}
                      {activeTab === 'admin' && 'Administrative settings and configuration for project management'}
                      {activeTab === 'token-usage' && 'Monitor and analyze Autodesk Token Flex consumption'}
                      {activeTab === 'calendar' && 'Work schedules and holidays with project timeline'}
                      {activeTab === 'permission' && 'User permissions and access control for project security'}
                      {activeTab === 'enhanced-gantt-chart' && ''}
                      {activeTab === 'integration-d365' && ''}
                      {activeTab === 'sharepoint-integration' && ''}
                      {activeTab === 'cost-management' && ''}
                      {activeTab === 'budget-debug' && 'Debug and test budget API calls for ACC projects with detailed logging'}
                      {activeTab === 'plc' && 'Project lifecycle management with phases, gates, and milestones using robust budget data'}
                      {activeTab === 'reminder' && 'Track and manage project reminders, issues, RFIs, reviews, and payments with due date monitoring'}
                      {activeTab === 'docusign' && 'DocuSign eSignature integration for document signing workflows'}
                      {!['plan-workahead', 'timesheets', 'earned-value', 'gantt-chart', 'expense-tracking', 'crew-management', 'resource-management', 'team-load-balance', 'admin', 'calendar', 'permission', 'enhanced-gantt-chart', 'integration-d365', 'sharepoint-integration', 'cost-management', 'budget-debug', 'plc', 'reminder', 'docusign'].includes(activeTab) && ''}
                    </p>
                  </div>
                  </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  </div>
                  </div>
                  </div>
          )}

          {/* Project Selection */}
            <div className="mb-6">
            <ProjectSelector 
                selectedHub={selectedHub}
              selectedProject={selectedProject}
              projects={projects}
                onHubSelect={handleHubSelect}
              onProjectSelect={handleProjectSelect}
                credentials={credentials}
              />
            </div>

          {/* Tab Content */}
          {activeTab === 'plan-workahead' ? (
            <PlanWorkaheadTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              credentials={credentials}
            />
          ) : activeTab === 'timesheets' ? (
            <TimesheetTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'earned-value' ? (
            <EarnedValueTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'gantt-chart' ? (
            <EnhancedGanttChartTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'msp-gantt' ? (
            <MspGanttTab selectedProject={selectedProject} selectedHub={selectedHub} />
          ) : activeTab === 'tasks' ? (
            <Tasks 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'expense-tracking' ? (
            <ExpenseTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
              refreshArchivedTimesheets={refreshArchivedTimesheets}
              refreshTrigger={refreshTrigger}
            />
          ) : activeTab === 'crew-management' ? (
            <CrewManagementTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'calendar' ? (
            <CalendarTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'resource-management' ? (
            <ResourceManagementTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'team-load-balance' ? (
            <TeamLoadBalanceTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'admin' ? (
            <AdminTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'token-usage' ? (
            <TokenUsageTab 
              credentials={credentials}
            />
          ) : activeTab === 'integration-d365' ? (
            <IntegrationD365Tab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'sharepoint-integration' ? (
            <SharePointIntegrationTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'cost-management' ? (
            <CostManagementTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              archivedExpenses={archivedExpenses}
              credentials={credentials}
            />
          ) : activeTab === 'docusign' ? (
            <DocuSignTab selectedProject={selectedProject} selectedHub={selectedHub} credentials={credentials} />
          ) : activeTab === 'budget-debug' ? (
            <BudgetDebugTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              credentials={credentials}
            />
          ) : activeTab === 'plc' ? (
            <PLC 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
            />
          ) : activeTab === 'reminder' ? (
            <ReminderTab
              selectedProject={selectedProject}
              selectedHub={selectedHub}
            />
        ) : activeTab === 'simple-review-creation' ? (
            <PLC 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default App;