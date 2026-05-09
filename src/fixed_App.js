import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  LogOut, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  FileText,
  Key,
  AlertTriangle,
  ImageIcon,
  BarChart3,
  Target,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import ZLogo from './components/ZLogo';
import AccService from './services/AccService';
import ProjectSelector from './components/ProjectSelector';
import TimesheetTab from './components/TimesheetTab';
import PlanWorkaheadTab from './components/PlanWorkaheadTab';
import SiteProgressTab from './components/SiteProgressTab';
import EarnedValueTab from './components/EarnedValueTab';
import ExpenseTab from './components/ExpenseTab';
import CrewManagementTab from './components/CrewManagementTab';
import CalendarTab from './components/CalendarTab';
import ResourceManagementTab from './components/ResourceManagementTab';

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
  const [activeTab, setActiveTab] = useState('plan-workahead');
  const [credentials, setCredentials] = useState({
    accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
    clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
    clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa',
    threeLegToken: '',
    refreshToken: '',
    twoLeggedToken: ''
  });

  // Clear all authentication data
  const clearAuthentication = () => {
    console.log('🧹 Clearing all authentication data...');
    localStorage.removeItem('zoyantra_credentials');
    setCredentials({
      accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
      clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
      clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa',
      threeLegToken: '',
      refreshToken: '',
      twoLeggedToken: ''
    });
    setIsAuthenticated(false);
    setSelectedProject(null);
    setProjects([]);
    setSelectedHub(null);
  };

  // Test if stored token is still valid
  const testTokenValidity = async (credentials) => {
    try {
      console.log('🔍 Testing token validity...');
      setIsLoading(true);
      AccService.initialize(credentials);
      const hubs = await AccService.getHubs();
      if (hubs && hubs.length > 0) {
        setIsAuthenticated(true);
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

  // Load stored credentials on app startup
  useEffect(() => {
    const loadStoredCredentials = () => {
      try {
        const stored = localStorage.getItem('zoyantra_credentials');
        if (stored) {
          const storedCredentials = JSON.parse(stored);
          console.log('📦 Loading stored credentials:', storedCredentials);
          
          // Check if we have a valid token and it's not expired
          if (storedCredentials.threeLegToken && storedCredentials.threeLegToken.trim() !== '') {
            // Check if token is expired
            const now = Date.now();
            const tokenExpiry = storedCredentials.tokenExpiry || 0;
            
            if (tokenExpiry > now) {
            setCredentials(storedCredentials);
            AccService.initialize(storedCredentials);
              
              // Test the token by making a simple API call
              testTokenValidity(storedCredentials);
            } else {
              console.log('⚠️ Token has expired, requiring re-authentication');
              console.log('⏰ Token expired at:', new Date(tokenExpiry).toISOString());
              setIsAuthenticated(false);
              // Clear expired credentials
              localStorage.removeItem('zoyantra_credentials');
            }
          } else {
            console.log('⚠️ No valid token found in stored credentials');
            setIsAuthenticated(false);
          }
        } else {
          console.log('📦 No stored credentials found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error loading stored credentials:', error);
        setIsAuthenticated(false);
      }
    };

    loadStoredCredentials();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔍 Checking for OAuth callback...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (error) {
        console.error('❌ OAuth Error:', error, errorDescription);
        setError(`OAuth Error: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
        return;
      }
      
      if (code) {
        console.log('✅ OAuth code received, exchanging for token...');
        setIsLoading(true);
        setError(null);
        
        try {
          // Initialize service with credentials
          AccService.initialize(credentials);
          
          // Exchange code for token
          const tokenData = await AccService.exchangeCodeForToken(code);
          
          // Log the token data for debugging
          console.log('🔑 TOKEN DATA RECEIVED:');
          console.log('Access Token:', tokenData.access_token ? 'Present' : 'Missing');
          console.log('Refresh Token:', tokenData.refresh_token ? 'Present' : 'Missing');
          console.log('Expires In:', tokenData.expires_in, 'seconds');
          console.log('Token Expiry Time:', new Date(Date.now() + tokenData.expires_in * 1000).toISOString());
          
          if (!tokenData.refresh_token) {
            console.warn('⚠️ WARNING: No refresh token received! This means the token will expire in ~1 hour and cannot be refreshed.');
            console.warn('⚠️ Make sure your OAuth scopes include "offline_access"');
          } else {
            console.log('✅ Refresh token received - automatic token refresh is enabled');
          }
          
          // Update credentials with the new tokens
          const updatedCredentials = {
            ...credentials,
            threeLegToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            twoLeggedToken: tokenData.twoLeggedToken || '',
            tokenExpiry: Date.now() + (tokenData.expires_in * 1000)
          };
          
          // Save tokens to localStorage for persistence
          localStorage.setItem('zoyantra_credentials', JSON.stringify(updatedCredentials));
          
          setCredentials(updatedCredentials);
          
          // Re-initialize service with new token
          AccService.initialize(updatedCredentials);
          
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
          
          // Show success message
          setError(null);
          console.log('🎉 Sign-in complete!');
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
        } catch (err) {
          setError(`Failed to exchange code for token: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    handleOAuthCallback();
  }, [credentials]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we already have a valid 3-legged token
      if (credentials.threeLegToken && credentials.refreshToken) {
        console.log('🔑 Using existing 3-legged token...');
        // Initialize ACC service with existing credentials
        AccService.initialize(credentials);
        
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
        return;
      }
      
      // If no token, redirect to OAuth
      console.log('🔑 No existing token, redirecting to OAuth...');
      const authUrl = AccService.getAuthUrl();
      console.log('🔑 OAuth URL:', authUrl);
      window.location.href = authUrl;
      
    } catch (err) {
      // Handle authentication errors specifically
      if (err.message.includes('invalid_grant') || err.message.includes('expired')) {
        console.log('🔄 Token expired, redirecting to OAuth...');
        const authUrl = AccService.getAuthUrl();
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
      
      // Filter out Component Library projects
      const filteredProjects = projectsData.filter(project => 
        !project.name?.toLowerCase().includes('component library')
      );
      
      console.log(`📊 Loaded ${projectsData.length} projects, filtered to ${filteredProjects.length}`);
      setProjects(filteredProjects);
    } catch (err) {
      setError(err.message || 'Failed to load projects from selected hub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedProject(null);
    setProjects([]);
    setSelectedHub(null);
    setMembers([]);
    setBudgets([]);
    setError(null);
    
    // Clear all stored credentials and tokens
    localStorage.removeItem('zoyantra_credentials');
    localStorage.removeItem('accCredentials');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenTimestamp');
  };

  const handleProjectSelect = async (project) => {
    try {
      console.log('🔍 Project selected:', project);
      setSelectedProject(project);
      setIsLoading(true);
      setError(null);
      
      // Load project members and budgets when project is selected
      try {
        console.log('🔄 Loading project data for:', project.name);
        
        // Load project members using Construction Admin API
        // Pass both project and hub for proper region handling (US/EMEA/APAC)
        const membersData = await AccService.getProjectUsersAdmin(project.id, selectedHub?.id);
        console.log('👥 Loaded project members:', membersData.length);
        setMembers(membersData);
        
        // Load budgets for the project with revised budget data
        const budgetsData = await AccService.getBudgets(project.id, {
          include: ['revised', 'amount', 'totalAmount', 'originalAmount', 'unitPrice', 'inputQuantity', 'quantity']
        });
        console.log('💰 Loaded project budgets:', budgetsData.length);
        console.log('💰 Budgets data:', budgetsData);
        setBudgets(budgetsData);

        // Load archived timesheets for the project
        try {
          const stored = localStorage.getItem('cewa_timesheets_archived');
          console.log('🔍 Raw archived timesheets data:', stored);
          if (stored) {
            const allArchivedTimesheets = JSON.parse(stored);
            console.log('📦 All archived timesheets:', allArchivedTimesheets.length, allArchivedTimesheets);
            const projectArchivedTimesheets = allArchivedTimesheets.filter(t => t.projectId === project.id || t.selectedProjectId === project.id);
            console.log('📦 Project archived timesheets for', project.name, ':', projectArchivedTimesheets.length, projectArchivedTimesheets);
            setArchivedTimesheets(projectArchivedTimesheets);
          } else {
            console.log('📦 No archived timesheets found in localStorage');
            setArchivedTimesheets([]);
          }
        } catch (archivedError) {
          console.error('❌ Error loading archived timesheets:', archivedError);
          setArchivedTimesheets([]);
        }
        
      } catch (projectDataError) {
        console.error('❌ Error loading project data:', projectDataError);
        // Don't set error for project data loading failures, just log them
        // This allows the project selection to succeed even if some data fails to load
        console.log('⚠️ Continuing with project selection despite data loading issues');
      }
      
    } catch (err) {
      console.error('❌ Error selecting project:', err);
      setError(err.message || 'Failed to select project');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate OAuth URL for manual token generation
  const oauthUrl = React.useMemo(() => {
    AccService.initialize(credentials);
    return AccService.getAuthUrl();
  }, [credentials]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 mb-4 relative">
              {/* Z Logo */}
              <div className="w-full h-full bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 rounded-lg transform rotate-12 shadow-lg">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-black text-white drop-shadow-lg">Z</span>
                </div>
              </div>
              {/* White outline effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 rounded-lg transform rotate-12 shadow-lg border-2 border-white"></div>
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <span className="text-4xl font-black text-white drop-shadow-lg">Z</span>
              </div>
            </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              ZOYANTRA
              <br />
              <span className="text-2xl text-pink-600">Construction Cloud</span>
            </h2>
          </div>

          {isLoading && (
            <div className="bg-pink-50 border border-pink-200 rounded-md p-4">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-pink-400 animate-spin mr-3" />
                <div>
                  <p className="text-sm text-pink-800">
                    <strong>Validating authentication...</strong>
                  </p>
                  <p className="text-xs text-pink-600 mt-1">
                    Testing stored credentials...
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                <div>
                  <p className="text-sm text-red-800">
                    <strong>Authentication Error</strong>
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {error}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Please click "Clear Authentication" and try signing in again.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Authentication Required</strong>
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Your previous authentication has expired or is invalid. Please clear authentication and sign in again to access your projects and data.
                </p>
              </div>
            </div>
          </div>

          {isLoading && window.location.search.includes('code=') && (
            <div className="bg-pink-50 border border-pink-200 rounded-md p-4">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-pink-400 animate-spin mr-3" />
                <div>
                  <p className="text-sm text-pink-800">
                    <strong>Processing OAuth callback...</strong>
                  </p>
                  <p className="text-xs text-pink-600 mt-1">
                    Exchanging authorization code for access token...
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sign In</h3>
            
            <div className="text-center">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Sign In to Autodesk
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border rounded-lg p-4">
                  <h5 className="text-md font-medium text-gray-900 mb-2">
                    Sign In with Autodesk
                  </h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button below to authenticate with Autodesk. You will be redirected to Autodesk's login page, and then back to this app once authenticated.
                  </p>
                  <div className="space-y-3">
                  <a
                    href={oauthUrl}
                    disabled={!oauthUrl}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
                      !oauthUrl ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Sign In with Autodesk
                  </a>
                    <button
                      onClick={clearAuthentication}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Clear Authentication
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h5 className="text-md font-medium text-gray-900 mb-2">
                    Enter Token Manually
                  </h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Paste your access token from Postman or Autodesk API.
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="Enter your access token here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      onChange={(e) => {
                        const token = e.target.value.trim();
                        if (token) {
                          setCredentials(prev => ({
                            ...prev,
                            threeLegToken: token
                          }));
                          AccService.initialize({
                            ...credentials,
                            threeLegToken: token
                          });
                          console.log('✅ Access token set manually');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading || !credentials.threeLegToken}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Sign In with 3-Leg Token
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative">
      {/* Header */}
      <header className="bg-white shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                ZOYANTRA
                <br />
                <span className="text-xl text-blue-600">Construction Cloud</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                3-Leg Token
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
      <button
                  onClick={() => setActiveTab('plan-workahead')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'plan-workahead'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Plan Workahead
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('timesheets')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'timesheets'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Timesheets
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('site-progress')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'site-progress'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Site Progress
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('earned-value')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'earned-value'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Earned Value
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('expense-tracking')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'expense-tracking'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Expense Tracking
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('crew-management')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'crew-management'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Crew Management
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'calendar'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('resource-management')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'resource-management'
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Resource Management
                  </div>
                </button>
              </nav>
            </div>
          </div>

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
            />
          ) : activeTab === 'timesheets' ? (
            <TimesheetTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              credentials={credentials}
            />
          ) : activeTab === 'site-progress' ? (
            <SiteProgressTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
            />
          ) : activeTab === 'earned-value' ? (
            <EarnedValueTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
            />
          ) : activeTab === 'expense-tracking' ? (
            <ExpenseTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
              archivedTimesheets={archivedTimesheets}
              credentials={credentials}
            />
          ) : activeTab === 'crew-management' ? (
            <CrewManagementTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
            />
          ) : activeTab === 'calendar' ? (
            <CalendarTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
            />
          ) : activeTab === 'resource-management' ? (
            <ResourceManagementTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              projects={projects}
              members={members}
              budgets={budgets}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default App;