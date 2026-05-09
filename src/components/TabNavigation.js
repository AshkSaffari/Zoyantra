import React from 'react';
import { 
  Target, 
  FileText, 
  BarChart3, 
  Users, 
  Calendar, 
  Link,
  Building2,
  Settings,
  Database,
  Shield,
  DollarSign,
  GanttChart,
  LoadBalancer,
  Admin,
  Sharepoint,
  FileCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import './TabNavigation.css';

const TabNavigation = ({ activeTab, onTabChange, selectedProject, selectedHub }) => {
  const tabs = [
    {
      id: 'plan-workahead',
      name: 'Planner',
      icon: Target,
      description: 'Plan future work and tasks',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'timesheet',
      name: 'Timesheets',
      icon: FileText,
      description: 'Track actual work hours',
      color: 'green',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'earned-value',
      name: 'EV',
      icon: BarChart3,
      description: 'Earned Value Management',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'gantt-chart',
      name: 'Gant Chart',
      icon: GanttChart,
      description: 'Project timeline and scheduling',
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'expense-tracking',
      name: 'Expenses',
      icon: DollarSign,
      description: 'Track and manage expenses',
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'crew-management',
      name: 'Crew',
      icon: Users,
      description: 'Manage crews and members',
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      id: 'resource-management',
      name: 'Resources',
      icon: Settings,
      description: 'Resource allocation and planning',
      color: 'teal',
      gradient: 'from-teal-500 to-teal-600'
    },
    {
      id: 'team-load-balance',
      name: 'Load Balance',
      icon: LoadBalancer,
      description: 'Team workload distribution',
      color: 'cyan',
      gradient: 'from-cyan-500 to-cyan-600'
    },
    {
      id: 'admin',
      name: 'Admin',
      icon: Admin,
      description: 'Administrative functions',
      color: 'red',
      gradient: 'from-red-500 to-red-600'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      description: 'Work schedules and holidays',
      color: 'pink',
      gradient: 'from-pink-500 to-pink-600'
    },
    {
      id: 'integration-d365',
      name: 'D365',
      icon: Building2,
      description: 'Dynamics 365 integration',
      color: 'slate',
      gradient: 'from-slate-500 to-slate-600'
    },
    {
      id: 'sharepoint',
      name: 'SharePoint',
      icon: Sharepoint,
      description: 'SharePoint integration',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'plc',
      name: 'PLC',
      icon: Target,
      description: 'Project Life Cycle management',
      color: 'violet',
      gradient: 'from-violet-500 to-violet-600'
    },
  ];

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/60 shadow-sm">
      <div className="px-4 py-3">
        {/* Project Info Header */}
        {(selectedProject || selectedHub) && (
          <div className="mb-4 px-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {selectedHub && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{selectedHub.name || selectedHub.attributes?.name}</span>
                </div>
              )}
              {selectedProject && selectedHub && (
                <ChevronRight className="h-3 w-3 text-gray-400" />
              )}
              {selectedProject && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{selectedProject.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modern Tab Navigation */}
        <nav className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap
                  transition-all duration-300 ease-out transform hover-lift tab-ripple
                  ${isActive 
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-xl shadow-${tab.color}-500/30 scale-105 floating glow-effect` 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/90 hover:shadow-lg modern-shadow'
                  }
                `}
                title={tab.description}
              >
                {/* Active indicator with animation */}
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full opacity-90 animate-pulse"></div>
                )}
                
                {/* Icon with enhanced animation */}
                <div className={`
                  relative transition-all duration-300
                  ${isActive ? 'scale-110 rotate-3' : 'group-hover:scale-105 group-hover:rotate-1'}
                `}>
                  <Icon className={`h-5 w-5 transition-all duration-300 ${
                    isActive ? 'text-white drop-shadow-sm' : `text-${tab.color}-500 group-hover:text-${tab.color}-600`
                  }`} />
                  
                  {/* Enhanced sparkle effect for active tab */}
                  {isActive && (
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="h-3 w-3 text-white/80 animate-pulse" />
                      <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-white/40 rounded-full animate-ping"></div>
                    </div>
                  )}
                </div>
                
                {/* Tab name with enhanced styling */}
                <span className={`
                  transition-all duration-300 font-bold tracking-wide
                  ${isActive ? 'text-white drop-shadow-sm' : `text-gray-700 group-hover:text-${tab.color}-700`}
                `}>
                  {tab.name}
                </span>
                
                {/* Enhanced hover effect background */}
                {!isActive && (
                  <div className={`
                    absolute inset-0 rounded-2xl bg-gradient-to-r ${tab.gradient} opacity-0 
                    group-hover:opacity-15 transition-all duration-300
                  `}></div>
                )}
                
                {/* Subtle border for active tab */}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/20"></div>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Enhanced scroll indicator */}
        <div className="flex justify-center mt-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
