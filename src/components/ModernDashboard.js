import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Activity, 
  TrendingUp, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  Users,
  Calendar,
  Award,
  Lock,
  RefreshCw
} from 'lucide-react';
import AccService from '../services/AccService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { cn } from '../utils/cn';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const ModernDashboard = ({ dashboardData, gates, selectedProject, onGatesUpdate }) => {
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Sync gate progress with ACC review progress
  const syncGateProgressWithACC = async (gate) => {
    if (!gate.criteria || gate.criteria.length === 0) return;

    try {
      console.log(`🔄 Syncing progress for gate: ${gate.name}`);
      
      // First, get all reviews for the project
      const allReviews = await AccService.getProjectReviews(selectedProject.id);
      console.log(`📊 Found ${allReviews.length} reviews in project`);
      
      const progressPromises = gate.criteria
        .filter(criteria => criteria.reviewId)
        .map(async (criteria) => {
          try {
            // Find the review in the project reviews list
            const review = allReviews.find(r => r.id === criteria.reviewId);
            if (!review) {
              console.log(`⚠️ Review ${criteria.reviewId} not found in project reviews`);
              return criteria;
            }

            // Analyze review status from multiple endpoints
            const reviewStatus = await analyzeReviewStatus(selectedProject.id, criteria.reviewId);
            
            console.log(`📊 Review ${criteria.reviewId} status:`, reviewStatus);
            
            return {
              ...criteria,
              reviewStatus: reviewStatus.status,
              lastSyncTime: new Date().toISOString()
            };
          } catch (error) {
            console.error(`❌ Error syncing criteria ${criteria.id}:`, error);
            return criteria;
          }
        });

      const updatedCriteria = await Promise.all(progressPromises);
      
      // Update the gate with new criteria data
      const updatedGate = {
        ...gate,
        criteria: gate.criteria.map(criteria => {
          const updated = updatedCriteria.find(c => c.id === criteria.id);
          return updated || criteria;
        })
      };

      return updatedGate;
    } catch (error) {
      console.error(`❌ Error syncing gate ${gate.name}:`, error);
      return gate;
    }
  };

  // Analyze review status from multiple ACC endpoints
  const analyzeReviewStatus = async (projectId, reviewId) => {
    try {
      // Get review workflow and progress data
      const [workflowData, progressData] = await Promise.all([
        AccService.getReviewWorkflow(projectId, reviewId).catch(() => null),
        AccService.getReviewProgress(projectId, reviewId).catch(() => null)
      ]);

      let status = 'submitted';
      let needsResubmission = false;
      
      // Analyze workflow data
      if (workflowData) {
        const workflowCompleted = workflowData.status === 'completed';
        console.log(`📊 Workflow status: ${workflowData.status}, completed: ${workflowCompleted}`);
        
        // Analyze progress data
        if (progressData && progressData.results) {
          const totalFiles = progressData.results.length;
          const approvedFiles = progressData.results.filter(step => 
            step.status === 'APPROVED' || step.status === 'CLAIMED'
          ).length;
          const rejectedFiles = progressData.results.filter(step => 
            step.status === 'REJECTED'
          ).length;
          
          console.log(`📊 Progress analysis: ${approvedFiles}/${totalFiles} files approved, ${rejectedFiles} rejected`);
          
          if (approvedFiles === totalFiles && totalFiles > 0) {
            status = 'approved';
            console.log(`✅ Review fully approved: all ${totalFiles} files approved`);
          } else if (workflowCompleted && approvedFiles === totalFiles && totalFiles > 0) {
            status = 'approved';
            console.log(`✅ Review fully approved: workflow completed, all files approved`);
          } else if (rejectedFiles > 0) {
            status = 'rejected';
            needsResubmission = true;
            console.log(`❌ Review rejected: ${rejectedFiles} files rejected`);
          } else if (approvedFiles > 0) {
            status = 'in-progress';
            console.log(`🔄 Review in progress: ${approvedFiles}/${totalFiles} files approved`);
          }
        }
      }
      
      return {
        status,
        needsResubmission,
        detailedStatus: {
          workflowData,
          progressData
        }
      };
    } catch (error) {
      console.error(`❌ Error analyzing review status:`, error);
      return { status: 'submitted', needsResubmission: false };
    }
  };

  // Auto-sync progress with ACC every 60 seconds
  useEffect(() => {
    if (!selectedProject?.id || gates.length === 0) return;

    const syncInterval = setInterval(() => {
      console.log('🔄 Auto-syncing all gates with ACC every 60 seconds...');
      gates.forEach(gate => {
        if (gate.criteria?.some(c => c.reviewId)) {
          console.log(`🔄 Auto-syncing gate: ${gate.name} with ACC...`);
          syncGateProgressWithACC(gate).then(updatedGate => {
            if (updatedGate && onGatesUpdate) {
              onGatesUpdate(updatedGate);
            }
          });
        }
      });
    }, 60000); // Sync every 60 seconds

    return () => clearInterval(syncInterval);
  }, [selectedProject?.id, gates, onGatesUpdate]);


  const stats = [
    {
      title: 'Total Gates',
      value: dashboardData.overallStats?.totalGates || 0,
      icon: Target,
      color: 'blue',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Overall Progress',
      value: `${dashboardData.overallStats?.overallProgress || 0}%`,
      icon: TrendingUp,
      color: 'orange',
      change: '+5%',
      changeType: 'positive'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'preparing': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Project Dashboard</h2>
          <p className="text-gray-600 mt-1">Monitor project progress and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          {/* Sync Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Auto-syncing with ACC every 60 seconds
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-xs text-blue-600">
                Last sync: {lastSyncTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-xl",
                stat.color === 'blue' ? "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100" :
                stat.color === 'green' ? "border-green-200 bg-gradient-to-br from-green-50 to-green-100" :
                stat.color === 'purple' ? "border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100" :
                "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <span className={cn(
                          "text-xs font-medium",
                          stat.changeType === 'positive' ? "text-green-600" : "text-red-600"
                        )}>
                          {stat.change}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">vs last month</span>
                      </div>
                    </div>
                    <div className={cn(
                      "p-3 rounded-full",
                      stat.color === 'blue' ? "bg-blue-500" :
                      stat.color === 'green' ? "bg-green-500" :
                      stat.color === 'purple' ? "bg-purple-500" :
                      "bg-orange-500"
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gate Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Gate Approval Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.gateProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => [
                    `${value}%`, 
                    'Approval Progress'
                  ]}
                />
                <Legend />
                <Bar dataKey="progressPercentage" fill="#10b981" name="Approval Progress" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gate Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChartIcon className="w-5 h-5" />
              <span>Gate Status Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.gateProgress}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="progressPercentage"
                >
                  {dashboardData.gateProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gate Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Project Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboardData.timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="dateRange" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name, props) => {
                  if (name === 'Progress %') {
                    return [`${value}%`, 'Approval Progress'];
                  }
                  if (name === 'Completed Criteria') {
                    return [`${value}`, 'Approved Criteria'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return `${data.name} (Gate ${data.gateOrder})`;
                  }
                  return label;
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="progress" 
                stackId="1" 
                stroke="#8884d8" 
                fill="#8884d8" 
                name="Progress %" 
              />
              <Area 
                type="monotone" 
                dataKey="completedCriteria" 
                stackId="2" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                name="Completed Criteria" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gates.slice(0, 5).map((gate, index) => {
              // Use the same status logic as ModernGateManager
              const totalCriteria = gate.criteria?.length || 0;
              const criteriaApproved = gate.criteria?.filter(criteria => 
                criteria.reviewStatus === 'approved'
              ).length || 0;
              
              let gateStatus = 'pending';
              
              if (gate.status === 'submitted' && criteriaApproved === totalCriteria && totalCriteria > 0) {
                gateStatus = 'completed';
              } else if (gate.status === 'submitted') {
                gateStatus = 'in-progress';
              } else if (gate.criteria?.some(criteria => criteria.selectedFile)) {
                gateStatus = 'preparing';
              } else {
                gateStatus = 'pending';
                // NO MORE LEGACY LOCKING LOGIC - Only ACC data determines status
              }
              
              return (
                <motion.div
                  key={gate.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    gateStatus === 'completed' ? "bg-green-100" :
                    gateStatus === 'in-progress' ? "bg-blue-100" :
                    gateStatus === 'preparing' ? "bg-yellow-100" : "bg-gray-100"
                  )}>
                    {gateStatus === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : gateStatus === 'in-progress' ? (
                      <Clock className="w-5 h-5 text-blue-600" />
                    ) : gateStatus === 'preparing' ? (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <Target className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{gate.name}</h4>
                    <p className="text-sm text-gray-600">{gate.description || 'No description'}</p>
                  </div>
                  <Badge variant={getStatusColor(gateStatus)}>
                    {gateStatus === 'completed' ? 'Completed' :
                     gateStatus === 'in-progress' ? 'In Progress' :
                     gateStatus === 'preparing' ? 'Preparing' : 
                     'Pending'}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernDashboard;
