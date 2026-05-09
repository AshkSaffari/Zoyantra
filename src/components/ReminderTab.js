import React, { useState, useEffect, useRef } from 'react';
import TimezoneSelect from 'react-timezone-select';
import { 
  Bell, 
  AlertTriangle, 
  FileText, 
  Eye, 
  Calendar,
  Clock,
  User,
  RefreshCw,
  XCircle,
  Send,
  MapPin,
  Hash,
  Circle,
  DollarSign,
  Mail,
  ExternalLink,
  AlertCircle,
  // Modern UI Icons
  Sparkles,
  Zap,
  Shield,
  Star,
  Target,
  Flame,
  Rocket,
  Crown,
  Award,
  Trophy,
  Gem,
  Heart,
  Sun,
  Moon,
  Cloud,
  Wind,
  Droplets,
  Leaf,
  TreePine,
  Mountain,
  Waves,
  Fish,
  Bird,
  Bug,
  Flower,
  Palette,
  Paintbrush,
  Brush,
  Pen,
  Pencil,
  Highlighter,
  Eraser,
  Scissors,
  Paperclip,
  StickyNote,
  Bookmark,
  Tag,
  AtSign,
  Percent,
  Euro,
  PoundSterling,
  Yen,
  Rupee,
  Bitcoin,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  PiggyBank,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowDownLeft,
  Move,
  RotateCcw,
  RotateCw,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Stop,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Pentagon,
  Diamond,
  RectangleHorizontal,
  RectangleVertical,
  Ellipsis,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Minus,
  X,
  Check,
  Loader2,
  Loader,
  Spinner,
  Undo,
  Redo,
  Save,
  Download,
  Upload,
  Share,
  Copy,
  Cut,
  Paste,
  Trash2,
  Archive,
  Folder,
  FolderOpen,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileCode,
  FilePdf,
  FileZip,
  FileX,
  FileCheck,
  FileMinus,
  FilePlus,
  FileEdit,
  FileSearch,
  FileSlash,
  FileQuestion,
  FileWarning,
  FileUp,
  FileDown,
  FileLeft,
  FileRight,
  FileBarChart,
  FilePieChart,
  FileLineChart,
  FileAreaChart,
  FileScatterChart,
  FileRadarChart,
  FileGaugeChart,
  FileFunnelChart,
  FileSankeyChart,
  FileTreemapChart,
  FileSunburstChart,
  FileCandlestickChart,
  FileHeatmapChart,
  FileWaterfallChart,
  FileBoxplotChart,
  FileViolinChart,
  FileHistogramChart,
  FileDensityChart,
  FileRidgeChart,
  FileStreamChart,
  FileNetworkChart,
  // Additional modern icons
  Settings,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react';
import AccService from '../services/AccService_old';
import AccServiceNew from '../services/AccService';
import FormsTab from './FormsTab';

// ProjectUsersTab component
const ProjectUsersTab = ({ 
  selectedProject, 
  selectedHub, 
  userIdToName, 
  userIdToEmail, 
  uidToEmailMap, 
  onLoadUsers,
  reminders, // Add reminders from parent
  forms // Add forms from parent
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (selectedProject?.id && Object.keys(userIdToName).length > 0) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, Object.keys(userIdToName).length]);

  // Remove the problematic useEffect that causes infinite loop
  // The user mappings will be updated when loadUsers() is called

  const loadUsers = async () => {
    // Prevent multiple simultaneous loads
    if (isLoading) {
      console.log('⚠️ Load users already in progress, skipping...');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔍 Loading project users...');
      
      // DON'T call parent - just use the props that were already loaded
      // Parent already loaded users, we just need to convert the mappings
      console.log('🔍 Using existing user mappings from props');
      
      console.log('🔍 Current user mappings:', {
        userIdToName: Object.keys(userIdToName).length,
        userIdToEmail: Object.keys(userIdToEmail).length,
        uidToEmailMap: Object.keys(uidToEmailMap).length
      });
      
      // Convert user mappings to array format for easier rendering
      // First try to get users from userIdToName (project users with Autodesk IDs)
      let usersArray = Object.keys(userIdToName).map(userId => {
        const nameData = userIdToName[userId];
        const name = typeof nameData === 'string' ? nameData : (nameData?.name || 'Unknown User');
        const email = userIdToEmail[userId] || 'No email available';
        
        // Find UID by matching email in uidToEmailMap
        const uid = Object.keys(uidToEmailMap).find(uid => 
          uidToEmailMap[uid]?.toLowerCase() === email.toLowerCase()
        ) || 'N/A';
        
        return {
        id: userId,
          name: name,
          email: email,
          autodeskId: userId,
          uid: uid
        };
      });

      // If no project users found, use HQ API users (UID-based)
      if (usersArray.length === 0 && Object.keys(uidToEmailMap).length > 0) {
        console.log('🔍 No project users found, using HQ API users instead...');
        usersArray = Object.keys(uidToEmailMap).map(uid => {
          const email = uidToEmailMap[uid];
          // Extract name from email (before @)
          const name = email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          return {
            id: uid, // Use UID as ID
            name: name,
            email: email,
            autodeskId: 'N/A', // No Autodesk ID available
            uid: uid
          };
        });
        console.log(`✅ Created ${usersArray.length} users from HQ API data`);
      }
      
      setUsers(usersArray);
      console.log(`✅ Loaded ${usersArray.length} users (from props, no API call)`);
      
      // If no users found, show a message instead of retrying
      if (usersArray.length === 0) {
        console.log('⚠️ No users found - this is likely due to authentication issues');
        console.log('💡 Please re-authenticate to load user data');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate due items for each user using actual data from parent
  const getUserDueItems = (userEmail) => {
    const userDueItems = { issues: 0, rfis: 0, reviews: 0, forms: 0, meetings: 0, total: 0 };
    const emailLower = userEmail.toLowerCase().trim();
    
    // Check reminders (Issues, RFIs, Reviews)
    (reminders || []).forEach(reminder => {
      const reminderEmail = reminder.assignedToEmail?.toLowerCase().trim();
      
      // Direct email match
      if (reminderEmail === emailLower) {
        const type = reminder.itemType || 'issues';
        userDueItems[type]++;
        userDueItems.total++;
      }
    });
    
    // Check forms separately
    (forms || []).forEach(form => {
      const formEmail = form.assignedToEmail?.toLowerCase().trim();
      
      // Direct email match for forms
      if (formEmail === emailLower) {
        userDueItems.forms++;
        userDueItems.total++;
      }
    });
    
    return userDueItems;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading project users...</span>
      </div>
    );
  }

  // Calculate summary statistics
  const totalUsers = users.length;
  const usersWithDueItems = users.filter(user => getUserDueItems(user.email).total > 0).length;
  const totalDueItems = users.reduce((sum, user) => sum + getUserDueItems(user.email).total, 0);
  const totalIssues = users.reduce((sum, user) => sum + getUserDueItems(user.email).issues, 0);
  const totalRFIs = users.reduce((sum, user) => sum + getUserDueItems(user.email).rfis, 0);
  const totalReviews = users.reduce((sum, user) => sum + getUserDueItems(user.email).reviews, 0);
  const totalForms = users.reduce((sum, user) => sum + getUserDueItems(user.email).forms, 0);
  const totalMeetings = users.reduce((sum, user) => sum + getUserDueItems(user.email).meetings, 0);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Project Users Dashboard</h2>
              <p className="text-blue-100">Manage and monitor project team members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 backdrop-blur-sm"
          >
              <RefreshCw className="w-4 h-4" />
              Refresh Users
          </button>
            <div className="text-sm text-white/80">
              {users.length} users loaded
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Users with Due Items Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Users with Due Items</p>
              <p className="text-3xl font-bold">{usersWithDueItems}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Due Items Card */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Due Items</p>
              <p className="text-3xl font-bold">{totalDueItems}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">
                {totalUsers > 0 ? Math.round(((totalUsers - usersWithDueItems) / totalUsers) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Circle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Item Type Breakdown */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5 text-blue-600" />
          Due Items Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{totalIssues}</p>
            <p className="text-sm text-red-700">Issues</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{totalRFIs}</p>
            <p className="text-sm text-blue-700">RFIs</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <Eye className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{totalReviews}</p>
            <p className="text-sm text-green-700">Reviews</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{totalForms}</p>
            <p className="text-sm text-purple-700">Forms</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Calendar className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">{totalMeetings}</p>
            <p className="text-sm text-amber-700">Meetings</p>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
          <p className="text-gray-600 mb-2">This is likely due to authentication issues.</p>
          <p className="text-sm text-gray-500 mb-4">Please re-authenticate with Autodesk to load user data.</p>
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Load Users
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user, index) => {
                  const userDues = getUserDueItems(user.email);
            const colors = [
              'from-blue-500 to-blue-600',
              'from-purple-500 to-purple-600', 
              'from-green-500 to-green-600',
              'from-orange-500 to-orange-600',
              'from-pink-500 to-pink-600',
              'from-indigo-500 to-indigo-600',
              'from-teal-500 to-teal-600',
              'from-red-500 to-red-600'
            ];
            const bgColor = colors[index % colors.length];
                  
                  return (
              <div key={user.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200">
                {/* User Header */}
                <div className={`bg-gradient-to-r ${bgColor} p-6 text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                            {user.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{user.name || 'N/A'}</h3>
                      <p className="text-white/80 text-sm">{user.email}</p>
                    </div>
                            {userDues.total > 0 && (
                      <div className="bg-white/20 rounded-full px-3 py-1">
                        <span className="text-sm font-semibold">{userDues.total} due</span>
                      </div>
                            )}
                          </div>
                        </div>

                {/* User Details */}
                <div className="p-6">
                  <div className="space-y-3">
                    {user.autodeskId !== 'N/A' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Hash className="w-4 h-4" />
                        <span className="font-mono">{user.autodeskId}</span>
                      </div>
                    )}
                    {user.uid && user.uid !== 'N/A' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="font-mono text-xs">{user.uid}</span>
                      </div>
                    )}
                  </div>

                  {/* Due Items */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Due Items</h4>
                        {userDues.total > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                            {userDues.issues > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">{userDues.issues} Issues</span>
                          </div>
                            )}
                            {userDues.rfis > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">{userDues.rfis} RFIs</span>
                          </div>
                            )}
                            {userDues.reviews > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                            <Eye className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">{userDues.reviews} Reviews</span>
                          </div>
                            )}
                            {userDues.forms > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-700">{userDues.forms} Forms</span>
                          </div>
                            )}
                            {userDues.meetings > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">{userDues.meetings} Meetings</span>
                          </div>
                            )}
                          </div>
                        ) : (
                      <div className="text-center py-4 text-gray-500">
                        <Circle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="text-sm">All caught up!</p>
                      </div>
                        )}
                  </div>
                </div>
              </div>
                  );
                })}
        </div>
      )}
    </div>
  );
};

const ReminderTab = ({ selectedProject, selectedHub }) => {
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [activeSection, setActiveSection] = useState('account-users');
  const [reminders, setReminders] = useState([]);
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userIdToName, setUserIdToName] = useState({});
  const [userIdToEmail, setUserIdToEmail] = useState({});
  const [uidToEmailMap, setUidToEmailMap] = useState({});
  const [uidToNameMap, setUidToNameMap] = useState({});
  const [outlookConnected, setOutlookConnected] = useState(false);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  const reminderTimeoutRef = useRef(null);
  
  // Helper function to get the correct ACC web URL based on hub region
  const getAccWebUrl = () => {
    try {
      // Get region from hub or AccService
      let region = 'US'; // Default to US
      
      if (selectedHub) {
        // Try to get region from hub attributes
        const hubRegion = selectedHub.attributes?.region || 
                         selectedHub.attributes?.extension?.data?.region ||
                         selectedHub.region;
        
        if (hubRegion) {
          region = hubRegion.toUpperCase();
        } else {
          // Use AccService to get region info
          const regionInfo = AccService.getHubRegionInfo(selectedHub);
          region = regionInfo.region || 'US';
        }
      } else if (selectedProject?.hubId) {
        // Try to detect region from project's hub ID
        const hubId = selectedProject.hubId;
        const cleanHubId = hubId.toLowerCase();
        
        if (cleanHubId.includes('apac') || cleanHubId.includes('asia') || 
            cleanHubId.includes('australia') || cleanHubId.includes('au') ||
            cleanHubId.includes('sydney') || cleanHubId.includes('melbourne') ||
            cleanHubId.includes('singapore')) {
          region = 'AUS';
        } else if (cleanHubId.includes('us') || cleanHubId.includes('america') ||
                   cleanHubId.includes('united') || cleanHubId.includes('states') ||
                   cleanHubId.includes('arkance') || cleanHubId.includes('sandbox')) {
          region = 'US';
        }
      }
      
      // Get current region from AccService if available
      if (AccService.instance && AccService.instance.region) {
        region = AccService.instance.region;
      }
      
      // Map region to ACC web URL
      const regionUrlMap = {
        'AUS': 'acc.aus.autodesk.com',
        'APAC': 'acc.aus.autodesk.com', // APAC uses AUS URL
        'US': 'acc.autodesk.com',
        'EMEA': 'acc.autodesk.com', // EMEA uses default URL
        'JPN': 'acc.autodesk.com',
        'IND': 'acc.autodesk.com',
        'DEU': 'acc.autodesk.com',
        'GBR': 'acc.autodesk.com',
        'CAN': 'acc.autodesk.com'
      };
      
      const baseUrl = regionUrlMap[region] || 'acc.autodesk.com';
      console.log(`🌍 Using ACC web URL for region ${region}: https://${baseUrl}`);
      
      return `https://${baseUrl}`;
    } catch (error) {
      console.warn('⚠️ Error determining ACC web URL, using default:', error);
      return 'https://acc.autodesk.com';
    }
  };
  
  // Helper function to safely set loading ref with timeout
  const setLoadingRef = (value, timeoutMs = 30000) => {
    isLoadingRef.current = value;
    
    // Clear existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set timeout to reset loading ref if it gets stuck
    if (value === true) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Loading ref timeout - resetting to prevent stuck state');
        isLoadingRef.current = false;
      }, timeoutMs);
    }
  };
  
  const [reminderSystemActive, setReminderSystemActive] = useState(false);
  const [reminderInterval, setReminderInterval] = useState(null);
  
  // Individual tab activation controls
  const [tabActivations, setTabActivations] = useState({
    issues: true,
    rfis: true,
    reviews: true,
    forms: true,
    meetings: true
  });
  
  // Individual item activation controls
  const [itemActivations, setItemActivations] = useState({});
  
  const [autoReminderSettings, setAutoReminderSettings] = useState({
    enabled: false, // Changed to false by default
    checkInterval: 1440, // 24 hours in minutes (1440 minutes = 24 hours)
    reminderDaysBefore: 3,
    reminderTime: '08:00', // Default 8 AM
    reminderTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // User's timezone or UTC
    senderEmail: '8445svc_zoyantra.testing@cewa.edu.au',
    messageTemplate: 'Reminder: You have pending items that require your attention. Please review and take action on overdue tasks in your project.',
    ccEmail: '', // CC recipients for reminders
    // Outlook Integration Settings
    outlookEnabled: true,
    outlookClientId: process.env.REACT_APP_REMINDER_OUTLOOK_CLIENT_ID || '621c0786-1fe9-42d1-a39e-200cd8fd6a9e',
    outlookClientSecret: process.env.REACT_APP_REMINDER_OUTLOOK_CLIENT_SECRET || '',
    outlookTenantId: 'a9aefa13-7b64-46fc-a84a-85dce450b11a'
  });

  const sections = [
    { 
      id: 'account-users', 
      name: 'Project Users', 
      icon: Crown, 
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-700',
      iconColor: 'text-indigo-600',
      description: 'Team members and assignments'
    },
    { 
      id: 'issues', 
      name: 'Issues', 
      icon: Flame, 
      color: 'red',
      gradient: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconColor: 'text-red-600',
      description: 'Track and manage project issues'
    },
    { 
      id: 'rfis', 
      name: 'RFIs', 
      icon: FileQuestion, 
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      description: 'Request for Information management'
    },
    { 
      id: 'reviews', 
      name: 'Reviews', 
      icon: Target, 
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      description: 'Document and design reviews'
    },
    { 
      id: 'forms', 
      name: 'Forms', 
      icon: FileCheck, 
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      iconColor: 'text-purple-600',
      description: 'Project forms and documentation'
    },
    { 
      id: 'meetings', 
      name: 'Meetings', 
      icon: Calendar, 
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-600',
      description: 'Project meetings and schedules'
    }
  ];

  useEffect(() => {
    console.log(`🔄 useEffect triggered - activeSection: ${activeSection}, selectedProject: ${selectedProject?.id}`);
    
    // Prevent loading if already in progress
    if (isLoading || isLoadingRef.current) {
      console.log('⚠️ Loading already in progress (state/ref check), skipping...');
      return;
    }
    
    loadAutoReminderSettings();
    autoSaveOutlookSettings();
    
    // Load users and data ONCE on mount
    if (selectedProject?.id) {
      const loadInitialData = async () => {
        try {
          // Load users first
          console.log('🔍 Loading users...');
          await loadAccountUsers();
          console.log('✅ Users loaded');
          
          // Then load section data
          if (activeSection === 'forms') {
            await loadForms();
          } else {
            await loadReminders();
          }
          console.log('✅ Initial data load complete');
        } catch (error) {
          console.error('❌ Error loading initial data:', error);
        }
      };
      
      loadInitialData();
    }
  }, [activeSection, selectedProject?.id]);

  // Auto-refresh reminder data every 10 minutes (only for Project Users tab)
  useEffect(() => {
    if (!selectedProject?.id) return;
    
    // Only auto-refresh when on Project Users tab
    if (activeSection !== 'account-users') return;
    
    console.log('🔄 Setting up auto-refresh for Project Users (10-minute interval)...');
    
    const autoRefreshInterval = setInterval(async () => {
      console.log('🔄 Auto-refresh triggered (10-minute interval)...');
      try {
        // Use the same refresh logic as the refresh button
        await loadAccountUsers();
        await loadAllRemindersForUsers();
        console.log('✅ Auto-refresh completed successfully');
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(autoRefreshInterval);
    };
  }, [selectedProject?.id, activeSection]);

  // Cleanup reminder interval on unmount
  useEffect(() => {
    return () => {
      if (reminderInterval) {
        clearInterval(reminderInterval);
      }
    };
  }, [reminderInterval]);

  // Set up automatic reminder checking - ONLY when manually started
  useEffect(() => {
    if (!reminderSystemActive || !selectedProject?.id) {
      console.log('🛑 Reminder system not active or no project selected - skipping automatic checks');
      return;
    }

    console.log('🔄 Setting up automatic reminder checking...');
    console.log(`⏰ Check interval: ${autoReminderSettings.checkInterval} minutes (${Math.round(autoReminderSettings.checkInterval / 60)} hours)`);
    console.log(`⏰ Reminder time: ${autoReminderSettings.reminderTime || '08:00'}`);
    console.log(`⏰ Timezone: ${autoReminderSettings.reminderTimeZone || 'UTC'}`);
    console.log('✅ Reminder system is manually started - enabling automatic checks');

    // Helper function to calculate next check time
    const calculateNextCheckTime = () => {
      const now = new Date();
      const reminderTime = autoReminderSettings.reminderTime || '08:00';
      
      // Parse reminder time (HH:MM format)
      const [hours, minutes] = reminderTime.split(':').map(Number);
      
      // For simplicity, use local browser time (user's timezone)
      // The reminderTime setting should match the user's local timezone expectation
      const nextCheck = new Date();
      nextCheck.setHours(hours, minutes, 0, 0);
      
      // If the reminder time has already passed today, schedule for tomorrow
      if (nextCheck <= now) {
        nextCheck.setDate(nextCheck.getDate() + 1);
      }
      
      return nextCheck.getTime() - now.getTime();
    };

    // Function to load items and check for reminders
    // Note: reminderTimeoutRef is declared at component top level
    const runAutomaticReminderCheck = async () => {
      console.log('🔄 Running scheduled reminder check (system is active)...');
      
      try {
        // Load items from all active reminder types
        const itemsToCheck = [];
        
        if (tabActivations.issues) {
          console.log('📋 Loading issues for automatic reminder check...');
          const issues = await fetchIssuesFromACC();
          itemsToCheck.push(...(issues || []));
        }
        
        if (tabActivations.rfis) {
          console.log('📋 Loading RFIs for automatic reminder check...');
          const rfis = await fetchRFIsFromACC();
          itemsToCheck.push(...(rfis || []));
        }
        
        if (tabActivations.reviews) {
          console.log('📋 Loading reviews for automatic reminder check...');
          const reviews = await fetchReviewsFromACC();
          itemsToCheck.push(...(reviews || []));
        }
        
        if (tabActivations.forms) {
          console.log('📋 Loading forms for automatic reminder check...');
          const forms = await fetchFormsFromACC();
          itemsToCheck.push(...(forms || []));
        }

        if (tabActivations.meetings) {
          console.log('📋 Loading meetings for automatic reminder check...');
          const meetings = await fetchMeetingsFromACC();
          itemsToCheck.push(...(meetings || []));
        }
        
        console.log(`📊 Loaded ${itemsToCheck.length} items from active reminder types for checking`);
        
        // Check for overdue items and send reminders
        await checkAndSendOverdueReminders(itemsToCheck);
        
        // Schedule next check
        const intervalMs = autoReminderSettings.checkInterval * 60 * 1000;
        const nextCheckDelay = calculateNextCheckTime();
        const delayMs = Math.min(nextCheckDelay, intervalMs);
        
        console.log(`⏰ Next automatic reminder check scheduled in ${Math.round(delayMs / 60000)} minutes`);
        
        // Clear any existing timeout before setting a new one
        if (reminderTimeoutRef.current) {
          clearTimeout(reminderTimeoutRef.current);
        }
        
        reminderTimeoutRef.current = setTimeout(() => {
          runAutomaticReminderCheck();
        }, delayMs);
      } catch (error) {
        console.error('❌ Error during automatic reminder check:', error);
        // Even on error, schedule next check
        const intervalMs = autoReminderSettings.checkInterval * 60 * 1000;
        const nextCheckDelay = calculateNextCheckTime();
        const delayMs = Math.min(nextCheckDelay, intervalMs);
        
        if (reminderTimeoutRef.current) {
          clearTimeout(reminderTimeoutRef.current);
        }
        
        reminderTimeoutRef.current = setTimeout(() => {
          runAutomaticReminderCheck();
        }, delayMs);
      }
    };

    // Calculate initial delay to next reminder time
    const initialDelay = calculateNextCheckTime();
    const intervalMs = autoReminderSettings.checkInterval * 60 * 1000;
    const firstCheckDelay = Math.min(initialDelay, intervalMs);
    
    console.log(`⏰ First automatic reminder check scheduled in ${Math.round(firstCheckDelay / 60000)} minutes`);
    
    // Clear any existing timeout before setting a new one
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
    }
    
    // Schedule first check
    reminderTimeoutRef.current = setTimeout(() => {
      runAutomaticReminderCheck();
    }, firstCheckDelay);

    // Cleanup on unmount or when settings change
    return () => {
      console.log('🛑 Clearing automatic reminder timeout');
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }
    };
  }, [reminderSystemActive, autoReminderSettings.checkInterval, autoReminderSettings.reminderTime, autoReminderSettings.reminderTimeZone, selectedProject?.id, tabActivations]);

  // Auto-save Outlook settings to make them ready to use
  const autoSaveOutlookSettings = () => {
    try {
      // Default settings
      const settings = {
        enabled: true,
        checkInterval: 1440, // 24 hours in minutes
        reminderDaysBefore: 3,
        reminderTime: '08:00', // Default 8 AM
        reminderTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // User's timezone or UTC
        senderEmail: '8445svc_zoyantra.testing@cewa.edu.au',
        messageTemplate: 'Reminder: You have pending items that require your attention. Please review and take action on overdue tasks in your project.',
        ccEmail: '',
        outlookEnabled: true,
        outlookClientId: process.env.REACT_APP_OUTLOOK_CLIENT_ID || '2a998440-08f4-44ee-a5dc-36b03f30eb17',
        outlookClientSecret: process.env.REACT_APP_OUTLOOK_CLIENT_SECRET || '',
        outlookTenantId: 'c5852f23-3633-4f29-b386-51da53e35e23'
      };
      
      setAutoReminderSettings(settings);
      console.log('✅ Default settings loaded');
    } catch (error) {
      console.error('❌ Error loading default settings:', error);
    }
  };

  // DISABLED: This causes infinite loops as userIdToName changes trigger loads which update userIdToName
  // useEffect(() => {
  //   if (selectedProject?.id && Object.keys(userIdToName).length > 0) {
  //     loadReminders();
  //   }
  // }, [userIdToName, userIdToEmail]);

  const getUserName = async (id) => {
    if (!id) return 'Unassigned';
    
    // Check if we already have the name in our mappings
    if (userIdToName[id]) {
      return userIdToName[id].name || userIdToName[id];
    }
    
    // Check UID to email map
    if (uidToEmailMap[id]) {
      const email = uidToEmailMap[id];
      return email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Fallback to ID if name not found
    return id;
  };

  const getUserEmail = (id) => {
    if (!id) return 'No email available';
    
    console.log(`🔍 Getting email for ID: ${id}`);
    console.log(`🔍 Available mappings:`, { 
      userIdToEmail: Object.keys(userIdToEmail), 
      uidToEmailMap: Object.keys(uidToEmailMap),
      userIdToName: Object.keys(userIdToName)
    });
    
    // First check the dedicated email map
    if (userIdToEmail[id] && userIdToEmail[id] !== 'No email available') {
      console.log(`✅ Found email in userIdToEmail: ${userIdToEmail[id]}`);
      return userIdToEmail[id];
    }
    
    // Check UID mapping - this is the key fix!
    if (uidToEmailMap[id] && uidToEmailMap[id] !== 'No email available') {
      console.log(`✅ Found email in uidToEmailMap: ${uidToEmailMap[id]}`);
      return uidToEmailMap[id];
    }
    
    // Check if this ID is a name and try to find email by name
    const userName = userIdToName[id];
    if (userName && userName !== 'No name available') {
      console.log(`🔍 ID ${id} maps to name: ${userName}`);
      // Try to find email by matching name
      const emailEntry = Object.entries(userIdToEmail).find(([userId, email]) => 
        userIdToName[userId] === userName && email !== 'No email available'
      );
      if (emailEntry) {
        console.log(`✅ Found email by name match: ${emailEntry[1]}`);
        return emailEntry[1];
      }
    }
    
    // Fallback to check userDetailsMap if available
    const userInfo = userIdToName[id];
    if (userInfo && typeof userInfo === 'object' && userInfo.email) {
      console.log(`✅ Found email in userInfo: ${userInfo.email}`);
      return userInfo.email;
    }
    
    console.log(`❌ No email found for ID: ${id}`);
    
    // Check if this looks like a UID but isn't in our account
    if (id && id.length > 10 && !userIdToEmail[id] && !uidToEmailMap[id]) {
      console.log(`⚠️ ID ${id} appears to be a UID but not found in account users`);
      return `UID not in account: ${id}`;
    }
    
    // Final safety check
    const result = 'No email available';
    console.log(`❌ getUserEmail returning: "${result}" for ID: ${id}`);
    return result;
  };

  // Simplified: Only check existing mappings, no API calls
  const fetchUserEmail = async (id) => {
    if (!id) return 'No email available';
    return getUserEmail(id);
  };







  const loadAutoReminderSettings = async () => {
    try {
      // Default settings
      const defaultSettings = {
        enabled: true,
        checkInterval: 1440, // 24 hours in minutes (1440 minutes = 24 hours)
        reminderDaysBefore: 3,
        reminderTime: '08:00', // Default 8 AM
        reminderTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // User's timezone or UTC
        senderEmail: '8445svc_zoyantra.testing@cewa.edu.au',
        messageTemplate: 'Reminder: You have pending items that require your attention. Please review and take action on overdue tasks in your project.',
        outlookEnabled: true,
        outlookClientId: '',
        outlookClientSecret: '',
        outlookTenantId: ''
      };
      
      // Try to load from localStorage first
      const storedSettings = localStorage.getItem('zoyantra_auto_reminder_settings');
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          
          // Always migrate old hardcoded Sydney timezone to user's timezone on first load
          // This ensures users get their browser timezone instead of hardcoded Sydney
          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          if (parsed.reminderTimeZone === 'Australia/Sydney' || !parsed.reminderTimeZone || parsed.reminderTimeZone === 'Sydney') {
            console.log(`🔄 Migrating timezone from '${parsed.reminderTimeZone || 'undefined'}' to user timezone: ${userTimezone}`);
            parsed.reminderTimeZone = userTimezone;
            parsed._timezoneMigrated = true;
            // Save migrated settings immediately
            localStorage.setItem('zoyantra_auto_reminder_settings', JSON.stringify(parsed));
            console.log('✅ Timezone migrated and saved');
          }
          
          // Merge with defaults to ensure all fields exist
          const settings = { ...defaultSettings, ...parsed };
          
          // Ensure timezone is not Sydney after merge
          if (settings.reminderTimeZone === 'Australia/Sydney') {
            settings.reminderTimeZone = userTimezone;
            console.log(`🔄 Force migrating timezone to: ${userTimezone}`);
          }
          
          // FINAL CHECK: Never set timezone to Sydney, force user's timezone
          if (settings.reminderTimeZone === 'Australia/Sydney' || settings.reminderTimeZone === 'Sydney') {
            console.warn('⚠️ Preventing Sydney timezone from being set - using user timezone instead');
            settings.reminderTimeZone = userTimezone;
            // Save the corrected settings
            localStorage.setItem('zoyantra_auto_reminder_settings', JSON.stringify(settings));
          }
          
          setAutoReminderSettings(settings);
          console.log('✅ Auto-reminder settings loaded from localStorage:', {
            checkInterval: settings.checkInterval,
            reminderTime: settings.reminderTime,
            reminderTimeZone: settings.reminderTimeZone
          });
          
          // Check if Outlook is connected
          const outlookTokens = localStorage.getItem('outlook_tokens');
          if (outlookTokens) {
            try {
              const tokens = JSON.parse(outlookTokens);
              // Check if token is still valid (not expired)
              if (tokens.tokenExpiry && tokens.tokenExpiry > Date.now()) {
                setOutlookConnected(true);
                console.log('✅ Outlook is connected');
              } else {
                setOutlookConnected(false);
                console.log('⚠️ Outlook token expired');
              }
            } catch (e) {
              setOutlookConnected(false);
            }
          } else {
            setOutlookConnected(false);
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse stored settings, using defaults:', e);
          setAutoReminderSettings(defaultSettings);
          
          // Check if Outlook is connected even if settings failed to parse
          const outlookTokens = localStorage.getItem('outlook_tokens');
          if (outlookTokens) {
            try {
              const tokens = JSON.parse(outlookTokens);
              if (tokens.tokenExpiry && tokens.tokenExpiry > Date.now()) {
                setOutlookConnected(true);
              } else {
                setOutlookConnected(false);
              }
            } catch (e) {
              setOutlookConnected(false);
            }
          } else {
            setOutlookConnected(false);
          }
        }
      } else {
        // No stored settings, use defaults and save them
        setAutoReminderSettings(defaultSettings);
        
        // Check if Outlook is connected
        const outlookTokens = localStorage.getItem('outlook_tokens');
        if (outlookTokens) {
          try {
            const tokens = JSON.parse(outlookTokens);
            if (tokens.tokenExpiry && tokens.tokenExpiry > Date.now()) {
              setOutlookConnected(true);
            } else {
              setOutlookConnected(false);
            }
          } catch (e) {
            setOutlookConnected(false);
          }
        } else {
          setOutlookConnected(false);
        }
        // Save defaults to localStorage so they persist
        localStorage.setItem('zoyantra_auto_reminder_settings', JSON.stringify(defaultSettings));
        console.log('✅ Default auto-reminder settings loaded and saved to localStorage (no stored settings found)');
      }
        
      // Load reminder system state (always start as inactive)
      setReminderSystemActive(false);
    } catch (error) {
      console.error('❌ Error loading auto reminder settings:', error);
      // Fallback to defaults on error
      setAutoReminderSettings({
        enabled: true,
        checkInterval: 1440, // 24 hours in minutes
        reminderDaysBefore: 3,
        reminderTime: '08:00', // Default 8 AM
        reminderTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // User's timezone or UTC
        senderEmail: '8445svc_zoyantra.testing@cewa.edu.au',
        messageTemplate: 'Reminder: You have pending items that require your attention. Please review and take action on overdue tasks in your project.',
        outlookEnabled: true,
        outlookClientId: '',
        outlookClientSecret: '',
        outlookTenantId: ''
      });
    }
  };

  // Helper function to save settings to localStorage
  const saveAutoReminderSettings = (settings) => {
    try {
      // Ensure all required fields are present before saving
      const settingsToSave = {
        enabled: settings.enabled !== undefined ? settings.enabled : true,
        checkInterval: settings.checkInterval !== undefined ? settings.checkInterval : 1440,
        reminderDaysBefore: settings.reminderDaysBefore !== undefined ? settings.reminderDaysBefore : 3,
        reminderTime: settings.reminderTime || '08:00',
        reminderTimeZone: (() => {
          const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const tz = settings.reminderTimeZone;
          // NEVER save Sydney - always use user's timezone instead
          if (!tz || tz === 'Australia/Sydney' || tz === 'Sydney') {
            console.warn('⚠️ Blocked saving Sydney timezone - using user timezone:', userTz);
            return userTz;
          }
          return tz;
        })(),
        senderEmail: settings.senderEmail || '8445svc_zoyantra.testing@cewa.edu.au',
        messageTemplate: settings.messageTemplate || 'Reminder: You have pending items that require your attention. Please review and take action on overdue tasks in your project.',
        ccEmail: settings.ccEmail || '',
        outlookEnabled: settings.outlookEnabled !== undefined ? settings.outlookEnabled : true,
        outlookClientId: settings.outlookClientId || '2a998440-08f4-44ee-a5dc-36b03f30eb17',
        outlookClientSecret:
          settings.outlookClientSecret || process.env.REACT_APP_OUTLOOK_CLIENT_SECRET || '',
        outlookTenantId: settings.outlookTenantId || 'c5852f23-3633-4f29-b386-51da53e35e23'
      };
      
      // Save to localStorage with a persistent key (not project-specific)
      localStorage.setItem('zoyantra_auto_reminder_settings', JSON.stringify(settingsToSave));
      console.log('✅ Auto-reminder settings saved to localStorage:', {
        checkInterval: settingsToSave.checkInterval,
        reminderTime: settingsToSave.reminderTime,
        reminderTimeZone: settingsToSave.reminderTimeZone
      });
    } catch (error) {
      console.error('❌ Error saving auto reminder settings to localStorage:', error);
    }
  };

  // Start the reminder system
  const startReminderSystem = () => {
    console.log('🚀 Starting reminder system...');
    setReminderSystemActive(true);
    
    console.log('✅ Reminder system started - automatic checks will begin');
  };

  // Toggle individual tab activation
  const toggleTabActivation = (tabName) => {
    setTabActivations(prev => {
      const newState = {
        ...prev,
        [tabName]: !prev[tabName]
      };
      console.log(`🔄 ${tabName} tab activation toggled: ${newState[tabName] ? 'ON' : 'OFF'}`);
      return newState;
    });
  };

  // Check if a specific tab is active for reminders
  const isTabActiveForReminders = (tabName) => {
    return reminderSystemActive && tabActivations[tabName];
  };

  // Toggle individual item activation
  const toggleItemActivation = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;
    setItemActivations(prev => {
      const newState = {
        ...prev,
        [key]: !prev[key]
      };
      console.log(`🔄 ${itemType} item ${itemId} activation toggled: ${newState[key] ? 'ON' : 'OFF'}`);
      return newState;
    });
  };

  // Check if a specific item is active for reminders
  const isItemActiveForReminders = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;
    // Default to true if not explicitly set (new items are active by default)
    return itemActivations[key] !== false;
  };

  // Stop the reminder system
  const stopReminderSystem = () => {
    console.log('🛑 Stopping reminder system...');
    setReminderSystemActive(false);
    
    // Clear any existing interval
    if (reminderInterval) {
      clearInterval(reminderInterval);
      setReminderInterval(null);
    }
    
    console.log('✅ Reminder system stopped - automatic checks disabled');
  };

  // Load account users for Project Users tab
  const loadAccountUsers = async () => {
    if (!selectedProject?.id) {
      console.warn('No project selected for loading account users');
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⚠️ Account users loading already in progress, skipping...');
      return;
    }

    setLoadingRef(true);
    try {
      console.log('🔍 Loading account users for project:', selectedProject.id);
      const projectId = selectedProject.id;
      const hubId = selectedHub?.id || selectedProject.hubId;
      
      // Step 1: Fetch project users (may not have UID)
      let projectUsers = [];
      
      try {
        console.log('🔍 Fetching users from project users API for project:', projectId);
        projectUsers = await AccService.getProjectUsersReliable(projectId, hubId);
        console.log(`✅ Project users API returned ${projectUsers ? projectUsers.length : 0} users`);
        
        if (!projectUsers || projectUsers.length === 0) {
          throw new Error('Project users API returned no users');
        }
      } catch (e) {
        console.log('⚠️ Project users API failed:', e.message);
        try {
          projectUsers = await AccService.getProjectUsersAdmin(projectId, hubId);
          console.log(`✅ Admin API returned ${projectUsers ? projectUsers.length : 0} users`);
        } catch (e2) {
          console.log('⚠️ Admin API also failed:', e2.message);
          projectUsers = [];
        }
      }
      
      // Step 2: Fetch account users from HQ API to get UID data
      // Use the backend endpoint which handles 2-legged token
      let accountUsers = [];
      try {
        console.log('🔍 Fetching account users from HQ API for hub:', hubId);
        
        // Remove 'b.' prefix from hubId to get accountId
        const accountId = hubId?.startsWith('b.') ? hubId.substring(2) : hubId;
        console.log('🔍 Account ID:', accountId);
        
        // Call backend endpoint which uses 2-legged token internally
        const response = await fetch(`/api/hq/users/search/${accountId}?limit=100`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        accountUsers = await response.json();
        console.log(`✅ HQ API returned ${accountUsers ? accountUsers.length : 0} account users with UIDs`);
      } catch (e3) {
        console.log('⚠️ HQ API failed:', e3.message);
        console.log('ℹ️ Proceeding without UID data - UIDs will show as unknown');
        accountUsers = [];
      }
      
      // Step 3: Build name/email maps from project users and account users
      const nameMap = {};
      const emailMap = {};
      const uidToEmailMap = {};
      const uidToNameMap = {};
      
      // First, create a map of account users by email for UID lookup
      const accountUsersByEmail = {};
      (accountUsers || []).forEach(au => {
        const email = (au.email || '').toLowerCase().trim();
        const name = au.name || `${au.first_name || ''} ${au.last_name || ''}`.trim() || email.split('@')[0];
        if (email && au.uid) {
          accountUsersByEmail[email] = au.uid;
          uidToEmailMap[au.uid] = email;
          uidToNameMap[au.uid] = name; // Store name from HQ API
          console.log(`🔗 Account user UID: ${au.uid} -> ${email} (${name})`);
        }
      });
      
      // Process project users - extract Autodesk ID and match to UID via email
      (projectUsers || []).forEach(pu => {
        const autodeskId = pu.id || pu.userId || pu.autodeskId;
        const name = pu.name || pu.attributes?.name || pu.email || autodeskId;
        const email = (pu.email || pu.attributes?.email || 'No email available').toLowerCase().trim();
        
        console.log(`🔍 Processing project user:`, { autodeskId, name, email });
        
        // Map Autodesk ID to name/email
        if (autodeskId) {
          nameMap[autodeskId] = name;
          emailMap[autodeskId] = email;
        }
        
        // Match with account user by email to get UID
        if (accountUsersByEmail[email]) {
          const uid = accountUsersByEmail[email];
          console.log(`✅ Matched user ${name} (${email}) with UID: ${uid}`);
        }
      });
      
      setUserIdToName(nameMap);
      setUserIdToEmail(emailMap);
      setUidToEmailMap(uidToEmailMap);
      setUidToNameMap(uidToNameMap); // Store UID to name mapping
      
      console.log(`✅ Loaded ${Object.keys(nameMap).length} account users`);
      console.log(`✅ UID mappings: ${Object.keys(uidToEmailMap).length} emails, ${Object.keys(uidToNameMap).length} names`);
      console.log('📊 User mappings:', { nameMap, emailMap, uidToEmailMap, uidToNameMap });
      
      // Show the list of all users with their autodeskId and UID
      console.log('📋 ALL LOADED USERS WITH AUTODESK ID AND UID:');
      Object.keys(nameMap).forEach((userId, index) => {
        const name = nameMap[userId];
        const email = emailMap[userId];
        const emailLower = email.toLowerCase().trim();
        const uid = Object.keys(uidToEmailMap).find(u => uidToEmailMap[u].toLowerCase() === emailLower) || 'N/A';
        console.log(`${index + 1}. ${name} (AutodeskId: ${userId}, Email: ${email}, UID: ${uid})`);
      });
      
    } catch (error) {
      console.error('❌ Failed to load account users:', error);
    } finally {
      setLoadingRef(false);
    }
  };

  // Toggle reminder system
  const toggleReminderSystem = () => {
    if (reminderSystemActive) {
      stopReminderSystem();
    } else {
      startReminderSystem();
    }
  };

  const loadForms = async () => {
    if (!selectedProject?.id) {
      console.warn('No project selected for loading forms');
      return;
    }

    setIsLoading(true);
    setLoadingRef(true);
    try {
      console.log(`🔍 Loading forms from ACC for project:`, selectedProject.id);
      console.log(`🔍 Project ID type:`, typeof selectedProject.id);
      console.log(`🔍 Project ID value:`, selectedProject.id);
      
      // Use fetchFormsFromACC to get processed forms with assignedToEmail
      const processedForms = await fetchFormsFromACC();
      console.log('🔍 Processed forms data received:', processedForms);
      console.log('🔍 Processed forms data type:', typeof processedForms);
      console.log('🔍 Processed forms data length:', processedForms?.length);
      
      setForms(processedForms || []);
      console.log('✅ Processed forms loaded:', processedForms?.length || 0);
    } catch (error) {
      console.error('❌ Error loading forms:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      setForms([]);
      console.log('✅ Forms set to empty due to error');
    } finally {
      setIsLoading(false);
      setLoadingRef(false);
    }
  };

  // Load project users to get email addresses
  const loadProjectUsers = async () => {
    if (!selectedProject?.id) {
      console.warn('No project selected for loading users');
      return;
    }

    try {
      console.log('🔍 Loading project users for email addresses...');
      const projectId = selectedProject.id;
      const hubId = selectedHub?.id || selectedProject.hubId;
      
      let users = [];
      try {
        users = await AccService.getProjectUsersReliable(projectId, hubId);
      } catch (e) {
        console.warn('⚠️ Failed to load users via reliable method, trying admin method');
        try {
          users = await AccService.getProjectUsersAdmin(projectId, hubId);
        } catch (e2) {
          console.warn('⚠️ Failed to load users via admin method');
        }
      }
      
      if (users && users.length > 0) {
        console.log('✅ Project users loaded:', users.length);
        
        // Create mapping for quick lookup
        const userMap = {};
        users.forEach(user => {
          if (user.id) {
            userMap[user.id] = {
              name: user.name || user.displayName || user.email || 'Unknown User',
              email: user.email || user.mail || 'No email available'
            };
          }
        });
        setUserIdToName(userMap);
        console.log('✅ User mapping created:', Object.keys(userMap).length, 'users');
      } else {
        console.warn('⚠️ No project users found');
      }
    } catch (error) {
      console.error('❌ Error loading project users:', error);
    }
  };

  // Load all due items (forms, issues, RFIs, reviews)
  const loadDueItems = async () => {
    if (!selectedProject?.id) {
      console.warn('No project selected for loading due items');
      return;
    }

    setIsLoading(true);
    setLoadingRef(true);
    try {
      console.log('🔍 Loading all due items for project:', selectedProject.id);
      
      const allDueItems = [];
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      // Load forms and check for due items
      try {
        const formsData = await AccService.getProjectForms(selectedProject.id);
        if (formsData && formsData.length > 0) {
          formsData.forEach(form => {
            // Check if form has due date and is due soon or overdue
            const formDueDate = form.dueDate || form.formDate || form.createdAt;
            if (formDueDate) {
              const dueDate = new Date(formDueDate);
              const isOverdue = dueDate < today;
              const isDueSoon = dueDate <= threeDaysFromNow;
              
              if (isOverdue || isDueSoon) {
                allDueItems.push({
                  id: form.id,
                  type: 'form',
                  title: form.name || 'Untitled Form',
                  description: form.description || 'Form requires attention',
                  dueDate: formDueDate,
                  assigneeId: form.assigneeId,
                  status: form.status,
                  priority: isOverdue ? 'overdue' : 'due_soon',
                  formNum: form.formNum,
                  projectId: selectedProject.id
                });
              }
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ Error loading forms for due items:', error);
      }
      
      // Sort by priority (overdue first) and due date
      allDueItems.sort((a, b) => {
        if (a.priority === 'overdue' && b.priority !== 'overdue') return -1;
        if (b.priority === 'overdue' && a.priority !== 'overdue') return 1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      
      console.log('✅ Due items loaded:', allDueItems.length);
      
    } catch (error) {
      console.error('❌ Error loading due items:', error);
    } finally {
      setIsLoading(false);
      setLoadingRef(false);
    }
  };

  const loadAllRemindersForUsers = async () => {
    if (!selectedProject?.id) {
      console.warn('No project selected for loading all reminders');
      return;
    }

    try {
      console.log('🔍 Loading ALL reminders for Project Users calculation...');
      console.log('🔍 Current email mappings:', {
        userIdToEmail: Object.keys(userIdToEmail).length,
        uidToEmailMap: Object.keys(uidToEmailMap).length,
        userIdToName: Object.keys(userIdToName).length
      });
      
      // Load all types of reminders in parallel
      const [issues, rfis, reviews, forms, meetings] = await Promise.all([
        fetchIssuesFromACC().then(items => items.map(item => ({ ...item, itemType: 'issues' }))),
        fetchRFIsFromACC().then(items => items.map(item => ({ ...item, itemType: 'rfis' }))).catch(() => []),
        fetchReviewsFromACC().then(items => items.map(item => ({ ...item, itemType: 'reviews' }))),
        fetchFormsFromACC().then(items => items.map(item => ({ ...item, itemType: 'forms' }))),
        fetchMeetingsFromACC().then(items => items.map(item => ({ ...item, itemType: 'meetings' })))
      ]);
      
      // Combine all reminders
      const allReminders = [...issues, ...rfis, ...reviews, ...forms, ...meetings];
      
      console.log(`✅ Loaded all reminders: Issues: ${issues.length}, RFIs: ${rfis.length}, Reviews: ${reviews.length}, Forms: ${forms.length}, Meetings: ${meetings.length}, Total: ${allReminders.length}`);
      
      // Debug: Log reminders with assigned emails
      console.log('🔍 Reminders with assigned emails:');
      allReminders.slice(0, 10).forEach((reminder, index) => {
        console.log(`${index + 1}. ${reminder.title} - Assigned to: ${reminder.assignedToEmail} (${reminder.itemType})`);
      });
      
      // Debug: Check if any reminders have valid emails
      const remindersWithEmails = allReminders.filter(r => r.assignedToEmail && r.assignedToEmail !== 'No email available');
      console.log(`📊 Reminders with valid emails: ${remindersWithEmails.length}/${allReminders.length}`);
      
      // Update reminders state for getUserDueItems
      setReminders(allReminders);
      
    } catch (error) {
      console.error('❌ Error loading all reminders for users:', error);
    }
  };

  const loadReminders = async () => {
    if (!selectedProject?.id) {
      console.warn('No project selected for loading reminders');
      return;
    }

    setIsLoading(true);
    setLoadingRef(true);
    try {
      console.log(`🔍 Loading ${activeSection} from ACC for project:`, selectedProject.id);
      console.log(`🔍 Current activeSection: ${activeSection}`);
      
      let data = [];
      
      switch (activeSection) {
        case 'issues':
          console.log('🔍 Fetching issues...');
          data = await fetchIssuesFromACC();
          break;
        case 'rfis':
          console.log('🔍 Fetching RFIs...');
          try {
            data = await fetchRFIsFromACC();
            console.log(`✅ RFI fetch completed: ${data.length} RFIs found`);
          } catch (error) {
            console.error('❌ RFI fetch failed:', error);
            console.error('❌ RFI error details:', {
              message: error.message,
              stack: error.stack,
              projectId: selectedProject?.id
            });
            data = [];
          }
          break;
        case 'reviews':
          console.log('🔍 Fetching reviews...');
          data = await fetchReviewsFromACC();
          break;
        case 'forms':
          console.log('🔍 Fetching forms...');
          data = await fetchFormsFromACC();
          break;
        case 'meetings':
          console.log('🔍 Fetching meetings...');
          data = await fetchMeetingsFromACC();
          break;
        case 'account-users':
          console.log('🔍 Account Users section - loading all due items for dashboard');
          // Load all types of due items for the Project Users dashboard
          const [issues, rfis, reviews, forms, meetings] = await Promise.all([
            fetchIssuesFromACC().then(items => items.map(item => ({ ...item, itemType: 'issues' }))),
            fetchRFIsFromACC().then(items => items.map(item => ({ ...item, itemType: 'rfis' }))).catch(() => []),
            fetchReviewsFromACC().then(items => items.map(item => ({ ...item, itemType: 'reviews' }))),
            fetchFormsFromACC().then(items => items.map(item => ({ ...item, itemType: 'forms' }))),
            fetchMeetingsFromACC().then(items => items.map(item => ({ ...item, itemType: 'meetings' })))
          ]);
          
          // Combine all due items
          data = [...issues, ...rfis, ...reviews, ...forms, ...meetings];
          console.log(`📊 Loaded all due items for Project Users dashboard: Issues: ${issues.length}, RFIs: ${rfis.length}, Reviews: ${reviews.length}, Forms: ${forms.length}, Meetings: ${meetings.length}, Total: ${data.length}`);
          break;
        default:
          console.log('🔍 Unknown section, returning empty data');
          data = [];
      }
      
      console.log(`📊 Data fetched for ${activeSection}:`, data);
      console.log(`📊 Data count: ${data?.length || 0}`);
      
      // Filter out closed items for Issues/RFIs/Reviews/Forms
      const withoutClosed = data.filter(item => {
        // For combined data (Project Users dashboard), use itemType to determine filtering
        const itemType = item.itemType || activeSection;
        
        if (itemType === 'issues') {
          return (item.issueStatus || '').toString().toLowerCase() !== 'closed';
        }
        if (itemType === 'rfis') {
          // Show all RFIs that are NOT closed (including answered, open, submitted, etc.)
          const status = (item.rfiStatus || '').toString().toLowerCase();
          const isClosed = status === 'closed' || status === 'void' || status === 'cancelled' || status === 'canceled';
          return !isClosed;
        }
        if (itemType === 'reviews') {
          return (item.reviewStatus || '').toString().toUpperCase() !== 'CLOSED';
        }
        if (itemType === 'forms') {
          return (item.formStatus || '').toString().toLowerCase() !== 'closed';
        }
        if (itemType === 'meetings') {
          const meetingStatus = (item.meetingStatus || item.status || '').toString().toLowerCase();
          return !['closed', 'completed', 'cancelled', 'canceled'].includes(meetingStatus);
        }
        return true;
      });

      // Filter out items with empty or unassigned assignees
      // NOTE: RFIs are exempt from this filter - all open RFIs should show
      const withAssignedUsers = withoutClosed.filter(item => {
        // For combined data (Project Users dashboard), use itemType to determine filtering
        const itemType = item.itemType || activeSection;
        
        // RFIs: Always show open RFIs, even if unassigned
        if (itemType === 'rfis') {
          console.log(`✅ RFI ${item.id} (${item.title}) is open, including (even if unassigned)`);
          return true;
        }
        
        // For forms, check multiple assignment fields
        if (itemType === 'forms') {
          const hasAssigneeId = item.assigneeId && item.assigneeId !== '' && item.assigneeId !== 'Unassigned';
          const hasCreatedBy = item.createdBy && item.createdBy !== '' && item.createdBy !== 'Unassigned';
          const hasAssigneeName = item.assigneeName && item.assigneeName !== '' && item.assigneeName !== 'Unassigned';
          const hasAssigneesArray = item.assignees && item.assignees.length > 0;
          const hasAssignedTo = item.assignedTo && item.assignedTo !== '' && item.assignedTo !== 'Unassigned';
          
          const isAssigned = hasAssigneeId || hasCreatedBy || hasAssigneeName || hasAssigneesArray || hasAssignedTo;
          
          if (!isAssigned) {
            console.log(`⚠️ Form ${item.id} (${item.title}) has no assigned user, excluding`);
            return false;
          }
          
          console.log(`✅ Form ${item.id} (${item.title}) is assigned:`, {
            assigneeId: item.assigneeId,
            createdBy: item.createdBy,
            assigneeName: item.assigneeName,
            assignedTo: item.assignedTo,
            hasAssignees: hasAssigneesArray
          });
          return true;
        }
        
        // For other sections (Issues, Reviews), use standard assignedTo check
        const assignedTo = item.assignedTo;
        if (!assignedTo || assignedTo === '' || assignedTo === 'Unassigned' || assignedTo === 'unassigned') {
          console.log(`⚠️ ${itemType} ${item.id} (${item.title}) has no assigned user, excluding`);
          return false;
        }
        return true;
      });

      console.log(`📊 After filtering closed items: ${withoutClosed.length} items remaining`);
      console.log(`📊 After filtering unassigned items: ${withAssignedUsers.length} items remaining`);
      console.log(`📊 Items:`, withAssignedUsers.slice(0, 3).map(item => ({
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        issueStatus: item.issueStatus,
        rfiStatus: item.rfiStatus,
        reviewStatus: item.reviewStatus,
        formStatus: item.formStatus,
        assignedTo: item.assignedTo
      })));

      // Show overdue items AND upcoming items due within reminderDaysBefore
      const relevantItems = withAssignedUsers.filter(item => {
        const itemType = item.itemType || activeSection;
        
        // Check if individual item is activated for reminders
        if (!isItemActiveForReminders(item.id, itemType)) {
          console.log(`⚠️ ${itemType} ${item.id} (${item.title}) is deactivated for reminders, excluding`);
          return false;
        }
        
        // For RFIs: Show ALL open RFIs (including answered ones) regardless of due date or assignment status
        if (itemType === 'rfis') {
          // All open RFIs (including answered but not closed) should appear in the due section
          const rfiStatus = (item.rfiStatus || item.status || '').toString().toLowerCase();
          const isClosed = rfiStatus === 'closed' || rfiStatus === 'void' || rfiStatus === 'cancelled' || rfiStatus === 'canceled';
          
          if (!isClosed) {
            console.log(`✅ RFI ${item.id} (${item.title}) is ${rfiStatus} (not closed), showing in due section:`, {
              status: item.rfiStatus || item.status,
              dueDate: item.dueDate || item.responseDueDate || item.createdAt || 'No date',
              assignedTo: item.assignedTo || 'Unassigned'
            });
            return true; // Include all non-closed RFIs (open, answered, submitted, etc.)
          } else {
            console.log(`⚠️ RFI ${item.id} (${item.title}) is closed, excluding`);
            return false;
          }
        }
        
        // For other items, require a due date
        if (!item.dueDate) {
          console.log(`⚠️ ${itemType} ${item.id} has no due date, excluding`);
          return false;
        }
        
        const dueDate = new Date(item.dueDate);
        const today = new Date();
        const reminderDays = autoReminderSettings.reminderDaysBefore || 3;
        const reminderDate = new Date(today);
        reminderDate.setDate(reminderDate.getDate() + reminderDays);
        
        const isOverdue = dueDate < today;
        const isUpcoming = dueDate <= reminderDate && dueDate >= today;
        
        // For Reviews section, only show overdue items (due date has passed)
        if (itemType === 'reviews') {
          console.log(`🔍 Review ${item.id} (${item.title}):`, {
            dueDate: item.dueDate,
            isOverdue,
            willShow: isOverdue
          });
          return isOverdue;
        }
        
        // For other sections (Issues, Forms), show both overdue and upcoming
        const isRelevant = isOverdue || isUpcoming;
        
        console.log(`🔍 Item ${item.id} (${item.title}):`, {
          dueDate: item.dueDate,
          isOverdue,
          isUpcoming,
          isRelevant,
          reminderDays
        });
        
        return isRelevant;
      });

      console.log(`📊 Final relevant items: ${relevantItems.length} items`);
      console.log(`📊 Final items:`, relevantItems.map(item => ({
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        assignedTo: item.assignedTo
      })));

      // For Project Users dashboard, separate items by type
      if (activeSection === 'account-users') {
        const issues = relevantItems.filter(item => item.itemType === 'issues');
        const rfis = relevantItems.filter(item => item.itemType === 'rfis');
        const reviews = relevantItems.filter(item => item.itemType === 'reviews');
        const forms = relevantItems.filter(item => item.itemType === 'forms');
        const meetings = relevantItems.filter(item => item.itemType === 'meetings');
        
        // Update the reminders state with all items for getUserDueItems
        setReminders([...issues, ...rfis, ...reviews, ...meetings]);
        setForms(forms);
        
        console.log(`✅ Loaded all due items for Project Users dashboard: Issues: ${issues.length}, RFIs: ${rfis.length}, Reviews: ${reviews.length}, Forms: ${forms.length}, Meetings: ${meetings.length}, Total: ${relevantItems.length}`);
      } else if (activeSection === 'forms') {
        // For forms section, set forms state (not reminders)
        setForms(relevantItems);
        setReminders([]); // Clear reminders for forms section
        console.log(`✅ Loaded ${relevantItems.length} forms items (overdue + upcoming within ${autoReminderSettings.reminderDaysBefore} days)`);
      } else {
      setReminders(relevantItems);
      
      // Update console message based on section
      if (activeSection === 'reviews') {
        console.log(`✅ Loaded ${relevantItems.length} ${activeSection} items (overdue only)`);
      } else {
        console.log(`✅ Loaded ${relevantItems.length} ${activeSection} items (overdue + upcoming within ${autoReminderSettings.reminderDaysBefore} days)`);
        }
      }
      
      // Check for overdue items and send automatic reminders ONLY if system is manually started
      if (reminderSystemActive && autoReminderSettings.enabled) {
        await checkAndSendOverdueReminders(relevantItems);
      }
      
    } catch (error) {
      console.error(`❌ Error loading ${activeSection}:`, error);
      setReminders([]);
    } finally {
      setIsLoading(false);
      setLoadingRef(false);
    }
  };


  // ACC Data Fetching Functions
  const isClosedLikeStatus = (status) => {
    const s = (status || '').toString().toLowerCase();
    // Exclude only truly closed/final statuses
    // NOTE: 'answered' is NOT a closed status - RFIs can be answered but still need closure
    return [
      'closed', 'void', 'cancelled', 'canceled'
    ].includes(s);
  };
  const fetchIssuesFromACC = async () => {
    try {
      console.log('🔍 Fetching issues from ACC...');
      // Use ACC Issues API
      const issues = await AccService.getProjectIssues(selectedProject.id);
      
      console.log(`📋 Retrieved ${issues.length} issues from API`);
      
      // Pre-fetch all unique UIDs from issues to resolve them in batch
      const uniqueUIDs = new Set();
      issues.forEach(issue => {
        const assignedToId = typeof issue.assignedTo === 'object' ? (issue.assignedTo?.id || issue.assignedTo?.uid) : issue.assignedTo;
        if (assignedToId) {
          const isUID = /^[A-Z0-9]{10,16}$/i.test(assignedToId) && !assignedToId.includes('-');
          if (isUID && !uidToEmailMap[assignedToId] && !userIdToName[assignedToId]) {
            uniqueUIDs.add(assignedToId);
          }
        }
        if (issue.createdBy && /^[A-Z0-9]{10,16}$/i.test(issue.createdBy) && !issue.createdBy.includes('-')) {
          if (!uidToEmailMap[issue.createdBy] && !userIdToName[issue.createdBy]) {
            uniqueUIDs.add(issue.createdBy);
          }
        }
      });
      
      console.log(`🔍 Found ${uniqueUIDs.size} unique UIDs in issues to resolve`);
      
      // Try to resolve UIDs by fetching project user details for each
      const uidResolutionMap = {};
      for (const uid of uniqueUIDs) {
        try {
          const userDetails = await AccService.getUserById(selectedProject.id, uid);
          if (userDetails && userDetails.email) {
            uidResolutionMap[uid] = {
              name: userDetails.name,
              email: userDetails.email
            };
            console.log(`✅ Resolved Issue UID ${uid} -> ${userDetails.email}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not resolve Issue UID ${uid}:`, error.message);
        }
      }
      
      console.log(`✅ Resolved ${Object.keys(uidResolutionMap).length}/${uniqueUIDs.size} Issue UIDs`);
      
      // Process issues and resolve user names
      const processedIssues = [];
      for (const issue of issues) {
        // Skip closed/approved-equivalent issues
        if (isClosedLikeStatus(issue.status)) {
          continue;
        }
        const assignedToId = typeof issue.assignedTo === 'object' ? (issue.assignedTo?.id || issue.assignedTo?.uid) : issue.assignedTo;
        
        // OPTIMIZED: Use batch-resolved UIDs, then local cache lookups
        let assignedToName = 'Unassigned';
        let assignedToEmail = 'No email available';
        
        if (assignedToId) {
          // Check UID resolution map first (from batch fetch)
          if (uidResolutionMap[assignedToId]) {
            assignedToName = uidResolutionMap[assignedToId].name;
            assignedToEmail = uidResolutionMap[assignedToId].email;
          }
          // Check userIdToName cache (Autodesk IDs)
          else if (userIdToName[assignedToId]) {
            const nameData = userIdToName[assignedToId];
            assignedToName = typeof nameData === 'string' ? nameData : (nameData?.name || 'Unassigned');
            assignedToEmail = userIdToEmail[assignedToId] || 'No email available';
          }
          // Check uidToEmailMap and uidToNameMap (UIDs from HQ API/Project Users)
          else if (uidToEmailMap[assignedToId]) {
            assignedToEmail = uidToEmailMap[assignedToId];
            // Use name from uidToNameMap if available, otherwise derive from email
            assignedToName = uidToNameMap[assignedToId] || assignedToEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          } else {
            // Unknown UID - show it as UID (user can see there's an assignment)
            assignedToName = `User ${assignedToId}`;
            assignedToEmail = `UID: ${assignedToId}`;
            console.log(`⚠️ Issue ${issue.id} has unknown UID ${assignedToId}, showing as assigned but email unknown`);
          }
        }
        
        processedIssues.push({
          id: issue.id,
          title: issue.title || 'Untitled Issue',
          description: issue.description || 'No description available',
          dueDate: issue.dueDate || issue.createdAt,
          assignedTo: assignedToName,
          assignedToEmail: assignedToEmail,
          role: issue.assignedToType === 'user' ? 'User' : 
                issue.assignedToType === 'company' ? 'Company' :
                issue.assignedToType === 'role' ? 'Role' : 'Project Team',
          priority: issue.status === 'open' ? 'high' : 
                   issue.status === 'in_progress' ? 'medium' : 'low',
          status: getItemStatus(issue.dueDate),
          reminderDate: calculateReminderDate(issue.dueDate),
          message: `Issue: ${issue.title || 'Untitled Issue'} is due for resolution.`,
          displayId: issue.displayId,
          issueStatus: issue.status,
          locationDetails: issue.locationDetails,
          createdBy: issue.createdBy,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          issueUrl: issue.links?.web?.href || 
                    `${getAccWebUrl()}/build/issues/projects/${selectedProject.id.replace(/^b\./, '')}/issues?issueId=${issue.id}`
        });
      }
      
      return processedIssues;
    } catch (error) {
      console.error('❌ Error fetching issues from ACC:', error);
      return [];
    }
  };

  const fetchRFIsFromACC = async () => {
    try {
      console.log('🔍 Fetching RFIs from ACC...');
      console.log('🔍 Project ID:', selectedProject?.id);
      
      if (!selectedProject?.id) {
        console.error('❌ No project ID available for RFI fetch');
        return [];
      }
      
      // Fetch RFIs directly without test
      console.log('🔍 Fetching RFIs...');
      const rfis = await AccService.getProjectRFIs(selectedProject.id);
      
      console.log(`📋 Retrieved ${rfis.length} RFIs from API`);
      
      // Pre-fetch all unique UIDs from RFIs to resolve them in batch
      const uniqueUIDs = new Set();
      rfis.forEach(rfi => {
        const assignedToId = rfi.assignedTo?.[0]?.id || rfi.managerId || rfi.assignedToUserId;
        if (assignedToId) {
          const isUID = /^[A-Z0-9]{10,16}$/i.test(assignedToId) && !assignedToId.includes('-');
          if (isUID && !uidToEmailMap[assignedToId]) {
            uniqueUIDs.add(assignedToId);
          }
        }
        if (rfi.createdBy && /^[A-Z0-9]{10,16}$/i.test(rfi.createdBy) && !rfi.createdBy.includes('-')) {
          uniqueUIDs.add(rfi.createdBy);
        }
      });
      
      console.log(`🔍 Found ${uniqueUIDs.size} unique UIDs in RFIs to resolve`);
      
      // Try to resolve UIDs by fetching project user details for each
      const uidResolutionMap = {};
      for (const uid of uniqueUIDs) {
        try {
          const userDetails = await AccService.getUserById(selectedProject.id, uid);
          if (userDetails && userDetails.email) {
            uidResolutionMap[uid] = {
              name: userDetails.name,
              email: userDetails.email
            };
            console.log(`✅ Resolved RFI UID ${uid} -> ${userDetails.email}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not resolve RFI UID ${uid}:`, error.message);
        }
      }
      
      console.log(`✅ Resolved ${Object.keys(uidResolutionMap).length}/${uniqueUIDs.size} RFI UIDs`);
      
      // Process RFIs and resolve user names
      const processedRfis = [];
      console.log(`🔍 Processing ${rfis.length} RFIs...`);
      for (const rfi of rfis) {
        // Skip closed/approved-equivalent RFIs
        if (isClosedLikeStatus(rfi.status)) {
          continue;
        }
        
        // Enhanced due date logic based on RFI status and workflow
        let dueDate = null;
        let statusMessage = '';
        let responseDueDate = null;
        
        const rfiStatus = (rfi.status || '').toLowerCase();
        const workflowType = rfi.workflowType || 'US';
        
        // Primary due date logic
        if (rfi.dueDate) {
          dueDate = rfi.dueDate;
          responseDueDate = rfi.dueDate;
        } else if (rfi.responseDueDate) {
          dueDate = rfi.responseDueDate;
          responseDueDate = rfi.responseDueDate;
        } else {
          // Fallback: use createdAt if no dueDate
          dueDate = rfi.createdAt;
          responseDueDate = rfi.createdAt;
        }
        
        // Status-specific logic for response due dates
        if (rfiStatus === 'open' || rfiStatus === 'openrev1' || rfiStatus === 'openrev2') {
          statusMessage = 'Open - requires response';
        } else if (rfiStatus === 'submitted') {
          statusMessage = 'Submitted - awaiting review';
        } else if (rfiStatus === 'answered' || rfiStatus === 'answeredrev1' || rfiStatus === 'answeredmanager') {
          statusMessage = 'Answered - awaiting closure';
        } else if (rfiStatus === 'draft') {
          statusMessage = 'Draft - needs submission';
        } else if (rfiStatus === 'rejected') {
          statusMessage = 'Rejected - needs revision';
        } else {
          statusMessage = 'RFI requires attention';
        }
          
        // Resolve user mapping using cache + UID resolution
        const assignedToId = rfi.assignedTo?.[0]?.id || rfi.managerId || rfi.assignedToUserId;
        let assignedToName = 'Unassigned';
        let assignedToEmail = 'No email available';
        
        if (assignedToId) {
          // Check UID resolution map first (from batch fetch)
          if (uidResolutionMap[assignedToId]) {
            assignedToName = uidResolutionMap[assignedToId].name;
            assignedToEmail = uidResolutionMap[assignedToId].email;
          }
          // Check userIdToName cache (Autodesk IDs)
          else if (userIdToName[assignedToId]) {
            const nameData = userIdToName[assignedToId];
            assignedToName = typeof nameData === 'string' ? nameData : (nameData?.name || assignedToId);
            assignedToEmail = userIdToEmail[assignedToId] || 'No email available';
          } 
          // Check uidToEmailMap and uidToNameMap (UIDs from HQ API/Project Users)
          else if (uidToEmailMap[assignedToId]) {
            assignedToEmail = uidToEmailMap[assignedToId];
            // Use name from uidToNameMap if available, otherwise derive from email
            assignedToName = uidToNameMap[assignedToId] || assignedToEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          // Unknown UID - show as UID
          else {
            assignedToName = `User ${assignedToId}`;
            assignedToEmail = `UID: ${assignedToId}`;
          }
        }
        
        processedRfis.push({
            id: rfi.id,
            title: rfi.title || rfi.customIdentifier || 'Untitled RFI',
            description: rfi.question || rfi.description || 'No description available',
            dueDate: dueDate,
          responseDueDate: responseDueDate, // Specific response due date
            assignedTo: assignedToName,
            assignedToEmail: assignedToEmail,
            role: rfi.assignedTo?.[0]?.type === 'user' ? 'User' : 
                  rfi.assignedTo?.[0]?.type === 'role' ? 'Role' : 'Project Team',
            priority: rfiStatus === 'open' ? 'high' : rfiStatus === 'answered' ? 'medium' : 'low',
            status: getItemStatus(dueDate),
            reminderDate: calculateReminderDate(dueDate),
            message: `RFI: ${rfi.title || 'Untitled RFI'} - ${statusMessage}`,
            rfiStatus: rfiStatus,
          workflowType: workflowType,
            createdBy: rfi.createdBy,
            createdAt: rfi.createdAt,
            updatedAt: rfi.updatedAt,
          closedAt: rfi.closedAt,
          submittedAt: rfi.submittedAt,
          answeredAt: rfi.answeredAt,
          respondedAt: rfi.respondedAt,
          // Enhanced RFI information
          rfiType: rfi.rfiType?.name || 'Unknown Type',
          rfiTypeId: rfi.rfiTypeId,
            customIdentifier: rfi.customIdentifier,
            question: rfi.question,
          officialResponse: rfi.officialResponse,
          officialResponseStatus: rfi.officialResponseStatus,
          suggestedAnswer: rfi.suggestedAnswer,
            locationDescription: rfi.locationDescription,
          locations: rfi.locations,
            discipline: rfi.discipline,
            category: rfi.category,
            costImpact: rfi.costImpact,
            scheduleImpact: rfi.scheduleImpact,
          reference: rfi.reference,
          // Response and workflow information
          commentsCount: rfi.commentsCount,
          responses: rfi.responses,
          rfiUrl: rfi.links?.web?.href || 
                  `${getAccWebUrl()}/build/rfis/projects/${selectedProject.id.replace(/^b\./, '')}?preview=${rfi.id}`,
          draftResponses: rfi.draftResponses,
          permittedActions: rfi.permittedActions
        });
      }
      
      return processedRfis;
    } catch (error) {
      console.error('❌ Error fetching RFIs from ACC:', error);
      return [];
    }
  };

  const fetchReviewsFromACC = async () => {
    try {
      console.log('🔍 Fetching reviews from ACC...');
      console.log(`🔍 Project ID: ${selectedProject.id}`);
      
      // Use ACC Reviews API
      const reviews = await AccService.getProjectReviews(selectedProject.id);
      console.log(`📊 Raw reviews data from API:`, reviews);
      console.log(`📊 Reviews count: ${reviews?.length || 0}`);
      console.log(`📊 First review:`, reviews?.[0]);
      
      const processedReviews = [];
      
      for (const review of reviews) {
        // Skip closed/approved-equivalent reviews
        if (isClosedLikeStatus(review.status)) {
          continue;
        }
        const assignedToName = review.nextActionBy?.claimedBy?.[0]?.name || 
                              review.nextActionBy?.candidates?.users?.[0]?.name || 
                              review.nextActionBy?.candidates?.roles?.[0]?.name || 
                              review.createdBy?.name ||
                              'Unassigned';
        let assignedToId = review.nextActionBy?.claimedBy?.[0]?.id || 
                            review.nextActionBy?.candidates?.users?.[0]?.id ||
                            review.createdBy?.id;
        
        // Use enhanced email fetching for Reviews
        let assignedToEmail = 'No email available';
        let assignedToUID = 'N/A';
        
        if (assignedToId) {
          assignedToEmail = getUserEmail(assignedToId);
          // If no email found, try to fetch it
          if (assignedToEmail === 'No email available') {
            try {
              assignedToEmail = await fetchUserEmail(assignedToId);
            } catch (error) {
              console.log(`⚠️ Could not fetch email for review user ${assignedToId}:`, error);
            }
          }
        }
        
        // Fallback: If still no email, try to find by name in userIdToEmail and uidToEmailMap
        if (assignedToEmail === 'No email available' && assignedToName && assignedToName !== 'Unassigned') {
          console.log(`🔍 Email not found by ID, trying to find by name: "${assignedToName}"`);
          const assignedNameLower = assignedToName.toLowerCase().trim();
          
          // First try exact name match in userIdToEmail
          let foundEntry = Object.entries(userIdToEmail).find(([userId, email]) => 
            email !== 'No email available' && 
            userIdToName[userId]?.toLowerCase().trim() === assignedNameLower
          );
          
          // If no exact match, try partial match (first name or last name)
          if (!foundEntry) {
            const nameParts = assignedNameLower.split(/\s+/);
            foundEntry = Object.entries(userIdToEmail).find(([userId, email]) => {
              if (email === 'No email available') return false;
              const mappedName = userIdToName[userId]?.toLowerCase().trim() || '';
              // Check if any part of the assigned name matches any part of the mapped name
              return nameParts.some(part => mappedName.includes(part) || part.includes(mappedName.split(' ')[0]));
            });
          }
          
          if (foundEntry) {
            assignedToEmail = foundEntry[1];
            assignedToId = foundEntry[0]; // Update to use the found user ID
            console.log(`✅ Found email by name lookup in userIdToEmail: ${assignedToEmail}`);
          } else {
            // Try uidToEmailMap if userIdToEmail didn't work (exact match first)
            let foundUidEntry = Object.entries(uidToEmailMap).find(([uid, email]) => {
              if (!email || email === 'No email available') return false;
              const userName = userIdToName[uid]?.toLowerCase().trim() || '';
              return userName === assignedNameLower;
            });
            
            // If no exact match, try partial match
            if (!foundUidEntry) {
              const nameParts = assignedNameLower.split(/\s+/);
              foundUidEntry = Object.entries(uidToEmailMap).find(([uid, email]) => {
                if (!email || email === 'No email available') return false;
                const userName = userIdToName[uid]?.toLowerCase().trim() || '';
                // Check if any part of the assigned name matches
                return nameParts.some(part => userName.includes(part) || part.includes(userName.split(' ')[0]));
              });
            }
            
            if (foundUidEntry) {
              assignedToEmail = foundUidEntry[1];
              assignedToId = foundUidEntry[0]; // Update to use the found UID
              console.log(`✅ Found email by name lookup in uidToEmailMap: ${assignedToEmail}`);
            } else {
              console.warn(`⚠️ Could not find email for reviewer name "${assignedToName}" after all attempts`);
            }
          }
        }
        
        // Additional fallback: Check all candidate users if we still don't have an email
        if (assignedToEmail === 'No email available' && review.nextActionBy?.candidates?.users?.length > 0) {
          console.log(`🔍 Trying to find email from all candidate users (${review.nextActionBy.candidates.users.length} users)`);
          for (const candidateUser of review.nextActionBy.candidates.users) {
            if (candidateUser.name && candidateUser.name.toLowerCase() === assignedToName.toLowerCase()) {
              const candidateId = candidateUser.id || candidateUser.autodeskId;
              if (candidateId) {
                const candidateEmail = getUserEmail(candidateId);
                if (candidateEmail !== 'No email available') {
                  assignedToEmail = candidateEmail;
                  assignedToId = candidateId;
                  console.log(`✅ Found email from candidate user: ${assignedToEmail}`);
                  break;
                }
              }
            }
          }
        }
        
        // Final fallback: If still no email and we have a name, try direct name matching in all mappings with fuzzy matching
        if (assignedToEmail === 'No email available' && assignedToName && assignedToName !== 'Unassigned') {
          console.log(`🔍 Final fallback: Searching all mappings for "${assignedToName}"`);
          const nameParts = assignedToName.toLowerCase().trim().split(/\s+/);
          
          // Search through ALL user mappings (userIdToEmail and uidToEmailMap combined)
          const allUserEntries = [
            ...Object.entries(userIdToEmail).map(([id, email]) => ({ id, email, name: userIdToName[id] })),
            ...Object.entries(uidToEmailMap).map(([uid, email]) => ({ id: uid, email, name: userIdToName[uid] }))
          ];
          
          for (const entry of allUserEntries) {
            if (!entry.email || entry.email === 'No email available') continue;
            
            const entryName = (entry.name || '').toLowerCase().trim();
            
            // Try exact match
            if (entryName === assignedToName.toLowerCase().trim()) {
              assignedToEmail = entry.email;
              assignedToId = entry.id;
              console.log(`✅ Found email via final fallback (exact match): ${assignedToEmail}`);
              break;
            }
            
            // Try partial match (any name part)
            if (nameParts.length > 0) {
              const matchesPart = nameParts.some(part => 
                entryName.includes(part) || 
                entryName.split(/\s+/).some(entryPart => entryPart.includes(part))
              );
              
              if (matchesPart) {
                assignedToEmail = entry.email;
                assignedToId = entry.id;
                console.log(`✅ Found email via final fallback (partial match): ${assignedToEmail}`);
                break;
              }
            }
          }
        }
        
        // Get UID from the mapping if we have an email
        if (assignedToEmail && assignedToEmail !== 'No email available') {
          const emailLower = assignedToEmail.toLowerCase().trim();
          assignedToUID = Object.keys(uidToEmailMap).find(uid => 
            uidToEmailMap[uid]?.toLowerCase() === emailLower
          ) || 'N/A';
        }
        
        console.log(`🔍 Review "${review.name}" assigned to:`, {
          name: assignedToName,
          id: assignedToId,
          email: assignedToEmail,
          uid: assignedToUID
        });
        
        processedReviews.push({
          id: review.id,
          title: review.name || 'Untitled Review',
          description: review.description || `Review: ${review.name} - Status: ${review.status}`,
          dueDate: review.currentStepDueDate || review.createdAt, // Use createdAt as fallback
          assignedTo: assignedToName,
          assignedToEmail: assignedToEmail,
          assignedToUID: assignedToUID,
          role: review.nextActionBy?.candidates?.roles?.[0]?.name || 'Reviewer',
          priority: review.status === 'OPEN' ? 'high' : 
                   review.status === 'CLOSED' ? 'low' : 'medium',
          status: getItemStatus(review.currentStepDueDate || review.createdAt),
          reminderDate: calculateReminderDate(review.currentStepDueDate || review.createdAt),
          message: `Review: ${review.name} is due for completion.`,
          sequenceId: review.sequenceId,
          reviewStatus: review.status,
          workflowId: review.workflowId,
          createdBy: review.createdBy?.name,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          finishedAt: review.finishedAt,
          currentStepId: review.currentStepId,
          currentStepDueDate: review.currentStepDueDate,
          // Enhanced review-specific data
          reviewUrl: review.links?.web?.href || 
                     `${getAccWebUrl()}/docs/reviews/projects/${selectedProject.id.replace(/^b\./, '')}/${review.id}?pageIndex=1&sort=-sequenceId`,
          daysOverdue: review.currentStepDueDate ? 
                       Math.ceil((new Date() - new Date(review.currentStepDueDate)) / (1000 * 60 * 60 * 24)) : 0,
          // Enhanced message based on overdue status
          message: review.currentStepDueDate && new Date(review.currentStepDueDate) < new Date() ? 
                   `This review is ${Math.ceil((new Date() - new Date(review.currentStepDueDate)) / (1000 * 60 * 60 * 24))} day${Math.ceil((new Date() - new Date(review.currentStepDueDate)) / (1000 * 60 * 60 * 24)) > 1 ? 's' : ''} overdue` :
                   `Review: ${review.name} is due for completion.`
        });
      }
      
      return processedReviews;
    } catch (error) {
      console.error('❌ Error fetching reviews from ACC:', error);
      return [];
    }
  };

  const fetchMeetingsFromACC = async () => {
    try {
      console.log('🔍 Fetching meetings from ACC...');
      const meetings = await AccService.getProjectMeetings(selectedProject.id);
      console.log(`📊 Raw meetings data from API: ${meetings?.length || 0}`);

      const processedMeetings = [];

      for (const meeting of meetings || []) {
        const meetingStatus = (meeting.status || meeting.state || '').toString().toLowerCase();
        if (['closed', 'completed', 'cancelled', 'canceled'].includes(meetingStatus)) {
          continue;
        }

        const organizer =
          meeting.organizer ||
          meeting.host ||
          meeting.createdBy ||
          meeting.owner ||
          {};

        const assignedToName =
          organizer.name ||
          organizer.displayName ||
          meeting.organizerName ||
          meeting.hostName ||
          'Unassigned';

        const assignedToEmail =
          organizer.email ||
          organizer.mail ||
          meeting.organizerEmail ||
          meeting.hostEmail ||
          'No email available';

        const startDate = meeting.startDate || meeting.startTime || meeting.meetingDate || meeting.createdAt;
        const endDate = meeting.endDate || meeting.endTime || meeting.scheduledEnd || startDate;
        const dueDate = endDate || startDate;

        processedMeetings.push({
          id: meeting.id || meeting.meetingId || `meeting-${Math.random().toString(36).slice(2)}`,
          title: meeting.title || meeting.subject || meeting.name || 'Untitled Meeting',
          description: meeting.description || meeting.agenda || 'Meeting requires attention',
          dueDate,
          assignedTo: assignedToName,
          assignedToEmail,
          role: 'Meeting Organizer',
          priority: meetingStatus === 'open' || meetingStatus === 'scheduled' ? 'medium' : 'low',
          status: getItemStatus(dueDate),
          reminderDate: calculateReminderDate(dueDate),
          message: `Meeting: ${meeting.title || meeting.subject || 'Untitled Meeting'} is scheduled.`,
          meetingStatus,
          startDate,
          endDate,
          location: meeting.location?.name || meeting.location || 'N/A',
          meetingUrl: meeting.links?.web?.href || meeting.url || null
        });
      }

      console.log(`✅ Meetings processed: ${processedMeetings.length}`);
      return processedMeetings;
    } catch (error) {
      console.error('❌ Error fetching meetings from ACC:', error);
      return [];
    }
  };

  const fetchFormsFromACC = async () => {
    try {
      console.log('🔍 Fetching forms from ACC...');
      // Use ACC Forms API
      const forms = await AccService.getProjectForms(selectedProject.id);
      console.log('📊 Raw forms data:', forms);
      
      const processedForms = [];
      
      // Pre-fetch all unique UIDs from forms to resolve them in batch
      const uniqueUIDs = new Set();
      forms.forEach(form => {
        if (form.assigneeId && form.assigneeType === 'user') {
          const isUID = /^[A-Z0-9]{10,16}$/i.test(form.assigneeId) && !form.assigneeId.includes('-');
          if (isUID && !uidToEmailMap[form.assigneeId]) {
            uniqueUIDs.add(form.assigneeId);
          }
        }
        if (form.createdBy && /^[A-Z0-9]{10,16}$/i.test(form.createdBy) && !form.createdBy.includes('-')) {
          uniqueUIDs.add(form.createdBy);
        }
      });
      
      console.log(`🔍 Found ${uniqueUIDs.size} unique UIDs to resolve`);
      
      // Try to resolve UIDs by fetching project user details for each
      const uidResolutionMap = {};
      for (const uid of uniqueUIDs) {
        try {
          // Try to get user details from Construction Admin API using the UID
          const userDetails = await AccService.getUserById(selectedProject.id, uid);
          if (userDetails && userDetails.email) {
            uidResolutionMap[uid] = {
              name: userDetails.name,
              email: userDetails.email
            };
            console.log(`✅ Resolved UID ${uid} -> ${userDetails.email}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not resolve UID ${uid}:`, error.message);
        }
      }
      
      console.log(`✅ Resolved ${Object.keys(uidResolutionMap).length}/${uniqueUIDs.size} UIDs`);
      
      for (const form of forms) {
        // Simplified assignment logic
        let assignedTo = 'Unassigned';
        let assignedToEmail = 'No email available';
        let assignedToId = null;
        
        // The assigneeId can be a user UID, company ID, or role ID
        // assigneeType tells us which: "user", "company", or "role"
        if (form.assigneeId && form.assigneeType === 'user') {
          assignedToId = form.assigneeId;
          
          // Check if this is an Autodesk ID (UUID format with dashes)
          const isAutodeskId = form.assigneeId.includes('-');
          
          if (isAutodeskId) {
            // Standard Autodesk ID - check userIdToName/userIdToEmail
            assignedTo = userIdToName[form.assigneeId] || form.assigneeId;
            assignedToEmail = userIdToEmail[form.assigneeId] || 'No email available';
          } else {
            // It's a UID - check our resolution map first, then uidToEmailMap
            if (uidResolutionMap[form.assigneeId]) {
              assignedTo = uidResolutionMap[form.assigneeId].name;
              assignedToEmail = uidResolutionMap[form.assigneeId].email;
            } else if (uidToEmailMap[form.assigneeId]) {
              assignedToEmail = uidToEmailMap[form.assigneeId];
              // Use name from uidToNameMap if available, otherwise derive from email
              assignedTo = uidToNameMap[form.assigneeId] || assignedToEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            } else {
              // Unknown UID - skip this form
              console.log(`⚠️ Form ${form.name} has unknown UID ${form.assigneeId}, skipping`);
              continue;
            }
          }
        }
        // Check createdBy as fallback if no assigneeId
        else if (form.createdBy) {
          assignedToId = form.createdBy;
          
          // Check if createdBy is a UID
          const isUID = /^[A-Z0-9]{10,16}$/i.test(form.createdBy) && !form.createdBy.includes('-');
          if (isUID && uidResolutionMap[form.createdBy]) {
            assignedTo = uidResolutionMap[form.createdBy].name;
            assignedToEmail = uidResolutionMap[form.createdBy].email;
          } else {
            assignedTo = userIdToName[form.createdBy] || form.createdBy;
            assignedToEmail = userIdToEmail[form.createdBy] || uidToEmailMap[form.createdBy] || 'No email available';
          }
        }
        // Skip forms with no user assignment
        else {
          console.log(`⚠️ Form ${form.name} has no user assignment, skipping`);
          continue;
        }
        
        // Safety check - ensure assignedToEmail is never undefined
        if (assignedToEmail === undefined || assignedToEmail === null) {
          assignedToEmail = 'No email available';
          console.log('⚠️ assignedToEmail was undefined/null, set to default');
        }
        
        console.log(`✅ Form ${form.name} - Assigned to: ${assignedTo}, Email: ${assignedToEmail}`);
        
        processedForms.push({
        id: form.id,
        title: form.name || 'Untitled Form',
        description: `Form: ${form.name} - Status: ${form.status}`,
          dueDate: form.formDate || form.dueDate || form.createdAt,
          assignedTo: assignedTo,
          assignedToEmail: assignedToEmail,
          assignedToType: 'user',
          role: 'Form User',
          priority: form.status === 'CLOSED' ? 'low' : 
                   form.status === 'IN_PROGRESS' ? 'medium' : 'high',
          status: getItemStatus(form.formDate || form.dueDate || form.createdAt),
          reminderDate: calculateReminderDate(form.formDate || form.dueDate || form.createdAt),
        message: `Form: ${form.name} is due for completion.`,
        formStatus: form.status,
        createdBy: form.createdBy?.name,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        completedAt: form.completedAt,
        formType: form.formType,
          workflowId: form.workflowId,
          formId: form.id,
          templateName: form.template?.name || form.templateName,
          location: form.location,
          formUrl: form.links?.web?.href || 
                  `${getAccWebUrl()}/build/forms/projects/${selectedProject.id.replace(/^b\./, '')}/field-reports/${form.formTemplate?.id || 'unknown'}/reports/${form.id}`
        });
      }
      
      console.log(`✅ Processed ${processedForms.length} forms`);
      return processedForms;
    } catch (error) {
      console.error('❌ Error fetching forms from ACC:', error);
      return [];
    }
  };


  // RFI Details Functions
  const fetchRfiDetails = async (rfiId) => {
    try {
      console.log('🔍 Fetching RFI details for:', rfiId);
      const details = await AccService.getRfiDetails(selectedProject.id, rfiId);
      console.log('📋 RFI Details:', details);
      return details;
    } catch (error) {
      console.error('❌ Error fetching RFI details:', error);
      return null;
    }
  };

  const viewRfiDetails = async (rfiId) => {
    try {
      const details = await fetchRfiDetails(rfiId);
      if (details) {
        // Create a comprehensive detailed view of the RFI
        const detailsText = `
📋 RFI DETAILS
═══════════════════════════════════════

🔍 BASIC INFORMATION
• ID: ${details.id}
• Custom ID: ${details.customIdentifier || 'N/A'}
• Title: ${details.title}
• Status: ${details.status}
• Workflow: ${details.workflowType}
• Type: ${details.rfiType}

📝 CONTENT
• Question: ${details.question || 'No question provided'}
• Official Response: ${details.officialResponse || 'No response yet'}
• Response Status: ${details.officialResponseStatus || 'Unanswered'}
• Suggested Answer: ${details.suggestedAnswer || 'None'}

⏰ DATES & TIMELINE
• Created: ${details.createdAt ? new Date(details.createdAt).toLocaleDateString() : 'Unknown'}
• Due Date: ${details.dueDate ? new Date(details.dueDate).toLocaleDateString() : 'Not set'}
• Response Due: ${details.responseDueDate ? new Date(details.responseDueDate).toLocaleDateString() : 'Not set'}
• Last Updated: ${details.updatedAt ? new Date(details.updatedAt).toLocaleDateString() : 'Unknown'}
• Answered: ${details.answeredAt ? new Date(details.answeredAt).toLocaleDateString() : 'Not answered'}

👥 ASSIGNMENT & WORKFLOW
• Assigned To: ${details.assignedTo}
• Manager: ${details.managerId || 'Not assigned'}
• Construction Manager: ${details.constructionManagerId || 'Not assigned'}
• Comments: ${details.commentsCount || 0}

📍 LOCATION & CATEGORIZATION
• Location: ${details.locationDescription || 'Not specified'}
• Discipline: ${details.discipline ? details.discipline.join(', ') : 'Not specified'}
• Category: ${details.category ? details.category.join(', ') : 'Not specified'}
• Priority: ${details.priority || 'Not set'}

📊 IMPACT ASSESSMENT
• Cost Impact: ${details.costImpact || 'Not assessed'}
• Schedule Impact: ${details.scheduleImpact || 'Not assessed'}
• Reference: ${details.reference || 'None'}

🔧 RESPONSES & COMMENTS
• Total Responses: ${details.responses ? details.responses.length : 0}
• Draft Responses: ${details.draftResponses ? details.draftResponses.length : 0}
• Comments Count: ${details.commentsCount || 0}
        `;
        alert(detailsText);
      } else {
        alert('❌ Could not fetch RFI details');
      }
    } catch (error) {
      console.error('❌ Error viewing RFI details:', error);
      alert('❌ Error loading RFI details');
    }
  };

  // Outlook Integration Functions

  const generateRandomString = (length) => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // Disconnect from Outlook
  const disconnectOutlook = () => {
    try {
      console.log('🔌 Disconnecting from Outlook...');
      
      // Clear Outlook tokens from localStorage
      localStorage.removeItem('outlook_tokens');
      localStorage.removeItem('outlook_oauth_state');
      localStorage.removeItem('outlook_oauth_started');
      
      // Update connection status
      setOutlookConnected(false);
      
      console.log('✅ Disconnected from Outlook');
      alert('✅ Successfully disconnected from Outlook. You can connect with a different user if needed.');
    } catch (error) {
      console.error('❌ Error disconnecting from Outlook:', error);
      alert(`❌ Error disconnecting from Outlook: ${error.message}`);
    }
  };

  const openOutlookLogin = () => {
    if (!autoReminderSettings.outlookClientId || !autoReminderSettings.outlookTenantId) {
      alert('❌ Please configure Client ID and Tenant ID first.');
      return;
    }
    
    // Validate Client ID is correct (not the Secret ID)
    if (autoReminderSettings.outlookClientId === 'a8291bcf-ced0-44f0-a665-3022f497a189') {
      alert('❌ Error: The Client ID field contains the Client Secret ID instead!\n\n' +
            'Please update the Client ID field with: 2a998440-08f4-44ee-a5dc-36b03f30eb17\n\n' +
            'The Client Secret ID (a8291bcf-ced0-44f0-a665-3022f497a189) should NOT be used as the Client ID.');
      return;
    }

    // Generate and store state parameter for verification
    const state = generateRandomString(32);
    localStorage.setItem('outlook_oauth_state', state);
    localStorage.setItem('outlook_oauth_started', Date.now().toString());
    
    const redirectUri = `${window.location.origin}/auth/callback`;
    // Include openid, profile, email for proper OAuth 2.0 flow
    const scope = 'openid profile email https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access';
    const authUrl = `https://login.microsoftonline.com/${autoReminderSettings.outlookTenantId}/oauth2/v2.0/authorize?` +
      `client_id=${autoReminderSettings.outlookClientId}&` +
      `response_type=code&` +
      `response_mode=query&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `prompt=select_account`;

    console.log('🔗 Opening Outlook login:', authUrl);
    console.log('🔑 Stored state:', state);
    
    // Open popup and listen for messages
    const popup = window.open(authUrl, 'outlook-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
    
    // Listen for messages from popup
    const handleMessage = (event) => {
      // Security: only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OUTLOOK_OAUTH_SUCCESS') {
        console.log('✅ Outlook OAuth successful');
        const { accessToken, refreshToken, expiresIn } = event.data;
        
        // Save Outlook tokens
        const outlookTokens = {
          accessToken,
          refreshToken,
          expiresIn,
          tokenExpiry: Date.now() + (expiresIn * 1000)
        };
        localStorage.setItem('outlook_tokens', JSON.stringify(outlookTokens));
        setOutlookConnected(true); // Update connection status
        console.log('✅ Outlook connected - status updated');
        
        alert('✅ Successfully signed in to Outlook! You can now send reminders via Outlook.');
        
        // Clean up
        window.removeEventListener('message', handleMessage);
        if (popup) popup.close();
      } else if (event.data.type === 'OUTLOOK_OAUTH_ERROR') {
        console.error('❌ Outlook OAuth error:', event.data.error);
        alert(`❌ Outlook sign-in failed: ${event.data.error}`);
        window.removeEventListener('message', handleMessage);
        if (popup) popup.close();
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Clean up listener after 10 minutes (timeout)
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      if (popup && !popup.closed) {
        popup.close();
      }
    }, 600000); // 10 minutes
  };

  // Helper functions

  const getRfiPriority = (priority, status) => {
    const rfiPriority = (priority || '').toLowerCase();
    const rfiStatus = (status || '').toLowerCase();
    
    // High priority for high priority RFIs or open RFIs
    if (rfiPriority === 'high' || rfiStatus === 'open') {
      return 'high';
    }
    
    // Medium priority for medium priority RFIs or pending/submitted RFIs
    if (rfiPriority === 'medium' || rfiStatus === 'pending' || rfiStatus === 'submitted' || 
        rfiStatus === 'in_review') {
      return 'medium';
    }
    
    // Low priority for low priority RFIs or closed RFIs
    if (rfiPriority === 'low' || rfiStatus === 'closed') {
      return 'low';
    }
    
    return 'medium'; // Default priority
  };

  const getItemStatus = (dueDate) => {
    if (!dueDate) return 'pending';
    const today = new Date();
    const due = new Date(dueDate);
    return due < today ? 'overdue' : 'pending';
  };

  const calculateReminderDate = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const reminderDate = new Date(due);
    reminderDate.setDate(reminderDate.getDate() - autoReminderSettings.reminderDaysBefore);
    return reminderDate.toISOString().split('T')[0];
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const isUpcoming = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const reminderDays = autoReminderSettings.reminderDaysBefore || 3;
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + reminderDays);
    
    return due >= today && due <= reminderDate;
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'completed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'gray';
    }
  };

  // Automatic reminder system
  const checkAndSendOverdueReminders = async (items) => {
    console.log('🔍 checkAndSendOverdueReminders called with items:', items);
    
    // Check if reminder system is manually started
    if (!reminderSystemActive) {
      console.log('🛑 Reminder system not active - skipping reminder sending');
      return;
    }
    
    // Add null/undefined check for items parameter
    if (!items || !Array.isArray(items)) {
      console.log('⚠️ No items provided to checkAndSendOverdueReminders, skipping reminder check');
      return;
    }
    
    console.log('✅ Items validation passed, filtering overdue items...');
    const overdueItems = items.filter(item => isOverdue(item.dueDate));
    
    if (overdueItems.length > 0) {
      console.log(`🔔 Found ${overdueItems.length} overdue items, sending automatic reminders...`);
      
      for (const item of overdueItems) {
        await sendAutomaticReminder(item);
      }
    }
  };

  const sendAutomaticReminder = async (item) => {
    try {
      const message = autoReminderSettings.messageTemplate;
      
      // Get the assigned user name
      const assignedUserName = item.assignedTo || item.createdBy || '';
      
      // Get the email address for the recipient - use ONLY assignedToEmail, never fallback to name
      let recipientEmail = item.assignedToEmail || 'No email available';
      
      console.log(`📧 Sending automatic reminder for: ${item.title}`);
      console.log(`📧 To: ${assignedUserName} (${item.role})`);
      console.log(`📧 Initial email lookup: ${recipientEmail}`);
      
      // If no email found, try to find by name (same logic as sendIndividualReminder)
      if (!recipientEmail || recipientEmail === 'No email available' || 
          recipientEmail === assignedUserName || 
          !recipientEmail.includes('@')) {
        
        console.log(`⚠️ Email not found directly for automatic reminder, trying to find by name: "${assignedUserName}"`);
        
        // Try to find email by name in userIdToEmail (exact match first)
        if (assignedUserName && assignedUserName !== 'Unassigned') {
          const assignedNameLower = assignedUserName.toLowerCase().trim();
          
          // First try exact name match
          let foundEntry = Object.entries(userIdToEmail).find(([userId, email]) => 
            email !== 'No email available' && 
            userIdToName[userId]?.toLowerCase().trim() === assignedNameLower
          );
          
          // If no exact match, try partial match (first name or last name)
          if (!foundEntry) {
            const nameParts = assignedNameLower.split(/\s+/);
            foundEntry = Object.entries(userIdToEmail).find(([userId, email]) => {
              if (email === 'No email available') return false;
              const mappedName = userIdToName[userId]?.toLowerCase().trim() || '';
              // Check if any part of the assigned name matches any part of the mapped name
              return nameParts.some(part => mappedName.includes(part) || part.includes(mappedName.split(' ')[0]));
            });
          }
          
          if (foundEntry) {
            recipientEmail = foundEntry[1];
            console.log(`✅ Found email by name lookup in userIdToEmail: ${recipientEmail}`);
          } else {
            // Try uidToEmailMap if userIdToEmail didn't work (exact match first)
            let foundUidEntry = Object.entries(uidToEmailMap).find(([uid, email]) => {
              if (!email || email === 'No email available') return false;
              const userName = userIdToName[uid]?.toLowerCase().trim() || '';
              return userName === assignedNameLower;
            });
            
            // If no exact match, try partial match
            if (!foundUidEntry) {
              const nameParts = assignedNameLower.split(/\s+/);
              foundUidEntry = Object.entries(uidToEmailMap).find(([uid, email]) => {
                if (!email || email === 'No email available') return false;
                const userName = userIdToName[uid]?.toLowerCase().trim() || '';
                // Check if any part of the assigned name matches
                return nameParts.some(part => userName.includes(part) || part.includes(userName.split(' ')[0]));
              });
            }
            
            if (foundUidEntry) {
              recipientEmail = foundUidEntry[1];
              console.log(`✅ Found email by name lookup in uidToEmailMap: ${recipientEmail}`);
            }
          }
        }
      }
      
      // Final validation: Only send if we have a valid email address
      if (!recipientEmail || recipientEmail === 'No email available' || 
          recipientEmail === assignedUserName || 
          !recipientEmail.includes('@')) {
        console.warn(`⚠️ No valid email address found for item ${item.id} (${item.title}). Skipping reminder to avoid sending to wrong recipient.`);
        console.warn(`   Assigned to: ${assignedUserName}`);
        console.warn(`   Email found: ${recipientEmail}`);
        return;
      }
      
      console.log(`📧 Final email to use: ${recipientEmail}`);

      // Send via Microsoft Graph if Outlook is connected
      const outlookTokensRaw = localStorage.getItem('outlook_tokens');
      if (!outlookTokensRaw) {
        console.warn('⚠️ Outlook is not connected. Skipping automatic reminder.');
        return;
      }
      let accessToken = '';
      try {
        const outlookTokens = JSON.parse(outlookTokensRaw);
        // Check if token is expired
        if (outlookTokens.tokenExpiry && outlookTokens.tokenExpiry < Date.now()) {
          console.warn('⚠️ Outlook token expired. Skipping automatic reminder.');
          return;
        }
        accessToken = outlookTokens?.accessToken || outlookTokens?.access_token || '';
      } catch (e) {
        console.warn('⚠️ Failed to parse Outlook tokens. Skipping automatic reminder.');
        return;
      }
      if (!accessToken) {
        console.warn('⚠️ No Outlook access token found. Skipping automatic reminder.');
        return;
      }

      const fromEmail = (autoReminderSettings.senderEmail || '8445svc_zoyantra.testing@cewa.edu.au').trim();
      const subject = 'Project Reminder - Action Required';
      const bodyText = message;

      const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`;
      
      // Build recipients array
      const recipients = {
        toRecipients: [{ emailAddress: { address: recipientEmail } }],
        ccRecipients: []
      };
      
      // Add CC recipients if configured
      if (autoReminderSettings.ccEmail && autoReminderSettings.ccEmail.trim()) {
        const ccEmails = autoReminderSettings.ccEmail.split(',').map(email => email.trim()).filter(email => email && email.includes('@'));
        recipients.ccRecipients = ccEmails.map(email => ({ emailAddress: { address: email } }));
      }
      
      const mailPayload = {
        message: {
          subject,
          body: { contentType: 'Text', content: bodyText },
          ...recipients,
          from: { emailAddress: { address: fromEmail } }
        },
        saveToSentItems: true
      };

      console.log('📤 Sending automatic reminder via Microsoft Graph:', graphUrl);
      const graphResp = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mailPayload)
      });

      if (!graphResp.ok) {
        const errText = await graphResp.text();
        console.error('❌ Graph sendMail failed for automatic reminder:', graphResp.status, errText);
        // Don't throw - just log and skip this reminder
        // Token expiry will be handled on next check
        return;
      }

      // Log the email details on success
      console.log('📧 Automatic Email Details:');
      console.log(`   From: ${autoReminderSettings.senderEmail}`);
      console.log(`   To: ${recipientEmail}`);
      if (autoReminderSettings.ccEmail && autoReminderSettings.ccEmail.trim()) {
        console.log(`   CC: ${autoReminderSettings.ccEmail}`);
      }
      console.log(`   Recipient Name: ${item.assignedTo}`);
      console.log(`   Subject: Project Reminder - Action Required`);
      console.log(`   Body: ${message}`);
      console.log(`   Item: ${item.title} (${item.id})`);
      console.log(`   Due: ${item.dueDate}`);
      console.log(`   Status: ${item.status}`);
      
      console.log('✅ Automatic reminder sent successfully via Outlook Graph');
      
    } catch (error) {
      console.error('❌ Error sending automatic reminder:', error);
    }
  };

  // Send reminder for individual item
  const sendIndividualReminder = async (item) => {
    try {
      const message = autoReminderSettings.messageTemplate || 'Reminder: You have pending items that require your attention. Please review and take action on overdue tasks in your project.';
      
      // Get the assigned user name
      const assignedUserName = item.assignedTo || item.createdBy || '';
      
      // Get the email address for the recipient - try multiple fallbacks
      let recipientEmail = item.assignedToEmail || 'No email available';
      
      console.log(`📧 Sending manual reminder for: ${item.title || item.name}`);
      console.log(`📧 To: ${assignedUserName}`);
      console.log(`📧 Initial email lookup: ${recipientEmail}`);
      
      // If no email found or email is invalid, try to find by name
      if (!recipientEmail || recipientEmail === 'No email available' || 
          recipientEmail === assignedUserName || 
          !recipientEmail.includes('@')) {
        
        console.log(`⚠️ Email not found directly, trying to find by name: "${assignedUserName}"`);
        
        // Try to find email by name in userIdToEmail (exact match first)
        if (assignedUserName && assignedUserName !== 'Unassigned') {
          const assignedNameLower = assignedUserName.toLowerCase().trim();
          
          // First try exact name match
          let foundEntry = Object.entries(userIdToEmail).find(([userId, email]) => 
            email !== 'No email available' && 
            userIdToName[userId]?.toLowerCase().trim() === assignedNameLower
          );
          
          // If no exact match, try partial match (first name or last name)
          if (!foundEntry) {
            const nameParts = assignedNameLower.split(/\s+/);
            foundEntry = Object.entries(userIdToEmail).find(([userId, email]) => {
              if (email === 'No email available') return false;
              const mappedName = userIdToName[userId]?.toLowerCase().trim() || '';
              // Check if any part of the assigned name matches any part of the mapped name
              return nameParts.some(part => mappedName.includes(part) || part.includes(mappedName.split(' ')[0]));
            });
          }
          
          if (foundEntry) {
            recipientEmail = foundEntry[1];
            console.log(`✅ Found email by name lookup in userIdToEmail: ${recipientEmail}`);
          }
        }
        
        // If still not found, try uidToEmailMap (exact match first)
        if ((!recipientEmail || recipientEmail === 'No email available' || !recipientEmail.includes('@')) && assignedUserName) {
          const assignedNameLower = assignedUserName.toLowerCase().trim();
          
          // First try exact name match
          let foundUidEntry = Object.entries(uidToEmailMap).find(([uid, email]) => {
            if (!email || email === 'No email available') return false;
            const userName = userIdToName[uid]?.toLowerCase().trim() || '';
            return userName === assignedNameLower;
          });
          
          // If no exact match, try partial match
          if (!foundUidEntry) {
            const nameParts = assignedNameLower.split(/\s+/);
            foundUidEntry = Object.entries(uidToEmailMap).find(([uid, email]) => {
              if (!email || email === 'No email available') return false;
              const userName = userIdToName[uid]?.toLowerCase().trim() || '';
              // Check if any part of the assigned name matches
              return nameParts.some(part => userName.includes(part) || part.includes(userName.split(' ')[0]));
            });
          }
          
          if (foundUidEntry) {
            recipientEmail = foundUidEntry[1];
            console.log(`✅ Found email by name lookup in uidToEmailMap: ${recipientEmail}`);
          }
        }
        
        // Final check - if still no valid email, show error
        if (!recipientEmail || recipientEmail === 'No email available' || 
            recipientEmail === assignedUserName || 
            !recipientEmail.includes('@')) {
          console.warn(`⚠️ No valid email address found after all fallbacks.`);
          alert(`Cannot send reminder: No email address found for ${assignedUserName || 'the assigned user'}`);
          return;
        }
      }
      
      console.log(`📧 Final email to use: ${recipientEmail}`);

      // Send via Microsoft Graph if Outlook is connected
      const outlookTokensRaw = localStorage.getItem('outlook_tokens');
      if (!outlookTokensRaw) {
        alert('❌ Outlook is not connected. Please sign in to Outlook in Admin Settings first.');
        return;
      }
      let accessToken = '';
      try {
        const outlookTokens = JSON.parse(outlookTokensRaw);
        accessToken = outlookTokens?.accessToken || outlookTokens?.access_token || '';
      } catch (e) {
        // Fallback handled below
      }
      if (!accessToken) {
        alert('❌ No Outlook access token found. Please re-connect Outlook.');
        return;
      }

      const fromEmail = (autoReminderSettings.senderEmail || '8445svc_zoyantra.testing@cewa.edu.au').trim();
      const subject = 'Project Reminder - Action Required';
      const bodyText = message;

      const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`;
      
      // Build recipients array
      const recipients = {
        toRecipients: [{ emailAddress: { address: recipientEmail } }],
        ccRecipients: []
      };
      
      // Add CC recipients if configured
      if (autoReminderSettings.ccEmail && autoReminderSettings.ccEmail.trim()) {
        const ccEmails = autoReminderSettings.ccEmail.split(',').map(email => email.trim()).filter(email => email && email.includes('@'));
        recipients.ccRecipients = ccEmails.map(email => ({ emailAddress: { address: email } }));
      }
      
      const mailPayload = {
        message: {
          subject,
          body: { contentType: 'Text', content: bodyText },
          ...recipients,
          from: { emailAddress: { address: fromEmail } }
        },
        saveToSentItems: true
      };

      console.log('📤 Sending via Microsoft Graph:', graphUrl);
      const graphResp = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mailPayload)
      });

      if (!graphResp.ok) {
        const errText = await graphResp.text();
        console.error('❌ Graph sendMail failed:', graphResp.status, errText);
        let friendly = `Send failed (HTTP ${graphResp.status}).`;
        if (graphResp.status === 401 || graphResp.status === 403) {
          friendly += ' Your Outlook session may have expired or lacks Mail.Send permission. Please re-connect Outlook and ensure Mail.Send is consented.';
        }
        alert(`❌ ${friendly}`);
        return;
      }

      // Log the email details on success
      console.log('📧 Email Details:');
      console.log(`   From: ${autoReminderSettings.senderEmail || '8445svc_zoyantra.testing@cewa.edu.au'}`);
      console.log(`   To: ${recipientEmail}`);
      if (autoReminderSettings.ccEmail && autoReminderSettings.ccEmail.trim()) {
        console.log(`   CC: ${autoReminderSettings.ccEmail}`);
      }
      console.log(`   Subject: Project Reminder - Action Required`);
      console.log(`   Body: ${message}`);
      console.log(`   Item: ${item.title || item.name || 'Untitled'}`);
      console.log(`   Due: ${item.dueDate || item.formDate || 'N/A'}`);
      
      alert(`✅ Reminder sent successfully to ${recipientEmail}`);
      console.log('✅ Individual reminder sent successfully via Outlook Graph');
      
    } catch (error) {
      console.error('❌ Error sending individual reminder:', error);
      alert(`❌ Error sending reminder: ${error.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reminder Management</h2>
          <p className="text-gray-600">Track and manage project reminders from ACC - Issues, RFIs, Reviews, Forms, and Meetings</p>
          {reminderSystemActive && (
            <div className="mt-2 flex items-center text-sm text-green-600">
              <Bell className="w-4 h-4 mr-1" />
              <span>Reminder system is active - checking every {Math.round(autoReminderSettings.checkInterval / 60)} hours</span>
            </div>
          )}
          
          {/* Individual Tab Activation Controls */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Reminder Activation by Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Issues Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Issues</span>
                  <span className={`text-xs ${tabActivations.issues ? 'text-green-600' : 'text-red-600'}`}>
                    {tabActivations.issues ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <button
                  onClick={() => toggleTabActivation('issues')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tabActivations.issues ? 'bg-green-600' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tabActivations.issues ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* RFIs Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">RFIs</span>
                  <span className={`text-xs ${tabActivations.rfis ? 'text-green-600' : 'text-red-600'}`}>
                    {tabActivations.rfis ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <button
                  onClick={() => toggleTabActivation('rfis')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tabActivations.rfis ? 'bg-green-600' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tabActivations.rfis ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Reviews Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Reviews</span>
                  <span className={`text-xs ${tabActivations.reviews ? 'text-green-600' : 'text-red-600'}`}>
                    {tabActivations.reviews ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <button
                  onClick={() => toggleTabActivation('reviews')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tabActivations.reviews ? 'bg-green-600' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tabActivations.reviews ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Forms Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Forms</span>
                  <span className={`text-xs ${tabActivations.forms ? 'text-green-600' : 'text-red-600'}`}>
                    {tabActivations.forms ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <button
                  onClick={() => toggleTabActivation('forms')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tabActivations.forms ? 'bg-green-600' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tabActivations.forms ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Meetings Toggle */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Meetings</span>
                  <span className={`text-xs ${tabActivations.meetings ? 'text-green-600' : 'text-red-600'}`}>
                    {tabActivations.meetings ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <button
                  onClick={() => toggleTabActivation('meetings')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tabActivations.meetings ? 'bg-green-600' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tabActivations.meetings ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Override Admin Settings:</strong> You can deactivate individual reminder types even when the main reminder system is active. 
                Deactivated types will not send automatic reminders, giving you granular control over which types of items trigger notifications.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          
          {/* Reminder System Control */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              reminderSystemActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                reminderSystemActive ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              {reminderSystemActive ? 'Active' : 'Inactive'}
            </div>
            <button
              onClick={toggleReminderSystem}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                reminderSystemActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {reminderSystemActive ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </button>
          </div>
          
          <button
            onClick={loadReminders}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAdminSettings(!showAdminSettings)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <User className="w-4 h-4 mr-2" />
            Admin Settings
          </button>
        </div>
      </div>


      {/* Modern Section Tabs */}
      <div className="flex space-x-2 bg-gradient-to-r from-gray-50 to-gray-100 p-2 rounded-xl shadow-sm border border-gray-200">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <div key={section.id} className="flex items-center">
            <button
              onClick={() => {
                console.log(`🔄 Tab clicked: ${section.id}`);
                setActiveSection(section.id);
              }}
              className={`group flex items-center px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? `bg-gradient-to-r ${section.gradient} text-white shadow-lg shadow-${section.color}-200` 
                  : `${section.bgColor} ${section.textColor} hover:${section.bgColor.replace('50', '100')} hover:shadow-md border ${section.borderColor}`
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : section.iconColor} group-hover:scale-110 transition-transform duration-200`} />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm">{section.name}</span>
                <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {section.description}
                </span>
              </div>
            </button>
              
              {/* Modern Sync button for each section */}
              <button
                onClick={() => {
                  console.log(`🔄 Manual sync for section: ${section.id}`);
                  if (section.id === 'forms') {
                    loadForms();
                  } else if (section.id === 'account-users') {
                    loadAccountUsers().then(() => {
                      loadAllRemindersForUsers();
                    });
                  } else {
                    loadReminders();
                  }
                }}
                disabled={isLoading}
                className={`ml-2 p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                  isActive 
                    ? 'text-white hover:bg-white hover:bg-opacity-20 shadow-sm' 
                    : `${section.iconColor} hover:${section.iconColor.replace('600', '700')} hover:bg-white hover:shadow-sm`
                } ${isLoading ? 'opacity-50' : ''}`}
                title={`Sync ${section.name}`}
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>


      {/* Reminders List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {sections.find(s => s.id === activeSection)?.name} Reminders
          </h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading reminders...</span>
            </div>
          ) : activeSection === 'account-users' ? (
            <ProjectUsersTab 
              selectedProject={selectedProject}
              selectedHub={selectedHub}
              userIdToName={userIdToName}
              userIdToEmail={userIdToEmail}
              uidToEmailMap={uidToEmailMap}
              onLoadUsers={loadAccountUsers}
              reminders={reminders}
              forms={forms}
            />
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No {activeSection} found in ACC for this project.</p>
              <p className="text-sm text-gray-500 mt-2">Make sure you have access to the project and the data exists in ACC.</p>
            </div>
          ) : activeSection === 'reviews' ? (
            <div className="space-y-4 mt-4">
              {reminders.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No overdue reviews found for this project.</p>
                  <p className="text-sm text-gray-500 mt-2">Reviews will appear here when they are overdue and require attention.</p>
                </div>
              ) : (
                reminders.map((review) => {
                  const isOverdueItem = isOverdue(review.dueDate);
                  const isUpcomingItem = isUpcoming(review.dueDate);
                  
                  return (
                  <div
                    key={review.id}
                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                        isOverdueItem 
                          ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-red-200' 
                          : isUpcomingItem 
                            ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-yellow-200' 
                            : 'border-green-200 bg-gradient-to-br from-green-50 to-white shadow-green-100'
                      }`}
                    >
                      {/* Modern Card Header */}
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                              <Eye className="w-6 h-6 text-white" />
                            </div>
                      <div className="flex-1">
                              <h4 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {review.title || 'Untitled Review'}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{review.description || 'No description available'}</p>
                            </div>
                          </div>
                          
                          {/* Modern Status Badge */}
                          <div className="flex flex-col items-end space-y-2">
                          {review.reviewStatus && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                                {review.reviewStatus}
                            </span>
                          )}
                            {/* Priority Indicator */}
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isOverdueItem 
                                ? 'bg-red-500 text-white' 
                                : isUpcomingItem 
                                  ? 'bg-yellow-500 text-white' 
                                  : 'bg-green-500 text-white'
                            }`}>
                              {isOverdueItem ? 'Overdue' : isUpcomingItem ? 'Due Soon' : 'On Track'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Modern Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {/* Due Date */}
                          {review.dueDate && (
                              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Due Date</p>
                                  <p className="text-lg font-bold text-gray-900">{formatDate(review.dueDate)}</p>
                                </div>
                            </div>
                          )}
                            
                            {/* Assigned To */}
                            <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <User className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">Assigned To</p>
                                <p className="text-lg font-bold text-gray-900">{review.assignedTo || 'Unassigned'}</p>
                              {review.assignedToEmail && review.assignedToEmail !== 'No email available' && (
                                  <p className="text-sm text-gray-600 mt-1">{review.assignedToEmail}</p>
                              )}
                            </div>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Review-specific details */}
                            {review.currentStepDueDate && (
                              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <Clock className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Step Due</p>
                                  <p className="text-lg font-bold text-gray-900">{formatDate(review.currentStepDueDate)}</p>
                                </div>
                            </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-3 flex-wrap">
                              {review.reviewUrl && (
                                <a
                                  href={review.reviewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium text-sm"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>View Review</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Review Information */}
                        {(review.role || review.finishedAt || review.createdAt) && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {review.role && (
                            <div className="flex items-center">
                                <Circle className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">Role: {review.role}</span>
                            </div>
                          )}
                            {review.createdAt && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">Created: {formatDate(review.createdAt)}</span>
                            </div>
                          )}
                          {review.finishedAt && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-gray-600">Finished: {formatDate(review.finishedAt)}</span>
                            </div>
                          )}
                        </div>
                        )}
                        
                        {review.message && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-blue-800">
                              <strong>Message:</strong> {review.message}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Footer with Reminder Toggle and Set Reminder Button */}
                      <div className="px-6 pb-6 pt-4 border-t border-gray-200/50 flex items-center justify-between flex-wrap gap-3">
                        {/* Left side: Reminder toggle */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Reminders:</span>
                          <button
                            onClick={() => toggleItemActivation(review.id, 'reviews')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              isItemActiveForReminders(review.id, 'reviews') ? 'bg-green-500' : 'bg-red-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                isItemActiveForReminders(review.id, 'reviews') ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs ${isItemActiveForReminders(review.id, 'reviews') ? 'text-green-600' : 'text-red-600'}`}>
                            {isItemActiveForReminders(review.id, 'reviews') ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        
                        {/* Right side: Set Reminder Button */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => sendIndividualReminder(review)}
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                            title="Send reminder email to assigned user"
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Set Reminder
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeSection === 'forms' ? (
            <div className="space-y-4 mt-4">
              {forms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No forms found for this project.</p>
                  <p className="text-sm text-gray-500 mt-2">Forms will appear here when available in ACC.</p>
                </div>
              ) : (
                forms.map((form) => {
                  const isOverdueItem = form.dueDate ? isOverdue(form.dueDate) : false;
                  const isUpcomingItem = form.dueDate ? isUpcoming(form.dueDate) : false;
                  
                  return (
                    <div
                      key={form.id}
                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                        isOverdueItem 
                          ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-red-200' 
                          : isUpcomingItem 
                            ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-yellow-200' 
                            : 'border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-purple-100'
                      }`}
                    >
                      {/* Modern Card Header */}
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {form.name || form.title || 'Untitled Form'}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{form.description || 'No description available'}</p>
                            </div>
                          </div>
                          
                          {/* Modern Status Badge */}
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md ${
                              form.status === 'draft' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                              form.status === 'submitted' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                              'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                            }`}>
                              {form.status || form.formStatus || 'Unknown'}
                            </span>
                            {form.formNum && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                                Form #{form.formNum}
                              </span>
                            )}
                            {/* Priority Indicator */}
                            {form.dueDate && (
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isOverdueItem 
                                  ? 'bg-red-500 text-white' 
                                  : isUpcomingItem 
                                    ? 'bg-yellow-500 text-white' 
                                    : 'bg-green-500 text-white'
                              }`}>
                                {isOverdueItem ? 'Overdue' : isUpcomingItem ? 'Due Soon' : 'On Track'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Modern Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {/* Due Date or Form Date */}
                            {(form.dueDate || form.formDate) && (
                              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">{form.dueDate ? 'Due Date' : 'Form Date'}</p>
                                  <p className="text-lg font-bold text-gray-900">{formatDate(form.dueDate || form.formDate)}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Assigned To */}
                            {(form.assignedTo && form.assignedTo !== 'Unassigned') || form.assignedToEmail ? (
                              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <User className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700">Assigned To</p>
                                  <p className="text-lg font-bold text-gray-900">{form.assignedTo || form.createdBy || 'Unassigned'}</p>
                                  {form.assignedToEmail && form.assignedToEmail !== 'No email available' && (
                                    <p className="text-sm text-gray-600 mt-1">{form.assignedToEmail}</p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="space-y-4">
                            {/* Updated At */}
                            {form.updatedAt && (
                              <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <Clock className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                                  <p className="text-lg font-bold text-gray-900">{formatDate(form.updatedAt)}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-3 flex-wrap">
                              {form.formUrl && (
                                <a
                                  href={form.formUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium text-sm"
                          >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>View Form</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                        
                        {/* Notes */}
                        {form.notes && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-blue-800">
                              <strong>Notes:</strong> {form.notes}
                            </p>
                          </div>
              )}
            </div>
                      
                      {/* Footer with Reminder Toggle and Set Reminder Button */}
                      <div className="px-6 pb-6 pt-4 border-t border-gray-200/50 flex items-center justify-between flex-wrap gap-3">
                        {/* Left side: Reminder toggle */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Reminders:</span>
                          <button
                            onClick={() => toggleItemActivation(form.id, 'forms')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              isItemActiveForReminders(form.id, 'forms') ? 'bg-green-500' : 'bg-red-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                isItemActiveForReminders(form.id, 'forms') ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs ${isItemActiveForReminders(form.id, 'forms') ? 'text-green-600' : 'text-red-600'}`}>
                            {isItemActiveForReminders(form.id, 'forms') ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        
                        {/* Right side: Set Reminder Button */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => sendIndividualReminder(form)}
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                            title="Send reminder email to assigned user"
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Set Reminder
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeSection === 'forms-old' ? (
            <div className="space-y-4">
              {forms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No forms found for this project.</p>
                  <p className="text-sm text-gray-500 mt-2">Forms will appear here when available in ACC.</p>
                </div>
              ) : (
                forms.map((form) => (
                <div
                  key={form.id}
                  className={`border rounded-lg p-4 ${
                    form.status === 'draft' 
                      ? 'border-yellow-200 bg-yellow-50' 
                      : form.status === 'submitted'
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{form.name || 'Untitled Form'}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          form.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          form.status === 'submitted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {form.status || 'Unknown'}
                        </span>
                        {form.formNum && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Form #{form.formNum}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{form.description || 'No description available'}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        {form.formDate && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span>Form Date: {new Date(form.formDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {form.assigneeId && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span>Assignee: {form.assigneeId}</span>
                          </div>
                        )}
                        {form.locationId && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            <span>Location: {form.locationId}</span>
                          </div>
                        )}
                        {form.updatedAt && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                            <span>Updated: {new Date(form.updatedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {form.notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>Notes:</strong> {form.notes}
                          </p>
                        </div>
                      )}
                      
                      {form.pdfUrl && (
                        <div className="mt-3">
                          <a 
                            href={form.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {reminders.map((reminder) => {
                const currentSection = sections.find(s => s.id === activeSection);
                const isOverdueItem = isOverdue(reminder.dueDate);
                const isUpcomingItem = isUpcoming(reminder.dueDate);
                
                return (
                  <React.Fragment key={reminder.id}>
                    <div
                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                      isOverdueItem 
                        ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-red-200' 
                        : isUpcomingItem 
                          ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-yellow-200' 
                          : `border-${currentSection.color}-200 bg-gradient-to-br from-${currentSection.color}-50 to-white shadow-${currentSection.color}-100`
                    }`}
                    >
                  {/* Modern Card Header */}
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${currentSection.gradient} shadow-lg`}>
                          <currentSection.icon className="w-6 h-6 text-white" />
                        </div>
                    <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                            {reminder.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                        </div>
                      </div>
                      
                      {/* Modern Status Badge */}
                      <div className="flex flex-col items-end space-y-2">
                        {activeSection === 'issues' && reminder.issueStatus && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                            {reminder.issueStatus}
                        </span>
                        )}
                        {activeSection === 'rfis' && reminder.rfiStatus && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                            {reminder.rfiStatus}
                        </span>
                        )}
                        {activeSection === 'reviews' && reminder.reviewStatus && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                            {reminder.reviewStatus}
                          </span>
                        )}
                        {activeSection === 'forms' && reminder.formStatus && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md">
                            {reminder.formStatus}
                          </span>
                        )}
                        {activeSection === 'meetings' && reminder.meetingStatus && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md">
                            {reminder.meetingStatus}
                          </span>
                        )}
                        
                        {/* Priority Indicator */}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOverdueItem 
                            ? 'bg-red-500 text-white' 
                            : isUpcomingItem 
                              ? 'bg-yellow-500 text-white' 
                              : 'bg-green-500 text-white'
                        }`}>
                          {isOverdueItem ? 'Overdue' : isUpcomingItem ? 'Due Soon' : 'On Track'}
                        </div>
                      </div>
                      </div>
                      
                    {/* Modern Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {/* Due Date */}
                        <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Due Date</p>
                            <p className="text-lg font-bold text-gray-900">{formatDate(reminder.dueDate)}</p>
                          </div>
                        </div>
                        
                        {/* Assigned To */}
                        <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <User className="w-5 h-5 text-green-600" />
                        </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">Assigned To</p>
                            <p className="text-lg font-bold text-gray-900">{reminder.assignedTo}</p>
                            {reminder.assignedToEmail && reminder.assignedToEmail !== 'No email available' && (
                              <p className="text-sm text-gray-600 mt-1">{reminder.assignedToEmail}</p>
                            )}
                          </div>
                        </div>
                        </div>
                      
                      <div className="space-y-4">
                        {/* Additional Info based on section */}
                        {activeSection === 'rfis' && reminder.responseDueDate && (
                          <div className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Response Due</p>
                              <p className="text-lg font-bold text-gray-900">{formatDate(reminder.responseDueDate)}</p>
                      </div>
                          </div>
                        )}
                        {activeSection === 'meetings' && (reminder.startDate || reminder.endDate) && (
                          <div className="space-y-2">
                            {reminder.startDate && (
                              <div className="flex items-center space-x-2 text-sm text-gray-700">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>Start: {formatDate(reminder.startDate)}</span>
                              </div>
                            )}
                            {reminder.endDate && (
                              <div className="flex items-center space-x-2 text-sm text-gray-700">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>End: {formatDate(reminder.endDate)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional RFI Information */}
                    {activeSection === 'rfis' && (
                      <div className="mt-4 p-4 bg-white/40 rounded-xl">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">RFI Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {reminder.rfiType && (
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Type: {reminder.rfiType}</span>
                            </div>
                          )}
                          {reminder.locationDescription && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Location: {reminder.locationDescription}</span>
                            </div>
                          )}
                          {reminder.discipline && (
                            <div className="flex items-center space-x-2">
                              <Hash className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Discipline: {Array.isArray(reminder.discipline) ? reminder.discipline.join(', ') : reminder.discipline}</span>
                            </div>
                          )}
                          {reminder.category && (
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Category: {Array.isArray(reminder.category) ? reminder.category.join(', ') : reminder.category}</span>
                            </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Enhanced RFI Information */}
                      {activeSection === 'rfis' && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {reminder.rfiType && (
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Type: {reminder.rfiType}</span>
                            </div>
                          )}
                          {reminder.locationDescription && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Location: {reminder.locationDescription}</span>
                            </div>
                          )}
                          {reminder.discipline && (
                            <div className="flex items-center">
                              <Hash className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Discipline: {Array.isArray(reminder.discipline) ? reminder.discipline.join(', ') : reminder.discipline}</span>
                            </div>
                          )}
                          {reminder.category && (
                            <div className="flex items-center">
                              <AlertTriangle className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Category: {Array.isArray(reminder.category) ? reminder.category.join(', ') : reminder.category}</span>
                            </div>
                          )}
                          {reminder.customIdentifier && (
                            <div className="flex items-center">
                              <Hash className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">ID: {reminder.customIdentifier}</span>
                            </div>
                          )}
                          {reminder.rfiStatus && (
                            <div className="flex items-center">
                              <Circle className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Status: {reminder.rfiStatus}</span>
                            </div>
                          )}
                          {reminder.priority && (
                            <div className="flex items-center">
                              <AlertTriangle className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Priority: {reminder.priority}</span>
                            </div>
                          )}
                          {reminder.costImpact && (
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Cost Impact: {reminder.costImpact}</span>
                            </div>
                          )}
                          {reminder.scheduleImpact && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Schedule Impact: {reminder.scheduleImpact}</span>
                            </div>
                          )}
                          {reminder.commentsCount > 0 && (
                            <div className="flex items-center">
                              <Bell className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">Comments: {reminder.commentsCount}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {reminder.message && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>Message:</strong> {reminder.message}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="px-6 pb-6 pt-4 border-t border-gray-200/50 flex items-center justify-between flex-wrap gap-3">
                      {/* Left side: Reminder toggle */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Reminders:</span>
                        <button
                          onClick={() => toggleItemActivation(reminder.id, activeSection)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            isItemActiveForReminders(reminder.id, activeSection) ? 'bg-green-500' : 'bg-red-400'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              isItemActiveForReminders(reminder.id, activeSection) ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-xs ${isItemActiveForReminders(reminder.id, activeSection) ? 'text-green-600' : 'text-red-600'}`}>
                          {isItemActiveForReminders(reminder.id, activeSection) ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      
                      {/* Right side: Action buttons */}
                      <div className="flex items-center space-x-2">
                        {/* Set Reminder Button */}
                        <button
                          onClick={() => sendIndividualReminder(reminder)}
                          className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                          title="Send reminder email to assigned user"
                        >
                          <Bell className="w-4 h-4 mr-1" />
                          Set Reminder
                        </button>
                      
                      {activeSection === 'issues' && reminder.issueUrl && (
                        <a 
                          href={reminder.issueUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Issue
                        </a>
                      )}
                      {activeSection === 'rfis' && reminder.rfiUrl && (
                        <a 
                          href={reminder.rfiUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                      >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View RFI
                        </a>
                      )}
                        {activeSection === 'reviews' && reminder.reviewUrl && (
                        <a 
                            href={reminder.reviewUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                            View Review
                        </a>
                      )}
                        {activeSection === 'forms' && reminder.formUrl && (
                        <a 
                            href={reminder.formUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                            View Form
                        </a>
                      )}
                        {activeSection === 'meetings' && reminder.meetingUrl && (
                        <a 
                            href={reminder.meetingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 hover:shadow-lg hover:scale-105 font-medium"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                            View Meeting
                        </a>
                      )}
                      </div>
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Admin Settings Modal */}
      {showAdminSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Automatic Reminder Settings</h3>
                <button
                  onClick={() => setShowAdminSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Interval (hours)</label>
                  <input
                    type="number"
                    value={Math.round(autoReminderSettings.checkInterval / 60)} // Convert minutes to hours for display
                    onChange={(e) => {
                      const hours = parseInt(e.target.value);
                      const newValue = hours * 60; // Convert hours to minutes
                      const updatedSettings = {...autoReminderSettings, checkInterval: newValue};
                      setAutoReminderSettings(updatedSettings);
                      // Auto-save immediately
                      saveAutoReminderSettings(updatedSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="24"
                  />
                  <p className="text-xs text-gray-500 mt-1">How often to check for overdue items (1-24 hours)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Days Before Due Date</label>
                  <input
                    type="number"
                    value={autoReminderSettings.reminderDaysBefore}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      const updatedSettings = {...autoReminderSettings, reminderDaysBefore: newValue};
                      setAutoReminderSettings(updatedSettings);
                      // Auto-save immediately
                      saveAutoReminderSettings(updatedSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="30"
                  />
                  <p className="text-xs text-gray-500 mt-1">Send reminder X days before due date (1-30 days)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time</label>
                  <input
                    type="time"
                    value={autoReminderSettings.reminderTime || '08:00'}
                    onChange={(e) => {
                      const updatedSettings = {...autoReminderSettings, reminderTime: e.target.value};
                      setAutoReminderSettings(updatedSettings);
                      // Auto-save immediately
                      saveAutoReminderSettings(updatedSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <p className="text-xs text-gray-500 mb-2">Time of day to send reminders</p>
                  
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <TimezoneSelect
                    value={autoReminderSettings.reminderTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
                    onChange={(tz) => {
                      const timezoneValue = typeof tz === 'string' ? tz : tz.value;
                      // Never allow saving 'Australia/Sydney' - use user's timezone instead
                      const safeTimezone = (timezoneValue === 'Australia/Sydney' || timezoneValue === 'Sydney') 
                        ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
                        : timezoneValue;
                      const updatedSettings = {...autoReminderSettings, reminderTimeZone: safeTimezone};
                      setAutoReminderSettings(updatedSettings);
                      // Auto-save immediately
                      saveAutoReminderSettings(updatedSettings);
                      console.log(`🕐 Timezone updated to: ${safeTimezone} (original: ${timezoneValue})`);
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Timezone for reminder time</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                    <input
                      type="email"
                      value={autoReminderSettings.senderEmail}
                      onChange={(e) => {
                        const updatedSettings = {...autoReminderSettings, senderEmail: e.target.value};
                        setAutoReminderSettings(updatedSettings);
                        // Auto-save immediately
                        saveAutoReminderSettings(updatedSettings);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@company.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email address to send reminders from</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                    <input
                      type="email"
                      value={autoReminderSettings.ccEmail || ''}
                      onChange={(e) => {
                        const updatedSettings = {...autoReminderSettings, ccEmail: e.target.value};
                        setAutoReminderSettings(updatedSettings);
                        // Auto-save immediately
                        saveAutoReminderSettings(updatedSettings);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="cc@company.com (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">CC recipients for reminders (optional)</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Template</label>
                  <textarea
                    value={autoReminderSettings.messageTemplate}
                    onChange={(e) => {
                      const updatedSettings = {...autoReminderSettings, messageTemplate: e.target.value};
                      setAutoReminderSettings(updatedSettings);
                      // Auto-save immediately
                      saveAutoReminderSettings(updatedSettings);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="Enter message template"
                  />
                  <p className="text-xs text-gray-500 mt-1">Generic message sent to all users with pending items</p>
                </div>

                {/* Outlook Integration Settings */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Outlook Integration Settings</h4>
                  
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      ✅ <strong>Pre-configured and ready to use!</strong> All Outlook credentials are already set up and the integration is enabled.
                    </p>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="outlookEnabled"
                      checked={autoReminderSettings.outlookEnabled}
                      onChange={(e) => {
                        const updatedSettings = {...autoReminderSettings, outlookEnabled: e.target.checked};
                        setAutoReminderSettings(updatedSettings);
                        // Auto-save immediately
                        saveAutoReminderSettings(updatedSettings);
                      }}
                      className="mr-3"
                    />
                    <label htmlFor="outlookEnabled" className="text-sm font-medium text-gray-700">
                      Enable Outlook integration for sending reminders
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                      <input
                        type="text"
                        value={autoReminderSettings.outlookClientId}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          
                          // Validate that it's not the Client Secret ID
                          if (value === 'a8291bcf-ced0-44f0-a665-3022f497a189') {
                            alert('⚠️ Warning: This is the Client Secret ID, not the Client ID!\n\nPlease use the Client ID: 2a998440-08f4-44ee-a5dc-36b03f30eb17');
                            return;
                          }
                          
                          const updatedSettings = {...autoReminderSettings, outlookClientId: value};
                          setAutoReminderSettings(updatedSettings);
                          // Auto-save immediately
                          saveAutoReminderSettings(updatedSettings);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="2a998440-08f4-44ee-a5dc-36b03f30eb17"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                      <input
                        type="text"
                        value={autoReminderSettings.outlookTenantId}
                        onChange={(e) => {
                          const updatedSettings = {...autoReminderSettings, outlookTenantId: e.target.value};
                          setAutoReminderSettings(updatedSettings);
                          // Auto-save immediately
                        saveAutoReminderSettings(updatedSettings);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="a9aefa13-7b64-46fc-a84a-85dce450b11a"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={autoReminderSettings.outlookClientSecret}
                      onChange={(e) => {
                        // Trim whitespace to avoid copy-paste issues
                        const trimmedValue = e.target.value.trim();
                        
                        // Validate that it's not the secret ID (IDs are UUIDs, values are long strings with special chars)
                        if (trimmedValue === 'a8291bcf-ced0-44f0-a665-3022f497a189' || 
                            (trimmedValue.includes('-') && trimmedValue.length < 50 && !trimmedValue.includes('~') && !trimmedValue.includes('_'))) {
                          alert(
                            '⚠️ Warning: This looks like a Client Secret ID, not the VALUE.\n\nPaste the secret VALUE from Azure (not the secret ID UUID).'
                          );
                        }
                        
                        const updatedSettings = {...autoReminderSettings, outlookClientSecret: trimmedValue};
                        setAutoReminderSettings(updatedSettings);
                        // Auto-save immediately
                        saveAutoReminderSettings(updatedSettings);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your Azure AD Client Secret value"
                    />
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    {outlookConnected ? (
                      <>
                        <button
                          disabled
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm flex items-center gap-2 cursor-default"
                        >
                          <span className="w-2 h-2 bg-white rounded-full"></span>
                          Connected to Outlook
                        </button>
                        <button
                          onClick={disconnectOutlook}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={openOutlookLogin}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Sign In to Outlook
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAdminSettings(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    saveAutoReminderSettings(autoReminderSettings);
                    setShowAdminSettings(false);
                    alert('Settings saved successfully!');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


export default ReminderTab;

