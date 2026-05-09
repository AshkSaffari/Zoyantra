import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Lock, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import AccService from '../services/AccService';

const PLCDashboard = ({ gates, selectedProject }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [realGatesData, setRealGatesData] = useState([]);
  const [loading, setLoading] = useState(false);

  const APPROVED_FALLBACK_VALUES = new Set(['APPROVED', 'ACCEPTED', 'COMPLETED', 'CLOSED']);

  const normalizeStatusValue = (value) => (value || '').toString().trim().toUpperCase();
  const normalizeStatusLabel = (value) => (value || '').toString().trim().toLowerCase();

  const isApprovedStep = (step, approvedValueSet, approvedLabelSet) => {
    const valueCandidates = [
      step?.status,
      step?.approvalStatus,
      step?.approvalStatusValue,
      step?.result,
      step?.value
    ];
    const labelCandidates = [
      step?.approvalStatusLabel,
      step?.label,
      step?.displayStatus
    ];

    const valueMatch = valueCandidates.some((candidate) =>
      approvedValueSet.has(normalizeStatusValue(candidate))
    );
    if (valueMatch) return true;

    return labelCandidates.some((candidate) =>
      approvedLabelSet.has(normalizeStatusLabel(candidate))
    );
  };

  const isLocalCriteriaApproved = (criteria) => {
    const status = (criteria?.reviewStatus || '').toString().trim().toLowerCase();
    return (
      ['approved', 'completed', 'closed', 'accepted'].includes(status) ||
      (criteria?.reviewId && criteria?.approvedBy && criteria.approvedBy !== 'Unassigned' && criteria.approvedBy !== 'N/A')
    );
  };

  // Calculate gate progress using the same logic as ModernGateManager
  const calculateGateProgress = (gate) => {
    const totalCriteria = gate.criteria?.length || 0;
    if (totalCriteria === 0) return 0;
    
    const criteriaApproved = gate.criteria?.filter(criteria => 
      isLocalCriteriaApproved(criteria)
    ).length || 0;
    
    return Math.min(100, Math.round((criteriaApproved / totalCriteria) * 100));
  };

  // Determine gate status using the same logic
  const getGateStatus = (gate) => {
    // Check if gate should be locked based on previous gate completion
    if (gate.order > 0) {
      const previousGate = gates.find(g => g.order === gate.order - 1);
      if (previousGate) {
        // Check if previous gate is completed using ACC data
        const prevIsCompleted = previousGate.realStatus === 'completed' ||
                              (previousGate.realProgress === 100 && previousGate.realApprovedBy && previousGate.realApprovedBy !== 'N/A') ||
                              (previousGate.criteria?.length > 0 && previousGate.criteria?.filter(c => 
                                c.reviewStatus === 'approved' || 
                                (c.reviewId && c.approvedBy && c.approvedBy !== 'Unassigned')
                              ).length === previousGate.criteria.length);
        
        if (!prevIsCompleted) {
          return { status: 'locked', color: 'secondary', icon: Lock, bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
        }
      }
    }
    
    const totalCriteria = gate.criteria?.length || 0;
    const criteriaApproved = gate.criteria?.filter(criteria => 
      isLocalCriteriaApproved(criteria)
    ).length || 0;
    
    // Completed: All criteria approved
    if (totalCriteria > 0 && criteriaApproved === totalCriteria) {
      return { status: 'completed', color: 'success', icon: CheckCircle, bgColor: 'bg-green-100', textColor: 'text-green-800' };
    }
    
    // In Progress: Some criteria approved OR submitted
    if (criteriaApproved > 0 || gate.status === 'submitted' || gate.status === 'in-progress') {
      return { status: 'in-progress', color: 'info', icon: Clock, bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    }
    
    // Default: Pending (waiting for review)
    return { status: 'pending', color: 'warning', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
  };

  // Calculate dashboard metrics using real ACC data
  const calculateMetrics = (gatesData = realGatesData) => {
    const totalGates = gatesData.length;
    const completedGates = gatesData.filter(gate => gate.realStatus === 'completed').length;
    const inProgressGates = gatesData.filter(gate => gate.realStatus === 'in-progress').length;
    const lockedGates = gatesData.filter(gate => {
      const status = getGateStatus(gate);
      return status.status === 'locked';
    }).length;
    
    const totalCriteria = gatesData.reduce((sum, gate) => sum + (gate.criteria?.length || 0), 0);
    const approvedCriteria = gatesData.reduce((sum, gate) => {
      return sum + (gate.criteria?.filter(criteria => 
        isLocalCriteriaApproved(criteria)
      ).length || 0);
    }, 0);
    
    const overallProgress = totalCriteria > 0 ? Math.min(100, Math.round((approvedCriteria / totalCriteria) * 100)) : 0;
    
    return {
      totalGates,
      completedGates,
      inProgressGates,
      lockedGates,
      totalCriteria,
      approvedCriteria,
      overallProgress
    };
  };

  // Fetch real ACC data
  useEffect(() => {
    const fetchRealACCData = async () => {
      if (!selectedProject?.id || gates.length === 0) return;
      
      setLoading(true);
      try {
        console.log('🔍 Fetching real ACC data for Dashboard...');
        
        // Get all reviews from ACC
        const allReviews = await AccService.getProjectReviews(selectedProject.id);
        console.log('📊 Found reviews from ACC:', allReviews);
        console.log('📊 Number of reviews found:', allReviews?.length || 0);
        
        if (!allReviews || allReviews.length === 0) {
          console.warn('⚠️ No reviews found in ACC, using local gate data');
          
          // Use local gate data instead of hardcoded test data
          const localGates = gates.map((gate) => ({
            ...gate,
            realProgress: calculateGateProgress(gate),
            realStatus: getGateStatus(gate).status,
            realApprovedBy: gate.criteria?.find(c => c.approvedBy && c.approvedBy !== 'Unassigned')?.approvedBy || 'N/A',
            realReviewStatus: gate.criteria?.find(c => c.reviewStatus)?.reviewStatus || 'N/A',
            gateReviews: []
          }));
          
          console.log('📊 Using local gate data:', localGates);
          setRealGatesData(localGates);
          const metrics = calculateMetrics(localGates);
          setDashboardData(metrics);
          return;
        }
        
        // Process each gate with real ACC data
        const processedGates = await Promise.all(
          gates.map(async (gate) => {
            const gateReviews = [];
            let totalApproved = 0;
            let realApprovedBy = 'N/A';
            let realReviewStatus = 'N/A';
            const gateCriteriaCount = gate.criteria?.length || 0;
            const wasPreviouslyCompleted =
              gate.realStatus === 'completed' ||
              gate.status === 'completed' ||
              (gate.realProgress || 0) >= 100;
            
            for (const criteria of gate.criteria || []) {
              // Prefer exact reviewId link when present; fallback to name matching.
              console.log(`🔍 Looking for review for gate: ${gate.name}, criteria: ${criteria.name}`);
              console.log(`🔍 Available reviews:`, allReviews.map(r => r.name));
              
              let matchingReview = null;
              if (criteria.reviewId) {
                matchingReview = allReviews.find((review) => review.id === criteria.reviewId) || null;
                if (matchingReview) {
                  console.log(`✅ Matched by reviewId for ${criteria.name}: ${criteria.reviewId}`);
                }
              }

              if (!matchingReview) {
                matchingReview = allReviews.find(review => {
                const reviewName = review.name?.toLowerCase() || '';
                const gateName = gate.name.toLowerCase().replace(/gate\s*/g, '');
                const criteriaName = criteria.name.toLowerCase();
                
                console.log(`🔍 Checking review: "${reviewName}" against gate: "${gateName}" criteria: "${criteriaName}"`);
                
                // Multiple matching strategies
                const matches = reviewName.includes(`${gateName} - ${criteriaName}`) ||
                       reviewName.includes(`${gateName}-${criteriaName}`) ||
                       reviewName.includes(`${criteriaName} - ${gateName}`) ||
                       reviewName.includes(`${criteriaName}-${gateName}`) ||
                       reviewName.includes(criteriaName) ||
                       reviewName.includes(`${gateName} ${criteriaName}`) ||
                       reviewName.includes(`${criteriaName} ${gateName}`) ||
                       // Try without spaces
                       reviewName.includes(`${gateName}${criteriaName}`) ||
                       reviewName.includes(`${criteriaName}${gateName}`) ||
                       // Try partial matches
                       reviewName.includes(criteriaName) && reviewName.includes(gateName);
                       
                if (matches) {
                  console.log(`✅ Found matching review: "${reviewName}"`);
                }
                
                return matches;
                });
              }
              
              if (matchingReview) {
                try {
                  console.log(`🔍 Found matching review for ${gate.name} - ${criteria.name}:`, matchingReview);
                  console.log(`🔍 Review object keys:`, Object.keys(matchingReview));
                  console.log(`🔍 Review approvedBy:`, matchingReview.approvedBy);
                  console.log(`🔍 Review status:`, matchingReview.status);
                  
                  // Get detailed status from ACC (workflow defines valid approval statuses/labels).
                  const [workflowData, progressData, versionsData] = await Promise.all([
                    AccService.getReviewWorkflow(selectedProject.id, matchingReview.id).catch(() => null),
                    AccService.getReviewProgress(selectedProject.id, matchingReview.id),
                    AccService.getReviewVersions(selectedProject.id, matchingReview.id).catch(() => null)
                  ]);
                  
                  console.log(`🔍 Progress data for ${matchingReview.name}:`, progressData);
                  console.log(`🔍 Progress results:`, progressData.results);
                  console.log(`🔍 Workflow data for ${matchingReview.name}:`, workflowData);
                  
                  const approvedValueSet = new Set(APPROVED_FALLBACK_VALUES);
                  const approvedLabelSet = new Set();
                  (workflowData?.approvalStatusOptions || []).forEach((option) => {
                    if (option?.value) approvedValueSet.add(normalizeStatusValue(option.value));
                    if (option?.label) approvedLabelSet.add(normalizeStatusLabel(option.label));
                  });
                  console.log('🔍 Approved value set:', Array.from(approvedValueSet));
                  console.log('🔍 Approved label set:', Array.from(approvedLabelSet));
                  
                  // Review status itself may already be terminally approved.
                  const isClosed = ['CLOSED', 'COMPLETED', 'APPROVED'].includes(
                    normalizeStatusValue(matchingReview.status)
                  );
                  console.log(`🔍 Review status: ${matchingReview.status}, terminal-approved: ${isClosed}`);
                  
                  // Check if review already has approver info from AccService_old.js
                  const hasApprover = matchingReview.approvedBy && matchingReview.approvedBy !== 'Unassigned' && matchingReview.approvedBy !== 'Unknown User';
                  console.log(`🔍 Review has approver: ${hasApprover}, approver: ${matchingReview.approvedBy}`);
                  
                  // Check progress steps against workflow-provided approval statuses/labels.
                  const isApprovedFromProgress = progressData.results?.some((step) => {
                    const approved = isApprovedStep(step, approvedValueSet, approvedLabelSet);
                    console.log('🔍 Step approval evaluation:', {
                      status: step?.status,
                      approvalStatus: step?.approvalStatus,
                      approvalStatusLabel: step?.approvalStatusLabel,
                      approved
                    });
                    return approved;
                  }) || false;

                  // File-level approval is the strongest source for final decision.
                  const isApprovedFromVersions = (versionsData?.results || []).some((fileVersion) => {
                    const value = normalizeStatusValue(fileVersion?.approveStatus?.value);
                    const label = normalizeStatusLabel(fileVersion?.approveStatus?.label);
                    return approvedValueSet.has(value) || approvedLabelSet.has(label) || label.includes('approved');
                  });
                  
                  // Only consider truly approved reviews
                  const finalIsApproved = isClosed || isApprovedFromVersions || isApprovedFromProgress || hasApprover;
                  console.log(`🔍 Is approved from review/versions/progress/local: ${isClosed}/${isApprovedFromVersions}/${isApprovedFromProgress}/${hasApprover}, final: ${finalIsApproved}`);
                  
                  if (finalIsApproved) {
                    totalApproved++;
                    
                    // Use approver from review if available (AccService_old.js already processed it)
                    if (hasApprover) {
                      realApprovedBy = matchingReview.approvedBy;
                      realReviewStatus = 'APPROVED';
                      console.log(`🔍 Using approver from review: ${realApprovedBy}`);
                    } else {
                      // Fallback: Get real approver name from ACC progress data
                      const approverStep = progressData.results?.find(step => {
                        const status = step.status?.toUpperCase();
                        return status === 'APPROVED' || status === 'COMPLETED' || status === 'CLOSED';
                      });
                      
                      console.log(`🔍 Approver step:`, approverStep);
                      
                      // Try multiple approver field locations
                      if (approverStep?.actionBy?.name) {
                        realApprovedBy = approverStep.actionBy.name;
                        realReviewStatus = 'APPROVED';
                      } else if (approverStep?.completedBy?.name) {
                        realApprovedBy = approverStep.completedBy.name;
                        realReviewStatus = 'APPROVED';
                      } else if (approverStep?.user?.name) {
                        realApprovedBy = approverStep.user.name;
                        realReviewStatus = 'APPROVED';
                      } else if (approverStep?.assignedTo?.name) {
                        realApprovedBy = approverStep.assignedTo.name;
                        realReviewStatus = 'APPROVED';
                      } else if (approverStep?.reviewer?.name) {
                        realApprovedBy = approverStep.reviewer.name;
                        realReviewStatus = 'APPROVED';
                      }
                    }
                    
                    console.log(`🔍 Final approver: ${realApprovedBy}`);
                  }
                  
                  gateReviews.push({
                    ...matchingReview,
                    criteriaName: criteria.name,
                    isApproved: finalIsApproved,
                    progressData,
                    workflowData,
                    versionsData,
                    approvedBy: progressData.results?.find(step => step.status === 'APPROVED')?.actionBy?.name || 'Unknown'
                  });
                  
                  console.log(`✅ Processed review ${matchingReview.id}: approved=${finalIsApproved}, approver=${realApprovedBy}`);
                } catch (error) {
                  console.error(`❌ Error fetching progress for review ${matchingReview.id}:`, error);
                }
              }
            }
            
            // Enhanced approval detection: Check if any criteria has been approved
            if (totalApproved === 0 && gate.criteria?.length > 0) {
              // Check if any criteria has local approval data
              const localApproved = gate.criteria.filter(criteria => 
                isLocalCriteriaApproved(criteria)
              ).length;
              
              if (localApproved > 0) {
                totalApproved = localApproved;
                realApprovedBy = gate.criteria.find(c => c.approvedBy && c.approvedBy !== 'Unassigned' && c.approvedBy !== 'N/A')?.approvedBy || 'N/A';
                realReviewStatus = 'APPROVED';
                console.log(`🔄 Using local approval data for ${gate.name}: ${localApproved} approved`);
              }
            }

            // Do not regress already completed gates to pending/in-progress due transient API gaps.
            if (wasPreviouslyCompleted && gateCriteriaCount > 0) {
              totalApproved = Math.max(totalApproved, gateCriteriaCount);
              if (realReviewStatus === 'N/A') {
                realReviewStatus = 'APPROVED';
              }
            }
            
            // No manual overrides - use actual ACC data only
            
            const realProgress = gate.criteria?.length > 0 ? Math.min(100, Math.round((totalApproved / gate.criteria.length) * 100)) : 0;
            const realStatus = totalApproved === gate.criteria?.length && gate.criteria?.length > 0 ? 'completed' : 
                             totalApproved > 0 ? 'in-progress' : 'pending';
            
            console.log(`📊 Final gate ${gate.name}: progress=${realProgress}%, status=${realStatus}, approver=${realApprovedBy}`);
            
            return {
              ...gate,
              realProgress,
              realStatus,
              realApprovedBy,
              realReviewStatus,
              gateReviews
            };
          })
        );
        
        console.log('📊 Processed gates with real ACC data:', processedGates);
        setRealGatesData(processedGates);
        
        // Calculate metrics with real data
        const metrics = calculateMetrics(processedGates);
    setDashboardData(metrics);
        
      } catch (error) {
        console.error('❌ Error fetching ACC data:', error);
        // Fallback to original gates data
        setRealGatesData(gates);
        const metrics = calculateMetrics(gates);
        setDashboardData(metrics);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealACCData();
  }, [selectedProject?.id, gates]);

  useEffect(() => {
    if (realGatesData.length > 0) {
      const metrics = calculateMetrics(realGatesData);
      setDashboardData(metrics);
    }
  }, [realGatesData]);

  if (!dashboardData) return <div className="p-6 text-center">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PLC Dashboard</h2>
          <p className="text-gray-600">Project: {selectedProject?.name || 'Unknown Project'}</p>
          {loading && <p className="text-sm text-blue-600">🔄 Fetching real ACC data...</p>}
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

        {/* Locked Gates */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Lock className="w-8 h-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Locked Gates</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.lockedGates}</p>
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
              {(realGatesData.length > 0 ? realGatesData : gates).map((gate) => {
                const gateStatus = gate.realStatus ? 
                  { status: gate.realStatus, color: gate.realStatus === 'completed' ? 'success' : gate.realStatus === 'in-progress' ? 'info' : 'primary', icon: CheckCircle, bgColor: gate.realStatus === 'completed' ? 'bg-green-100' : gate.realStatus === 'in-progress' ? 'bg-blue-100' : 'bg-green-50', textColor: gate.realStatus === 'completed' ? 'text-green-800' : gate.realStatus === 'in-progress' ? 'text-blue-800' : 'text-green-700' } :
                  getGateStatus(gate);
                const progress = gate.realProgress !== undefined ? gate.realProgress : calculateGateProgress(gate);
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
                      {gate.realApprovedBy || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gate.realReviewStatus || 'N/A'}
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
        {(realGatesData.length > 0 ? realGatesData : gates).map((gate) => {
          const gateStatus = gate.realStatus ? 
            { status: gate.realStatus, color: gate.realStatus === 'completed' ? 'success' : gate.realStatus === 'in-progress' ? 'info' : 'primary', icon: CheckCircle, bgColor: gate.realStatus === 'completed' ? 'bg-green-100' : gate.realStatus === 'in-progress' ? 'bg-blue-100' : 'bg-green-50', textColor: gate.realStatus === 'completed' ? 'text-green-800' : gate.realStatus === 'in-progress' ? 'text-blue-800' : 'text-green-700' } :
            getGateStatus(gate);
          const progress = gate.realProgress !== undefined ? gate.realProgress : calculateGateProgress(gate);
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