import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Workflow,
  Calendar,
  Target,
  Users,
  BarChart3,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { cn } from '../utils/cn';
import AccFolderBrowser from './AccFolderBrowser';
import AccService from '../services/AccService_old';

const ModernGateManager = ({ 
  gates, 
  setGates,
  onDeleteGate, 
  onToggleExpansion, 
  onAddCriteria, 
  onUpdateCriteria, 
  onRemoveCriteria,
  onSendForReview,
  onSyncProgress,
  expandedGates,
  selectedProject,
  selectedHub,
  workflows,
  showFileBrowser,
  setShowFileBrowser,
  currentCriteriaForFileSelection,
  setCurrentCriteriaForFileSelection,
  phases
}) => {
  
  // State for real ACC data
  const [realGatesData, setRealGatesData] = useState([]);
  const [loadingACCData, setLoadingACCData] = useState(false);
  
  // Fetch real ACC data to sync with Dashboard
  useEffect(() => {
    const fetchRealACCData = async () => {
      if (!selectedProject?.id || gates.length === 0) return;
      
      setLoadingACCData(true);
      try {
        console.log('🔍 ModernGateManager: Fetching real ACC data...');
        
        const allReviews = await AccService.getProjectReviews(selectedProject.id);
        console.log('📊 ModernGateManager: Found reviews from ACC:', allReviews);
        
        if (!allReviews || allReviews.length === 0) {
          console.warn('⚠️ ModernGateManager: No reviews found in ACC');
          setRealGatesData(gates);
          return;
        }
        
        // Process each gate with real ACC data (sequentially to handle dependencies)
        const processedGates = [];
        for (const gate of gates) {
          let totalApproved = 0;
          let realApprovedBy = 'N/A';
          let realReviewStatus = 'N/A';
          
          for (const criteria of gate.criteria || []) {
            // Find matching review using intelligent matching
            const matchingReview = allReviews.find(review => {
              const reviewName = review.name?.toLowerCase() || '';
              const gateName = gate.name.toLowerCase().replace(/gate\s*/g, '');
              const criteriaName = criteria.name.toLowerCase();
              
              return reviewName.includes(`${gateName} - ${criteriaName}`) ||
                     reviewName.includes(`${gateName}-${criteriaName}`) ||
                     reviewName.includes(`${criteriaName} - ${gateName}`) ||
                     reviewName.includes(`${criteriaName}-${gateName}`) ||
                     reviewName.includes(criteriaName) ||
                     reviewName.includes(`${gateName} ${criteriaName}`) ||
                     reviewName.includes(`${criteriaName} ${gateName}`) ||
                     reviewName.includes(`${gateName}${criteriaName}`) ||
                     reviewName.includes(`${criteriaName}${gateName}`) ||
                     (reviewName.includes(criteriaName) && reviewName.includes(gateName));
            });
            
            if (matchingReview) {
              try {
                // Check if review is CLOSED (which means approved in ACC)
                const isClosed = matchingReview.status === 'CLOSED';
                
                // Check if review already has approver info from AccService_old.js
                const hasApprover = matchingReview.approvedBy && matchingReview.approvedBy !== 'Unassigned' && matchingReview.approvedBy !== 'Unknown User';
                
                // Get detailed status from ACC
                const progressData = await AccService.getReviewProgress(
                  selectedProject.id, 
                  matchingReview.id
                );
                
                      // Check multiple possible approval statuses in progress data
                      const isApproved = progressData.results?.some(step => {
                        const status = step.status?.toUpperCase();
                        return status === 'APPROVED' || 
                               status === 'COMPLETED' ||
                               status === 'ACCEPTED' ||
                               status === 'CLOSED';
                      }) || false;
                
                // Also check if review itself is CLOSED or has approver
                const finalIsApproved = isApproved || isClosed || hasApprover;
                
                if (finalIsApproved) {
                  totalApproved++;
                  
                  // Use approver from review if available (AccService_old.js already processed it)
                  if (hasApprover) {
                    realApprovedBy = matchingReview.approvedBy;
                    realReviewStatus = 'APPROVED';
                  } else {
                      // Fallback: Get real approver name from ACC progress data
                      const approverStep = progressData.results?.find(step => {
                        const status = step.status?.toUpperCase();
                        return status === 'APPROVED' || status === 'COMPLETED' || status === 'CLOSED';
                      });
                    
                    if (approverStep?.actionBy?.name) {
                      realApprovedBy = approverStep.actionBy.name;
                      realReviewStatus = 'APPROVED';
                    } else if (approverStep?.completedBy?.name) {
                      realApprovedBy = approverStep.completedBy.name;
                      realReviewStatus = 'APPROVED';
                    } else if (approverStep?.user?.name) {
                      realApprovedBy = approverStep.user.name;
                      realReviewStatus = 'APPROVED';
                    }
                  }
                }
                
                // Update criteria with real ACC data
                criteria.reviewStatus = finalIsApproved ? 'approved' : 'pending';
                criteria.approvedBy = realApprovedBy;
                criteria.reviewId = matchingReview.id;
                
              } catch (error) {
                console.error(`❌ Error fetching progress for review ${matchingReview.id}:`, error);
              }
            }
          }
          
          // No manual overrides - use actual ACC data only
          
          // Determine real status considering sequential logic
          let finalRealStatus = 'open';
          
          if (totalApproved === gate.criteria?.length && gate.criteria?.length > 0) {
            finalRealStatus = 'completed';
          } else if (totalApproved > 0) {
            finalRealStatus = 'in-progress';
          } else {
            // Check if gate should be locked due to previous gate not being completed
            if (gate.order > 0) {
              const previousGate = processedGates.find(g => g.order === gate.order - 1);
              if (previousGate) {
                // Check if previous gate is completed using real ACC data
                let prevIsCompleted = false;
                
                if (previousGate.realStatus === 'completed') {
                  prevIsCompleted = true;
                } else {
                  // Fallback to criteria-based check
                  const prevTotalCriteria = previousGate.criteria?.length || 0;
                  const prevApprovedCriteria = previousGate.criteria?.filter(c => 
                    c.reviewStatus === 'approved' || 
                    (c.reviewId && c.approvedBy && c.approvedBy !== 'Unassigned')
                  ).length || 0;
                  prevIsCompleted = prevTotalCriteria > 0 && prevApprovedCriteria === prevTotalCriteria;
                }
                
                if (!prevIsCompleted) {
                  finalRealStatus = 'locked';
                }
              }
            }
          }
          
          const processedGate = {
            ...gate,
            realProgress: gate.criteria?.length > 0 ? Math.min(100, Math.round((totalApproved / gate.criteria.length) * 100)) : 0,
            realStatus: finalRealStatus,
            realApprovedBy,
            realReviewStatus
          };
          
          processedGates.push(processedGate);
        }
        
        console.log('📊 ModernGateManager: Processed gates with real ACC data:', processedGates);
        setRealGatesData(processedGates);
        
        // Update the main gates state with real data
        setGates(processedGates);
        
      } catch (error) {
        console.error('❌ ModernGateManager: Error fetching ACC data:', error);
        setRealGatesData(gates);
      } finally {
        setLoadingACCData(false);
      }
    };
    
    fetchRealACCData();
  }, [selectedProject?.id, gates.length]); // Only run when project or gates change
  
  // Save gates to localStorage
  const saveGates = (gatesToSave) => {
    if (selectedProject?.id) {
      localStorage.setItem(`gates_${selectedProject.id}`, JSON.stringify(gatesToSave));
    }
  };
  const [editingGate, setEditingGate] = useState(null);
  const [gateFormData, setGateFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    phaseId: ''
  });

  const handleAddGate = () => {
    setGateFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      phaseId: ''
    });
    setEditingGate('new');
  };

  // Auto-set start date when phase is selected
  const handlePhaseChange = (phaseId) => {
    const gatesInSamePhase = gates.filter(g => g.phaseId === phaseId).sort((a, b) => a.order - b.order);
    const lastGateInPhase = gatesInSamePhase[gatesInSamePhase.length - 1];
    
    let suggestedStartDate = '';
    let suggestedEndDate = '';
    
    if (lastGateInPhase && lastGateInPhase.endDate) {
      // Set start date to day after last gate in phase
      const prevEndDate = new Date(lastGateInPhase.endDate);
      const nextStartDate = new Date(prevEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);
      suggestedStartDate = nextStartDate.toISOString().split('T')[0];
      
      // Suggest end date 2 weeks later
      const suggestedEnd = new Date(nextStartDate);
      suggestedEnd.setDate(suggestedEnd.getDate() + 14);
      suggestedEndDate = suggestedEnd.toISOString().split('T')[0];
    } else {
      // First gate in phase - suggest today's date
      const today = new Date();
      suggestedStartDate = today.toISOString().split('T')[0];
      
      // Suggest end date 2 weeks later
      const suggestedEnd = new Date(today);
      suggestedEnd.setDate(suggestedEnd.getDate() + 14);
      suggestedEndDate = suggestedEnd.toISOString().split('T')[0];
    }
    
    setGateFormData({
      ...gateFormData,
      phaseId,
      startDate: suggestedStartDate,
      endDate: suggestedEndDate
    });
  };

  const handleEditGate = (gate) => {
    setGateFormData({
      name: gate.name,
      description: gate.description,
      startDate: gate.startDate,
      endDate: gate.endDate,
      phaseId: gate.phaseId || ''
    });
    setEditingGate(gate);
  };

  const handleSaveGate = () => {
    if (!gateFormData.name.trim()) {
      alert('Please enter a gate name');
      return;
    }

    if (!gateFormData.phaseId) {
      alert('Please select a phase for this gate');
      return;
    }

    // Check for duplicate gate names within the same phase
    const trimmedName = gateFormData.name.trim();
    
    // Find existing gates in the same phase with the same name
    const duplicateGate = gates.find(gate => 
      gate.phaseId === gateFormData.phaseId && 
      gate.name.toLowerCase() === trimmedName.toLowerCase() &&
      gate.id !== editingGate?.id // Exclude the current gate being edited
    );
    
    if (duplicateGate) {
      alert(`A gate named "${trimmedName}" already exists in this phase. Please choose a different name.`);
      return;
    }

    // Date validation
    if (!gateFormData.startDate || !gateFormData.endDate) {
      alert('Please enter both start and end dates');
      return;
    }

    const startDate = new Date(gateFormData.startDate);
    const endDate = new Date(gateFormData.endDate);
    
    if (endDate <= startDate) {
      alert('End date must be after start date');
      return;
    }

    // Phase-aware sequential gate date validation
    const currentPhaseId = gateFormData.phaseId;
    const gatesInSamePhase = gates.filter(g => g.phaseId === currentPhaseId).sort((a, b) => a.order - b.order);
    
    // Find the last gate in the same phase
    const lastGateInPhase = gatesInSamePhase[gatesInSamePhase.length - 1];
    
    if (lastGateInPhase && lastGateInPhase.endDate) {
      const prevEndDate = new Date(lastGateInPhase.endDate);
      const expectedStartDate = new Date(prevEndDate);
      expectedStartDate.setDate(expectedStartDate.getDate() + 1);
      
      // Format dates consistently for comparison
      const startDateStr = startDate.toISOString().split('T')[0];
      const expectedStartDateStr = expectedStartDate.toISOString().split('T')[0];
      
      if (startDateStr !== expectedStartDateStr) {
        const formattedExpectedDate = expectedStartDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        alert(`Start date must be ${formattedExpectedDate} (day after previous gate in this phase ends)`);
        return;
      }
    }

    const gateData = {
      id: editingGate === 'new' ? `gate-${Date.now()}` : editingGate.id,
      name: gateFormData.name.trim(),
      description: gateFormData.description.trim(),
      startDate: gateFormData.startDate,
      endDate: gateFormData.endDate,
      phaseId: gateFormData.phaseId,
      criteria: editingGate === 'new' ? [] : (gates.find(g => g.id === editingGate.id)?.criteria || []),
      status: editingGate === 'new' ? 'in-progress' : (gates.find(g => g.id === editingGate.id)?.status || 'in-progress'),
      order: editingGate === 'new' ? gates.length : (gates.find(g => g.id === editingGate.id)?.order || gates.length)
    };

    let updatedGates;
    if (editingGate === 'new') {
      updatedGates = [...gates, gateData];
    } else {
      updatedGates = gates.map(gate => 
        gate.id === editingGate.id ? gateData : gate
      );
    }
    
    setGates(updatedGates);
    saveGates(updatedGates);
    
    setEditingGate(null);
    setGateFormData({ name: '', description: '', startDate: '', endDate: '', phaseId: '' });
  };

  const canSendGateForReview = (gate) => {
    console.log(`🚀🚀🚀 canSendGateForReview called for ${gate.name} (order: ${gate.order})`);
    
    // Check if gate has already been sent for review
    if (gate.sentForReview) {
      console.log(`🚫 ${gate.name} cannot send - already sent for review`);
      return false;
    }
    
    // First gate (order 0) can always be sent
    if (gate.order === 0) {
      console.log(`✅ ${gate.name} can send - it's the first gate (order 0)`);
      return true;
    }
    
    // Find the previous gate
    const previousGate = gates.find(g => g.order === gate.order - 1);
    if (!previousGate) {
      console.log(`❌ ${gate.name} cannot send - no previous gate found`);
      return false;
    }
    
    console.log(`🔍 Checking previous gate ${previousGate.name}:`, {
      previousGateRealStatus: previousGate.realStatus,
      previousGateStatus: previousGate.status,
      previousGateProgress: previousGate.realProgress || 0,
      previousGateApprovedBy: previousGate.realApprovedBy
    });
    
    // Check if previous gate is completed using ACC data
    if (previousGate.realStatus === 'completed') {
      console.log(`✅ ${gate.name} can send - previous gate ${previousGate.name} is completed`);
      return true;
    }
    
    // Check if previous gate has 100% progress and approver (completed)
    if (previousGate.realProgress === 100 && previousGate.realApprovedBy && previousGate.realApprovedBy !== 'N/A') {
      console.log(`✅ ${gate.name} can send - previous gate ${previousGate.name} has 100% progress and approver`);
      return true;
    }
    
    // Check if previous gate is completed based on criteria approval
    const prevTotalCriteria = previousGate.criteria?.length || 0;
    const prevApprovedCriteria = previousGate.criteria?.filter(c => 
      c.reviewStatus === 'approved' || 
      (c.reviewId && c.approvedBy && c.approvedBy !== 'Unassigned')
    ).length || 0;
    
    if (prevTotalCriteria > 0 && prevApprovedCriteria === prevTotalCriteria) {
      console.log(`✅ ${gate.name} can send - previous gate ${previousGate.name} has all criteria approved`);
      return true;
    }
    
    console.log(`🔒 ${gate.name} is LOCKED - previous gate ${previousGate.name} is not completed`);
    return false;
  };

  const calculateGateProgress = (gate) => {
    // Use real ACC data if available
    if (gate.realProgress !== undefined) {
      return gate.realProgress;
    }
    
    const totalCriteria = gate.criteria?.length || 0;
    if (totalCriteria === 0) return 0;
    
    const criteriaApproved = gate.criteria?.filter(criteria => 
      criteria.reviewStatus === 'approved' || 
      (criteria.reviewId && criteria.approvedBy && criteria.approvedBy !== 'Unassigned' && criteria.approvedBy !== 'N/A')
    ).length || 0;
    
    // Calculate actual progress based on approved criteria
    return Math.min(100, Math.round((criteriaApproved / totalCriteria) * 100));
  };

  const getGateStatus = (gate) => {
    console.log(`🔍 getGateStatus for ${gate.name}:`, {
      realStatus: gate.realStatus,
      realProgress: gate.realProgress,
      realApprovedBy: gate.realApprovedBy,
      status: gate.status,
      criteria: gate.criteria?.length || 0,
      order: gate.order
    });
    
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
          console.log(`🔒 ${gate.name} is LOCKED - previous gate ${previousGate.name} is not completed`);
          return { status: 'locked', color: 'secondary', icon: Lock };
        }
      }
    }
    
    // Use real ACC data if available
    if (gate.realStatus) {
      const statusMap = {
        'completed': { status: 'completed', color: 'success', icon: CheckCircle },
        'in-progress': { status: 'in-progress', color: 'info', icon: Clock },
        'pending': { status: 'pending', color: 'warning', icon: Clock },
        'locked': { status: 'locked', color: 'secondary', icon: Lock }
      };
      console.log(`✅ Using realStatus for ${gate.name}: ${gate.realStatus}`);
      return statusMap[gate.realStatus] || statusMap['pending'];
    }
    
    console.log(`⚠️ No realStatus for ${gate.name}, using fallback logic`);
    
    const totalCriteria = gate.criteria?.length || 0;
    const criteriaApproved = gate.criteria?.filter(criteria => 
      criteria.reviewStatus === 'approved' || 
      (criteria.reviewId && criteria.approvedBy && criteria.approvedBy !== 'Unassigned' && criteria.approvedBy !== 'N/A')
    ).length || 0;
    
    // Completed: All criteria approved
    if (totalCriteria > 0 && criteriaApproved === totalCriteria) {
      // Update gate status to completed if not already
      if (gate.status !== 'completed') {
        const updatedGates = gates.map(g => 
          g.id === gate.id ? { ...g, status: 'completed' } : g
        );
        setGates(updatedGates);
        saveGates(updatedGates);
      }
      return { status: 'completed', color: 'success', icon: CheckCircle };
    }
    
    // In Progress: Some criteria approved OR submitted
    if (criteriaApproved > 0 || gate.status === 'submitted' || gate.status === 'in-progress') {
      return { status: 'in-progress', color: 'info', icon: Clock };
    }
    
    // Default: Pending (waiting for review)
    return { status: 'pending', color: 'warning', icon: Clock };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gate Management</h2>
          <p className="text-gray-600 mt-1">Manage project gates and review criteria</p>
          {loadingACCData && <p className="text-sm text-blue-600 mt-1">🔄 Syncing with ACC data...</p>}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddGate}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add Gate</span>
        </motion.button>
      </div>

      {/* Gates List */}
      <div className="space-y-4">
        <AnimatePresence>
          {gates.map((gate, index) => {
            const isExpanded = expandedGates.has(gate.id);
            const progress = calculateGateProgress(gate);
            const gateStatus = getGateStatus(gate);
            const StatusIcon = gateStatus.icon;
            const canSend = loadingACCData ? false : canSendGateForReview(gate);
            
            console.log(`🔍 Gate ${gate.name} (index ${index}):`, {
              canSend,
              status: gate.status,
              gateStatus: gateStatus.status,
              realStatus: gate.realStatus,
              order: gate.order
            });

            return (
              <motion.div
                key={gate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={cn(
                  "transition-all duration-300 hover:shadow-xl",
                  gate.status === 'submitted' ? "border-gray-300 bg-gray-50 opacity-75" : 
                  "border-gray-200 bg-white"
                )}>
                  <CardContent className="p-6">
                    {/* Gate Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => onToggleExpansion(gate.id)}
                          className={cn(
                            "p-2 rounded-full transition-colors",
                            isExpanded ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500 hover:bg-blue-50"
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>

                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                            gateStatus.color === 'success' ? "bg-green-500" :
                            gateStatus.color === 'info' ? "bg-blue-500" :
                            gateStatus.color === 'warning' ? "bg-yellow-500" : "bg-gray-500"
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className={cn(
                              "text-xl font-bold",
                              gate.status === 'submitted' ? "text-gray-500" : "text-gray-900"
                            )}>
                              {gate.name}
                              {gate.status === 'submitted' && (
                                <span className="ml-2 text-sm font-normal text-gray-400">(Submitted)</span>
                              )}
                            </h3>
                            <p className={cn(
                              "text-gray-600",
                              gate.status === 'submitted' ? "text-gray-400" : ""
                            )}>
                              {gate.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        
                        {gateStatus.status === 'locked' && (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </Badge>
                        )}

                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge variant={gateStatus.color} className="flex items-center space-x-1">
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{gateStatus.status}</span>
                        </Badge>

                        <div className="flex items-center space-x-2">
                          {gate.criteria?.some(c => c.reviewId) && (
                            <button
                              onClick={() => onSyncProgress(gate)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-full transition-colors"
                              title="Sync with ACC review progress"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {gate.status !== 'submitted' && (
                            <button
                              onClick={() => handleEditGate(gate)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                              title="Edit gate"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteGate(gate.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                            title="Delete gate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>


                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-6 space-y-4"
                        >
                          {/* Criteria Section */}
                          <div>
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                  <Target className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900">Criteria</h4>
                                  <p className="text-sm text-gray-500">Define requirements for this gate</p>
                                </div>
                              </div>
                              <button
                                onClick={() => onAddCriteria(gate.id)}
                                disabled={gate.status === 'submitted'}
                                className={cn(
                                  "group flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 shadow-lg transform",
                                  gate.status === 'submitted' 
                                    ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
                                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:-translate-y-0.5"
                                )}
                              >
                                <Plus className={cn(
                                  "w-5 h-5 transition-transform duration-200",
                                  gate.status === 'submitted' ? "" : "group-hover:rotate-90"
                                )} />
                                <span className="font-medium">
                                  {gate.status === 'submitted' ? 'Gate Submitted' : 'Add Criteria'}
                                </span>
                              </button>
                            </div>

                            <div className="space-y-4">
                              {gate.criteria && gate.criteria.length > 0 ? (
                                gate.criteria.map((criteria, criteriaIndex) => (
                                <Card key={criteria.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center space-x-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-semibold text-sm">
                                          {criteriaIndex + 1}
                                        </div>
                                        <div className="flex-1">
                                        <input
                                          type="text"
                                          value={criteria.name}
                                          onChange={(e) => onUpdateCriteria(gate.id, criteria.id, 'name', e.target.value)}
                                          disabled={gate.status === 'submitted'}
                                          className={cn(
                                            "w-full text-lg font-semibold rounded px-3 py-2 transition-colors",
                                            gate.status === 'submitted' 
                                              ? "text-gray-500 bg-gray-100 cursor-not-allowed" 
                                              : "text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50"
                                          )}
                                          placeholder="Enter criteria name"
                                        />
                                        
                                        {/* Review Status Indicators */}
                                        {criteria.reviewId && (
                                          <div className="mt-2 flex items-center space-x-2">
                                            <Badge 
                                              variant={criteria.reviewStatus === 'approved' ? 'success' : 
                                                      criteria.reviewStatus === 'rejected' ? 'destructive' : 
                                                      criteria.reviewStatus === 'in-progress' ? 'secondary' : 'outline'}
                                              className="text-xs"
                                            >
                                              {criteria.reviewStatus === 'approved' ? '✅ Approved' : 
                                               criteria.reviewStatus === 'rejected' ? '❌ Rejected' : 
                                               criteria.reviewStatus === 'in-progress' ? '🔄 In Progress' : 
                                               '📋 Submitted'}
                                            </Badge>
                                            {criteria.approvedBy && criteria.approvedBy !== 'Unassigned' && (
                                              <span className="text-xs text-gray-600">
                                                by {criteria.approvedBy}
                                              </span>
                                            )}
                                            {criteria.totalFiles && (
                                              <span className="text-xs text-gray-500">
                                                ({criteria.approvedFiles || 0}/{criteria.totalFiles} files)
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        </div>
                                      </div>
                                      {gate.status !== 'submitted' && (
                                        <button
                                          onClick={() => onRemoveCriteria(gate.id, criteria.id)}
                                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 hover:scale-110"
                                          title="Remove criteria"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      )}
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Description
                                        </label>
                                        <textarea
                                          value={criteria.description}
                                          onChange={(e) => onUpdateCriteria(gate.id, criteria.id, 'description', e.target.value)}
                                          disabled={gate.status === 'submitted'}
                                          className={cn(
                                            "w-full text-sm rounded-xl px-4 py-3 transition-all duration-200 resize-none",
                                            gate.status === 'submitted' 
                                              ? "text-gray-500 bg-gray-100 border-gray-200 cursor-not-allowed" 
                                              : "text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                                          )}
                                          placeholder="Describe what needs to be reviewed or checked..."
                                          rows={3}
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span>Selected File</span>
                                          </label>
                                          {criteria.selectedFile ? (
                                            <div className="group flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all duration-200">
                                              <div className="p-2 bg-blue-100 rounded-lg">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-blue-900 truncate">{criteria.selectedFile.name}</p>
                                                <p className="text-xs text-blue-600">File selected from ACC</p>
                                              </div>
                                              <button
                                                onClick={() => {
                                                  console.log('🔍 Clear file selection for gate:', gate.id, 'criteria:', criteria.id);
                                                  onUpdateCriteria(gate.id, criteria.id, 'selectedFile', null);
                                                }}
                                                className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                                title="Clear file selection"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                if (gate.status !== 'submitted') {
                                                  console.log('🔍 Select File button clicked for gate:', gate.id, 'criteria:', criteria.id);
                                                  setCurrentCriteriaForFileSelection({ gateId: gate.id, criteriaId: criteria.id });
                                                  setShowFileBrowser(true);
                                                }
                                              }}
                                              disabled={gate.status === 'submitted'}
                                              className={cn(
                                                "group w-full p-4 border-2 border-dashed rounded-xl transition-all duration-200 text-center",
                                                gate.status === 'submitted' 
                                                  ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                                                  : "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                              )}
                                            >
                                              <div className="flex flex-col items-center space-y-2">
                                                <div className="p-3 bg-gray-100 group-hover:bg-blue-100 rounded-full transition-colors">
                                                  <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Select File from ACC</p>
                                                  <p className="text-xs text-gray-500 group-hover:text-blue-600">Browse project documents</p>
                                                </div>
                                              </div>
                                            </button>
                                          )}
                                        </div>

                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                                            <Workflow className="w-4 h-4 text-purple-600" />
                                            <span>Workflow</span>
                                          </label>
                                          <select
                                            value={criteria.selectedWorkflow?.id || ''}
                                            onChange={(e) => {
                                              if (gate.status !== 'submitted') {
                                                const workflow = workflows.find(w => w.id === e.target.value);
                                                onUpdateCriteria(gate.id, criteria.id, 'selectedWorkflow', workflow);
                                              }
                                            }}
                                            disabled={gate.status === 'submitted'}
                                            className={cn(
                                              "w-full p-4 text-sm rounded-xl transition-all duration-200",
                                              gate.status === 'submitted' 
                                                ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" 
                                                : "bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 hover:border-gray-300"
                                            )}
                                          >
                                            <option value="">Select approval workflow</option>
                                            {workflows.map(workflow => (
                                              <option key={workflow.id} value={workflow.id}>
                                                {workflow.name} ({workflow.steps?.length || 0} steps)
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                ))
                              ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                  <div className="flex flex-col items-center space-y-4">
                                    <div className="p-4 bg-gray-100 rounded-full">
                                      <Target className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-medium text-gray-900">No criteria defined</h3>
                                      <p className="text-sm text-gray-500 mt-1">Add criteria to define what needs to be reviewed for this gate</p>
                                    </div>
                                    <button
                                      onClick={() => onAddCriteria(gate.id)}
                                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>Add First Criteria</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Send for Review Button */}
                          <div className="flex justify-end pt-4">
                          <div className="flex flex-col items-end space-y-2">
                            {!canSend && gateStatus.status === 'locked' && (
                              <p className="text-sm text-amber-600 flex items-center space-x-1">
                                <AlertCircle className="w-4 h-4" />
                                <span>Complete previous gate first</span>
                              </p>
                            )}
                            {!canSend && gate.sentForReview && (
                              <p className="text-sm text-gray-500 flex items-center space-x-1">
                                <CheckCircle className="w-4 h-4" />
                                <span>Already sent for review</span>
                              </p>
                            )}
                            {canSend && (!gate.criteria || gate.criteria.length === 0) && (
                                <p className="text-sm text-amber-600 flex items-center space-x-1">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Add at least one criteria</span>
                                </p>
                              )}
                              {canSend && gate.criteria && gate.criteria.length > 0 && gate.criteria.every(criteria => !criteria.selectedFile || !criteria.selectedWorkflow) && (
                                <p className="text-sm text-amber-600 flex items-center space-x-1">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Select file and workflow for all criteria</span>
                                </p>
                              )}
                              <motion.button
                                whileHover={gate.status !== 'submitted' ? { scale: 1.05 } : {}}
                                whileTap={gate.status !== 'submitted' ? { scale: 0.95 } : {}}
                                onClick={() => onSendForReview(gate)}
                                disabled={gate.status === 'submitted' || !canSend || !gate.criteria || gate.criteria.length === 0 || gate.criteria.every(criteria => !criteria.selectedFile || !criteria.selectedWorkflow)}
                                className={cn(
                                  "flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-colors",
                                  gate.status === 'submitted' 
                                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    : canSend && gate.criteria && gate.criteria.length > 0 && !gate.criteria.every(criteria => !criteria.selectedFile || !criteria.selectedWorkflow)
                                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
                                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                )}
                              >
                                <CheckCircle className="w-5 h-5" />
                                <span>{gate.sentForReview ? 'Already Sent' : (gate.status === 'submitted' ? 'Gate Submitted' : 'Send Gate for Review')}</span>
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add/Edit Gate Modal */}
      <AnimatePresence>
        {editingGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-xl font-bold mb-4">
                {editingGate === 'new' ? 'Add New Gate' : 'Edit Gate'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gate Name
                  </label>
                  <input
                    type="text"
                    value={gateFormData.name}
                    onChange={(e) => setGateFormData({ ...gateFormData, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter gate name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={gateFormData.description}
                    onChange={(e) => setGateFormData({ ...gateFormData, description: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter gate description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase *
                  </label>
                  <select
                    value={gateFormData.phaseId || ''}
                    onChange={(e) => handlePhaseChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a phase</option>
                    {phases && phases.map(phase => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Start date will be automatically set to the day after the last gate in this phase
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={gateFormData.startDate}
                      onChange={(e) => setGateFormData({ ...gateFormData, startDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={gateFormData.endDate}
                      onChange={(e) => setGateFormData({ ...gateFormData, endDate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingGate(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Gate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACC File Browser Modal */}
      <AccFolderBrowser
        isOpen={showFileBrowser}
        projectId={selectedProject?.id}
        onClose={() => {
          console.log('🔍 Closing file browser');
          setShowFileBrowser(false);
        }}
        onFileSelect={(selectedFiles) => {
          console.log('🔍 AccFolderBrowser onFileSelect called with:', selectedFiles);
          
          // Handle both single file and array of files
          let filesToProcess = [];
          if (Array.isArray(selectedFiles)) {
            filesToProcess = selectedFiles;
          } else if (selectedFiles && typeof selectedFiles === 'object') {
            filesToProcess = [selectedFiles];
          }
          
          console.log('📁 Files to process:', filesToProcess);
          
          // Add selected files to criteria (only files, not folders)
          const validFiles = filesToProcess.filter(file => file.type === 'file');
          
          if (validFiles.length > 0 && currentCriteriaForFileSelection) {
            console.log('📁 Adding file to criteria:', validFiles[0]);
            onUpdateCriteria(
              currentCriteriaForFileSelection.gateId, 
              currentCriteriaForFileSelection.criteriaId, 
              'selectedFile', 
              validFiles[0]
            );
            setCurrentCriteriaForFileSelection(null);
          }
          
          setShowFileBrowser(false);
        }}
        hubId={selectedHub?.id}
        multiSelect={false}
      />
    </div>
  );
};

export default ModernGateManager;
