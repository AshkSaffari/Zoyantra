import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Users, 
  Calendar, 
  Building2,
  Settings,
  Shield,
  DollarSign,
  GanttChart,
  ChevronRight,
  ChevronUp,
  Clock,
  CheckSquare,
  TrendingUp,
  UserCog,
  PieChart,
  Workflow,
  Database,
  RefreshCw,
  LogOut,
  FileText,
  Bell,
  Coins
} from 'lucide-react';
import './VerticalTabNavigation.css';

const VerticalTabNavigation = ({ activeTab, onTabChange, selectedProject, selectedHub, isRefreshing = false, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Define categories with their icons and sub-tabs
  const categories = useMemo(() => [
    {
      id: 'planning',
      name: 'Planning',
      icon: Target,
      color: '#3B82F6', // Blue
      bgColor: '#EFF6FF',
      subTabs: [
        { id: 'tasks', name: 'Tasks', icon: CheckSquare, color: '#10B981' },
        { id: 'plan-workahead', name: 'Planner', icon: Target, color: '#3B82F6' }
      ]
    },
    {
      id: 'project-management',
      name: 'Project Management',
      icon: Workflow,
      color: '#8B5CF6', // Purple
      bgColor: '#F3F4F6',
      subTabs: [
        { id: 'reminder', name: 'Reminder', icon: Bell, color: '#F59E0B' },
        { id: 'simple-review-creation', name: 'PLC', icon: FileText, color: '#EF4444' }
      ]
    },
    {
      id: 'time-management',
      name: 'Time Management',
      icon: Clock,
      color: '#10B981', // Green
      bgColor: '#ECFDF5',
      subTabs: [
        { id: 'timesheets', name: 'Timesheets', icon: Clock, color: '#10B981' },
        { id: 'gantt-chart', name: 'Gantt Chart', icon: GanttChart, color: '#06B6D4' }
      ]
    },
    {
      id: 'financial',
      name: 'Financial',
      icon: DollarSign,
      color: '#F59E0B', // Amber
      bgColor: '#FFFBEB',
      subTabs: [
        { id: 'expense-tracking', name: 'Expenses', icon: DollarSign, color: '#F59E0B' },
        { id: 'earned-value', name: 'Earned Value', icon: TrendingUp, color: '#8B5CF6' },
        { id: 'cost-management', name: 'Cost Management', icon: PieChart, color: '#EF4444' }
      ]
    },
    {
      id: 'resources-management',
      name: 'Resources Management',
      icon: UserCog,
      color: '#EF4444', // Red
      bgColor: '#FEF2F2',
      subTabs: [
        { id: 'resource-management', name: 'Resources', icon: UserCog, color: '#EF4444' },
        { id: 'team-load-balance', name: 'Team Load Balance', icon: Users, color: '#8B5CF6' },
        { id: 'crew-management', name: 'Crew Management', icon: Users, color: '#10B981' },
        { id: 'calendar', name: 'Calendar', icon: Calendar, color: '#3B82F6' }
      ]
    },
    {
      id: 'integration',
      name: 'Integration',
      icon: Database,
      color: '#06B6D4', // Cyan
      bgColor: '#ECFEFF',
      subTabs: [
        { id: 'integration-d365', name: 'D365 Integration', icon: Building2, color: '#06B6D4' },
        { id: 'sharepoint-integration', name: 'SharePoint', icon: Building2, color: '#3B82F6' },
        { id: 'docusign', name: 'DocuSign', icon: FileText, color: '#8B5CF6' }
      ]
    },
    {
      id: 'system',
      name: 'System',
      icon: Settings,
      color: '#6B7280', // Gray
      bgColor: '#F9FAFB',
      subTabs: [
        { id: 'admin', name: 'Admin', icon: Settings, color: '#6B7280' },
        { id: 'token-usage', name: 'Token Usage', icon: Coins, color: '#F59E0B' }
      ]
    }
  ], []);

  // Handle category click to show/hide sub-tabs
  const handleCategoryClick = (categoryId) => {
    console.log('🔍 Category clicked:', categoryId);
    console.log('🔍 Current expanded category:', expandedCategory);
    if (expandedCategory === categoryId) {
      console.log('🔍 Collapsing category');
      setExpandedCategory(null);
    } else {
      console.log('🔍 Expanding category');
      setExpandedCategory(categoryId);
    }
  };

  // Handle sub-tab click
  const handleSubTabClick = (subTabId) => {
    onTabChange(subTabId);
    // Keep the category expanded when a sub-tab is clicked
    // setExpandedCategory(null); // Commented out to keep tabs highlighted
  };

  // Check if a category is active (has an active sub-tab)
  const isCategoryActive = (category) => {
    return category.subTabs.some(subTab => subTab.id === activeTab);
  };

  // Auto-expand category if it contains the active tab
  React.useEffect(() => {
    const activeCategory = categories.find(category => 
      category.subTabs.some(subTab => subTab.id === activeTab)
    );
    if (activeCategory && expandedCategory !== activeCategory.id) {
      console.log('🔍 Auto-expanding category for active tab:', activeCategory.id);
      setExpandedCategory(activeCategory.id);
    }
  }, [activeTab, categories]);

  console.log('🎨 Rendering VerticalTabNavigation with activeTab:', activeTab);
  console.log('🎨 Current expanded category:', expandedCategory);
  console.log('🎨 Categories:', categories.map(c => ({ id: c.id, name: c.name, subTabs: c.subTabs.length })));
  
  return (
    <div className={`vertical-nav-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="nav-header">
        <div className="header-content">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-btn"
          >
            <ChevronRight className={`chevron ${isCollapsed ? 'rotated' : ''}`} />
          </button>
          {!isCollapsed && (
            <div className="zoyantra-logo-container">
              <img 
                src="/zoyantra-logo.svg" 
                alt="Zoyantra Logo" 
                className="zoyantra-logo"
                onError={(e) => {
                  // Fallback to text if logo fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <h1 className="zoyantra-title">ZOYANTRA</h1>
            </div>
          )}
        </div>
        <div className="header-actions">
          {isRefreshing && (
            <div className="refresh-indicator">
              <RefreshCw className="refresh-icon" />
            </div>
          )}
        </div>
      </div>

      {/* Project Info */}
      {(selectedProject || selectedHub) && !isCollapsed && (
        <div className="project-info">
          {selectedHub && (
            <div className="project-item">
              <Building2 className="project-icon" />
              <span className="project-name">{selectedHub.name || selectedHub.attributes?.name}</span>
            </div>
          )}
          {selectedProject && selectedHub && (
            <ChevronRight className="project-separator" />
          )}
          {selectedProject && (
            <div className="project-item">
              <Target className="project-icon" />
              <span className="project-name">{selectedProject.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="nav-content">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.id;
          const isActive = isCategoryActive(category);
          const CategoryIcon = category.icon;
          const isHovered = hoveredTab === category.id;

          return (
            <div key={category.id} className="nav-category">
              {/* Main Category Button */}
              <button
                className={`category-button ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔍 Button clicked for category:', category.id);
                  handleCategoryClick(category.id);
                }}
                onMouseEnter={() => setHoveredTab(category.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  backgroundColor: isActive ? category.bgColor : 'transparent',
                  borderLeft: isActive ? `4px solid ${category.color}` : '4px solid transparent'
                }}
              >
                <div 
                  className="category-icon p-3 rounded-xl"
                  style={{
                    backgroundColor: category.color,
                    color: 'white'
                  }}
                >
                  <CategoryIcon className="w-6 h-6" />
                </div>
                <div className="category-content">
                  <span className="category-name">{category.name}</span>
                  <span className="category-description">
                    {isExpanded ? 'Click to collapse' : 'Click to expand'}
                  </span>
                </div>
                <motion.div
                  className="category-arrow"
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </motion.div>
              </button>

              {/* Sub-tabs with sliding animation */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="sub-tabs-container"
                    initial={{ opacity: 0, height: 0, x: -20 }}
                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                    exit={{ opacity: 0, height: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="sub-tabs">
                      {category.subTabs.map((subTab) => {
                        const SubIcon = subTab.icon;
                        const isSubActive = activeTab === subTab.id;
                        const isSubHovered = hoveredTab === subTab.id;

                        return (
                          <motion.button
                            key={subTab.id}
                            onClick={() => handleSubTabClick(subTab.id)}
                            onMouseEnter={() => setHoveredTab(subTab.id)}
                            onMouseLeave={() => setHoveredTab(null)}
                            className={`sub-tab ${isSubActive ? 'active' : ''} ${isSubHovered ? 'hovered' : ''}`}
                            style={{
                              background: isSubActive ? '#ffffff' : '#ffffff',
                              borderColor: isSubActive ? subTab.color : '#e2e8f0',
                              borderWidth: isSubActive ? '2px' : '1px',
                              borderLeft: isSubActive ? `4px solid ${subTab.color}` : '4px solid transparent'
                            }}
                            whileHover={{ scale: 1.02, x: 8 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.3 }}
                          >
                            <div 
                              className="sub-tab-icon p-2 rounded-lg"
                              style={{
                                backgroundColor: isSubActive ? subTab.color : subTab.color + '20',
                                color: isSubActive ? 'white' : subTab.color
                              }}
                            >
                              <SubIcon className="w-4 h-4" />
                            </div>
                            <div className="sub-tab-content">
                              <span 
                                className="sub-tab-name"
                                style={{
                                  color: isSubActive ? subTab.color : '#374151',
                                  fontWeight: isSubActive ? '700' : '600'
                                }}
                              >
                                {subTab.name}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="nav-footer">
          <button
            onClick={onLogout}
            className="sign-out-btn"
          >
            <LogOut className="sign-out-icon" />
            <span className="sign-out-text">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VerticalTabNavigation;