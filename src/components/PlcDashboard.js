import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Users,
  FileText,
  Calendar
} from 'lucide-react';

const PLCDashboard = ({ gates, selectedProject }) => {
  const [dashboardData, setDashboardData] = useState(null);

  // Calculate gate progress using the same logic as ModernGateManager
  const calculateGateProgress = (gate) => {
    const totalCriteria = gate.criteria?.length || 0;
    if (totalCriteria === 0) return 0;
    
    const criteriaApproved = gate.criteria?.filter(criteria => 
      criteria.reviewStatus === 'approved' || 
      (criteria.reviewId && criteria.approvedBy && criteria.approvedBy !== 'Unassigned' && criteria.approvedBy !== 'N/A')
    ).length || 0;
    
    return Math.min(100, Math.round((criteriaApproved / totalCriteria) * 100));
  };

  // Determine gate status using the same logic
  const getGateStatus = (gate) => {
    const totalCriteria = gate.criteria?.length || 0;
    const criteriaApproved = gate.criteria?.filter(criteria => 
      criteria.reviewStatus === 'approved' || 
      (criteria.reviewId && criteria.approvedBy && criteria.approvedBy !== 'Unassigned' && criteria.approvedBy !== 'N/A')
    ).length || 0;
    
    // Completed: All criteria approved
    if (totalCriteria > 0 && criteriaApproved === totalCriteria) {
      return { status: 'completed', color: 'success', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-800' };
    }
    
    // In Progress: Some criteria approved OR submitted
    if (criteriaApproved > 0 || gate.status === 'submitted' || gate.status === 'in-progress') {
      return { status: 'in-progress', color: 'info', icon: Clock, bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    }
    
    // Default: Pending (waiting for review) - NO MORE LEGACY LOCKING LOGIC
    return { status: 'pending', color: 'warning', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
  };

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const totalGates = gates.length;
    const completedGates = gates.filter(gate => {
      const status = getGateStatus(gate);
      return status.status === 'completed';
    }).length;
    
    const inProgressGates = gates.filter(gate => {
      const status = getGateStatus(gate);
      return status.status === 'in-progress';
    }).length;
    
    const openGates = gates.filter(gate => {
      const status = getGateStatus(gate);
      return status.status === 'open';
    }).length;
    
    const totalCriteria = gates.reduce((sum, gate) => sum + (gate.criteria?.length || 0), 0);
    const approvedCriteria = gates.reduce((sum, gate) => {
      return sum + (gate.criteria?.filter(criteria => 
        criteria.reviewStatus === 'approved' || 
        (criteria.reviewId && criteria.approvedBy && criteria.approvedBy !== 'Unassigned')
      ).length || 0);
    }, 0);
    
    const overallProgress = totalCriteria > 0 ? Math.min(100, Math.round((approvedCriteria / totalCriteria) * 100)) : 0;
    
    return {
      totalGates,
      completedGates,
      inProgressGates,
      openGates,
      totalCriteria,
      approvedCriteria,
      overallProgress
    };
  };

  useEffect(() => {
    const metrics = calculateMetrics();
    setDashboardData(metrics);
  }, [gates]);

  if (!dashboardData) return <div>Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PLC Dashboard</h2>
          <p className="text-gray-600">Project: {selectedProject?.name || 'Unknown Project'}</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overall Progress</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.overallProgress}%</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${dashboardData.overallProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Completed Gates */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed Gates</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.completedGates}</p>
            </div>
          </div>
        </div>

        {/* In Progress Gates */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.inProgressGates}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Gates Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Gate Progress Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criteria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gates.map((gate) => {
                const gateStatus = getGateStatus(gate);
                const progress = calculateGateProgress(gate);
                const StatusIcon = gateStatus.icon;
                
                return (
                  <tr key={gate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <StatusIcon className={`w-5 h-5 ${gateStatus.textColor}`} />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{gate.name}</div>
                          <div className="text-sm text-gray-500">Order: {gate.order}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gateStatus.bgColor} ${gateStatus.textColor}`}>
                        {gateStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gate.criteria?.length || 0} criteria
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              gateStatus.status === 'completed' ? 'bg-green-600' : 
                              gateStatus.status === 'in-progress' ? 'bg-blue-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gate.criteria?.find(c => c.approvedBy && c.approvedBy !== 'Unassigned')?.approvedBy || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gate.criteria?.find(c => c.reviewStatus)?.reviewStatus || 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gate Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {gates.map((gate) => {
          const gateStatus = getGateStatus(gate);
          const progress = calculateGateProgress(gate);
          const StatusIcon = gateStatus.icon;
          
          return (
            <div key={gate.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <StatusIcon className={`w-6 h-6 ${gateStatus.textColor} mr-2`} />
                  <h3 className="text-lg font-medium text-gray-900">{gate.name}</h3>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gateStatus.bgColor} ${gateStatus.textColor}`}>
                  {gateStatus.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      gateStatus.status === 'completed' ? 'bg-green-600' : 
                      gateStatus.status === 'in-progress' ? 'bg-blue-600' : 'bg-gray-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Criteria</span>
                  <span className="font-medium">{gate.criteria?.length || 0}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order</span>
                  <span className="font-medium">{gate.order}</span>
                </div>
                
                {gate.criteria?.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Criteria Details:</p>
                    {gate.criteria.map((criteria, index) => (
                      <div key={criteria.id} className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{criteria.name}</span>
                        <span className={criteria.reviewStatus === 'approved' ? 'text-green-600' : 'text-gray-500'}>
                          {criteria.reviewStatus || 'pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PLCDashboard;