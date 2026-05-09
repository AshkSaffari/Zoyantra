import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ModernTabNavigation.css';
import { 
  // Tabler Icons
  IconHome,
  IconUsers,
  IconCalendar,
  IconFileText,
  IconChartBar,
  IconSettings,
  IconDatabase,
  IconShare,
  IconShield,
  IconBuilding,
  IconTrendingUp,
  IconClock,
  IconFolder,
  IconMoneybag,
  IconRefresh,
  IconChevronRight,
  IconSparkles,
  IconRocket
} from '@tabler/icons-react';

const ModernTabNavigation = ({ activeTab, onTabChange, selectedProject, selectedHub }) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);

  const tabs = [
    {
      id: 'gantt-chart',
      name: 'Gant Chart',
      icon: IconChartBar,
      color: 'from-purple-500 to-purple-600',
      description: 'Project timeline and scheduling'
    },
    {
      id: 'plan-workahead',
      name: 'Planner',
      icon: IconCalendar,
      color: 'from-lime-500 to-lime-600',
      description: 'Work planning and scheduling'
    },
    {
      id: 'timesheets',
      name: 'Timesheet',
      icon: IconClock,
      color: 'from-green-500 to-green-600',
      description: 'Time tracking and management'
    },
    {
      id: 'expense-tracking',
      name: 'Expenses',
      icon: IconMoneybag,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Financial tracking and expenses'
    },
    {
      id: 'earned-value',
      name: 'Earned Value',
      icon: IconTrendingUp,
      color: 'from-sky-500 to-sky-600',
      description: 'Earned value management'
    },
    {
      id: 'resource-management',
      name: 'Resources',
      icon: IconUsers,
      color: 'from-rose-500 to-rose-600',
      description: 'Resource allocation and planning'
    },
    {
      id: 'team-load-balance',
      name: 'Team Load Balance',
      icon: IconUsers,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Team workload balancing'
    },
    {
      id: 'plc',
      name: 'Project Lifecycle',
      icon: IconCalendar,
      color: 'from-pink-500 to-pink-600',
      description: 'Gates and phase management'
    },
    {
      id: 'crew-management',
      name: 'Crew Management',
      icon: IconUsers,
      color: 'from-amber-500 to-amber-600',
      description: 'Team and crew coordination'
    },
    {
      id: 'integration-d365',
      name: 'D365 Integration',
      icon: IconShare,
      color: 'from-cyan-500 to-cyan-600',
      description: 'Microsoft Dynamics 365 integration'
    },
    {
      id: 'sharepoint-integration',
      name: 'SharePoint',
      icon: IconShare,
      color: 'from-teal-500 to-teal-600',
      description: 'SharePoint collaboration'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: IconCalendar,
      color: 'from-blue-500 to-blue-600',
      description: 'Calendar management'
    },
    {
      id: 'admin',
      name: 'Admin',
      icon: IconSettings,
      color: 'from-gray-500 to-gray-600',
      description: 'Administrative settings'
    },
  ];

  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
    const isAtStart = scrollLeft <= 10;
    setIsScrolling(!isAtEnd && !isAtStart);
  };

  const scrollToTab = (direction) => {
    const container = document.getElementById('tab-container');
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative bg-white border-b border-gray-200 shadow-sm">
      {/* Scroll Indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      {/* Scroll Buttons */}
      <button
        onClick={() => scrollToTab('left')}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
      >
        <IconChevronRight className="h-4 w-4 text-gray-600 rotate-180" />
      </button>
      
      <button
        onClick={() => scrollToTab('right')}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
      >
        <IconChevronRight className="h-4 w-4 text-gray-600" />
      </button>

      {/* Project Info Header */}
      {selectedProject && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IconBuilding className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{selectedProject.name}</h3>
              <p className="text-sm text-gray-600">
                {selectedHub?.name} • {tabs.length} modules available
              </p>
            </div>
            <motion.div 
              className="ml-auto flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <IconSparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium text-gray-600">Enhanced UI</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="relative">
        <div
          id="tab-container"
          onScroll={handleScroll}
          className="flex space-x-1 px-4 py-2 overflow-x-auto scrollbar-hide scroll-smooth tab-transition"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence>
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={`
                    relative flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm
                    tab-transition tab-hover-scale whitespace-nowrap tab-focus
                    ${isActive 
                      ? 'text-white shadow-lg transform scale-105 active-tab-glow' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                    ${isHovered && !isActive ? 'transform scale-102' : ''}
                  `}
                  whileHover={{ 
                    scale: isActive ? 1.05 : 1.02,
                    y: -2
                  }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: tabs.indexOf(tab) * 0.05 }}
                >
                  {/* Active Background */}
                  {isActive && (
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${tab.color} rounded-xl`}
                      layoutId="activeTab"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}

                  {/* Hover Background */}
                  {isHovered && !isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gray-100 rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}

                  {/* Content */}
                  <div className="relative z-10 flex items-center space-x-2">
                    <motion.div
                      animate={{ 
                        rotate: isActive ? 360 : 0,
                        scale: isHovered ? 1.1 : 1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="h-5 w-5" />
                    </motion.div>
                    <span>{tab.name}</span>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 bg-white rounded-full pulse-indicator"
                      />
                    )}
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50"
                    >
                      {tab.description}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20" />
    </div>
  );
};

export default ModernTabNavigation;
