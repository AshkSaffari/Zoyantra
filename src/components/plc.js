import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Edit, Trash2, X, CheckCircle, Clock, ChevronDown, ChevronRight, Target, TrendingUp } from "lucide-react";
import AccService from "../services/AccService_old";
import AccFolderBrowser from "./AccFolderBrowser";
import ModernGateManager from "./ModernGateManager";
import Dashboard from "./Dashboard";

const PLC = ({ selectedProject, selectedHub }) => {
  const [loading, setLoading] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loadingWorkflowDetails, setLoadingWorkflowDetails] = useState(false);
  const [authStatus, setAuthStatus] = useState("checking"); // checking, authenticated, expired, missing
  const [authMessage, setAuthMessage] = useState("");
  
  // Gate System State
  const [gates, setGates] = useState([]);
  const [expandedGates, setExpandedGates] = useState(new Set());
  const [currentCriteriaForFileSelection, setCurrentCriteriaForFileSelection] = useState(null);
  const [viewMode, setViewMode] = useState('phases'); // phases, gates, dashboard, table
  
  // Phase Management State
  const [phases, setPhases] = useState([]);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseFormData, setPhaseFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    order: 0
  });

  // Check authentication status when component mounts
  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  // Load workflows when component mounts
  useEffect(() => {
    if (selectedProject?.id) {
      loadWorkflows();
    }
  }, [selectedProject?.id]);

  // Note: ACC data fetching is handled by ModernGateManager component

  // Check authentication status and handle token refresh
  const checkAuthenticationStatus = async () => {
    try {
      setAuthStatus("checking");
      setAuthMessage("Checking authentication...");

      const credentials = JSON.parse(localStorage.getItem("zoyantra_credentials") || '{}');
      
      if (!credentials.threeLegToken) {
        setAuthStatus("missing");
        setAuthMessage("No 3-legged token found. Please sign in first.");
        return;
      }

      // Check if token is expired
      if (AccService.isTokenExpired()) {
        console.log("ðŸ”„ Token expired, attempting refresh...");
        setAuthStatus("checking");
        setAuthMessage("Token expired, refreshing...");
        
        try {
          await AccService.refreshAccessToken();
          setAuthStatus("authenticated");
          setAuthMessage("Token refreshed successfully!");
        } catch (refreshError) {
          console.error("âŒ Token refresh failed:", refreshError);
          setAuthStatus("expired");
          setAuthMessage("Token refresh failed. Please sign in again.");
        }
      } else {
        setAuthStatus("authenticated");
        setAuthMessage("Authentication successful!");
      }
    } catch (error) {
      console.error("âŒ Authentication check failed:", error);
      setAuthStatus("missing");
      setAuthMessage("Authentication check failed. Please sign in again.");
    }
  };

  // Start OAuth flow
  const startOAuthFlow = async () => {
    try {
      setAuthStatus("checking");
      setAuthMessage("Starting OAuth flow...");
      
      const authUrl = AccService.getThreeLeggedToken();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        setAuthStatus("missing");
        setAuthMessage("Failed to start OAuth flow. Please try again.");
      }
    } catch (error) {
      console.error("âŒ OAuth flow failed:", error);
      setAuthStatus("missing");
      setAuthMessage("OAuth flow failed. Please try again.");
    }
  };

  const loadWorkflows = useCallback(async () => {
    if (!selectedProject?.id) return;
    
    try {
      console.log('ðŸ” Loading workflows for review creation...');
      const workflowsData = await AccService.getProjectWorkflows(selectedProject.id, selectedHub?.id);
      setWorkflows(workflowsData || []);
      console.log('âœ… Workflows loaded:', workflowsData);
    } catch (error) {
      console.error('âŒ Error loading workflows:', error);
      setWorkflows([]);
    }
  }, [selectedProject?.id, selectedHub?.id]);

  // Load detailed workflow information
  const loadWorkflowDetails = async (workflowId) => {
    try {
      console.log("ðŸ” Loading workflow details for:", workflowId);
      setLoadingWorkflowDetails(true);
      
      const credentials = JSON.parse(localStorage.getItem("zoyantra_credentials") || '{}');
      const token = credentials.threeLegToken;

      if (!token) {
        console.error("âŒ No authentication token found");
        return;
      }

      // For workflow details API, keep b. prefix (workflows API needs it)
      const projectId = selectedProject.id.startsWith("b.")
        ? selectedProject.id
        : `b.${selectedProject.id}`;

      const response = await fetch(`/api/acc/workflows/${projectId}/${workflowId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      console.log("ðŸ“Š Workflow details response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("âœ… Workflow details loaded:", data);
        setWorkflowDetails(data);
      } else {
        const errorData = await response.json();
        console.error("âŒ Failed to load workflow details:", response.status, errorData);
      }
    } catch (error) {
      console.error("âŒ Error loading workflow details:", error);
    } finally {
      setLoadingWorkflowDetails(false);
    }
  };

  const createReview = async () => {
    try {
      console.log("ðŸš€ Starting review creation...");
      if (!selectedWorkflow || !selectedFile) {
        alert("Please select workflow and file");
        return;
      }

      setLoading(true);

      // For review creation, use clean project ID without b. prefix
      const projectId = selectedProject.id.startsWith("b.")
        ? selectedProject.id.substring(2)
        : selectedProject.id;
      const workflowId = selectedWorkflow.id;
      const lineageUrn = selectedFile.id;

      console.log("ðŸ“‹ Project:", projectId);
      console.log("ðŸ“‹ Workflow:", workflowId);
      console.log("ðŸ“‹ Selected file lineage URN:", lineageUrn);
      console.log("ðŸ“‹ Selected file version URN:", selectedFile.versionUrn);
      console.log("ðŸ“‹ Selected file version number:", selectedFile.versionNumber);

      // --- Use version URN if available, otherwise convert lineage URN â†’ version URN ---
      let versionUrn = selectedFile.versionUrn;
      
      if (!versionUrn) {
        console.log("ðŸ”„ No version URN found, converting lineage URN...");
        versionUrn = await getVersionUrn(projectId, lineageUrn);
        if (!versionUrn) {
          throw new Error("Unable to retrieve file version URN.");
        }
      } else {
        console.log("âœ… Using provided version URN:", versionUrn);
      }

      console.log("âœ… Final fileVersion URN:", versionUrn);

      // --- Construct payload using simple format (matching curl example) ---
      const payload = {
        name: reviewName || `Review_${new Date().toISOString()}`,
        fileVersions: [
          {
            urn: versionUrn
          }
        ],
        workflowId: workflowId
      };

      console.log("ðŸ“¦ Payload to Autodesk:", JSON.stringify(payload, null, 2));
      
      // Get token from stored credentials
      const credentials = JSON.parse(localStorage.getItem("zoyantra_credentials") || '{}');
      const token = credentials.threeLegToken;
      
      console.log("ðŸ”‘ Using stored 3-legged token for review creation");
      console.log("ðŸ”‘ Token preview:", token ? token.substring(0, 50) + "..." : "No token");
      console.log("ðŸ”‘ Token length:", token ? token.length : 0);

      if (!token) {
        alert("âŒ No authentication token found. Please sign in first.");
        setLoading(false);
        return;
      }

      // Use direct fetch with proper project ID handling (remove b. prefix)
      const cleanProjectId = projectId.startsWith('b.') ? projectId.substring(2) : projectId;
      console.log('ðŸ” Original project ID:', projectId);
      console.log('ðŸ” Clean project ID (no b. prefix):', cleanProjectId);
      
      console.log("ðŸ” Making API call to:", `/api/acc/reviews/${cleanProjectId}?projectId=${cleanProjectId}`);
      console.log("ðŸ” Using token:", token ? token.substring(0, 50) + "..." : "No token");
      console.log("ðŸ” Payload being sent:", JSON.stringify(payload, null, 2));

      const res = await fetch(`/api/acc/reviews/${cleanProjectId}?projectId=${cleanProjectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("ðŸ” Response status:", res.status);
      console.log("ðŸ” Response ok:", res.ok);
      console.log("ðŸ” Response headers:", Object.fromEntries(res.headers.entries()));

      const data = await res.json();
      console.log("âœ… Review created:", data);
      console.log("ðŸ” Response data keys:", Object.keys(data));
      console.log("ðŸ” Response data.id:", data.id);
      console.log("ðŸ” Response data.data:", data.data);
      console.log("ðŸ” Response data.data.id:", data.data?.id);
      
      if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${data.error || data.message || 'Unknown error'}`);
      }
      
      const reviewId = data.id || data.data?.id || data.data?.attributes?.id || "(no ID returned)";
      alert(`Review created successfully: ${reviewId}`);
    } catch (err) {
      console.error("âŒ Review creation failed:", err);
      alert(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Convert lineage â†’ version URN
  // -----------------------------
  const getVersionUrn = async (projectId, lineageUrn) => {
    try {
      console.log("ðŸ” Getting version URN for:", lineageUrn);
      const credentials = JSON.parse(localStorage.getItem("zoyantra_credentials") || '{}');
      const token = credentials.threeLegToken;

      const versionsUrl = `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${encodeURIComponent(
        lineageUrn
      )}/versions`;
      
      console.log("🔍 Versions URL:", versionsUrl);
      console.log("🔍 Project ID:", projectId);
      console.log("🔍 Token exists:", !!token);
      
      if (!lineageUrn) {
        console.error("❌ No lineage URN provided");
        return null;
      }
      
      if (!token) {
        console.error("❌ No authentication token found");
        return null;
      }

      const res = await fetch(versionsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.api+json",
        },
      });

      console.log("🔍 Versions API response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Versions API error:", res.status, errorText);
        console.warn("⚠️ Versions API failed - this is likely due to ACC API changes");
        console.warn("⚠️ Cannot create review without valid version URN");
        return null; // Return null instead of invalid fallback
      }

      const json = await res.json();
      console.log("🔍 Versions API response:", json);
      if (res.ok && json.data && json.data.length > 0) {
        const latestVersion = json.data[0];
        console.log("ðŸ“„ Latest version object:", latestVersion);
        return latestVersion.id; // e.g. urn:adsk.wipprod:fs.file:vf.xxxxx?version=1
      } else {
        console.warn("âš ï¸ Failed to get version list, using fallback format");
        return lineageUrn.replace(
          "urn:adsk.wipprodanz:dm.lineage:",
          "urn:adsk.wipprod:fs.file:vf."
        ) + "?version=1";
      }
    } catch (err) {
      console.error("âŒ getVersionUrn error:", err);
      return null;
    }
  };

  // Gate Management Functions
  const loadGates = () => {
    if (selectedProject?.id) {
      const storedGates = localStorage.getItem(`gates_${selectedProject.id}`);
      if (storedGates) {
        const parsedGates = JSON.parse(storedGates);
        setGates(parsedGates);
        
        // Auto-sync progress for gates with reviews
        parsedGates.forEach(gate => {
          if (gate.criteria?.some(c => c.reviewId)) {
            console.log(`ðŸ”„ Auto-syncing progress for gate: ${gate.name}`);
            syncGateProgressWithACCComprehensive(gate);
          }
        });
      } else {
        // No gates found in localStorage - start with empty array
        console.log('⚠️ No gates found in localStorage, starting with empty gates');
        setGates([]);
      }
    }
  };

  // Phase Management Functions
  const loadPhases = () => {
    if (selectedProject?.id) {
      const storedPhases = localStorage.getItem(`phases_${selectedProject.id}`);
      if (storedPhases) {
        setPhases(JSON.parse(storedPhases));
      } else {
        // No phases found in localStorage - start with empty array
        console.log('⚠️ No phases found in localStorage, starting with empty phases');
        setPhases([]);
      }
    }
  };

  const savePhases = (phasesToSave) => {
    if (selectedProject?.id) {
      localStorage.setItem(`phases_${selectedProject.id}`, JSON.stringify(phasesToSave));
    }
  };

  const handleAddPhase = () => {
    setPhaseFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      order: phases.length
    });
    setEditingPhase('new');
    setShowPhaseForm(true);
  };

  const handleEditPhase = (phase) => {
    setPhaseFormData({
      name: phase.name,
      description: phase.description,
      color: phase.color,
      order: phase.order
    });
    setEditingPhase(phase);
    setShowPhaseForm(true);
  };

  const handleSavePhase = () => {
    if (!phaseFormData.name.trim()) {
      alert('Please enter a phase name');
      return;
    }

    const phaseData = {
      ...phaseFormData,
      id: editingPhase === 'new' ? `phase-${Date.now()}` : editingPhase.id
    };

    let updatedPhases;
    if (editingPhase === 'new') {
      updatedPhases = [...phases, phaseData];
    } else {
      updatedPhases = phases.map(phase => 
        phase.id === editingPhase.id ? phaseData : phase
      );
    }

    setPhases(updatedPhases);
    savePhases(updatedPhases);
    setShowPhaseForm(false);
    setEditingPhase(null);
    setPhaseFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
  };

  const handleDeletePhase = (phaseId) => {
    if (window.confirm('Are you sure you want to delete this phase? Gates assigned to this phase will be unassigned.')) {
      const updatedPhases = phases.filter(phase => phase.id !== phaseId);
      setPhases(updatedPhases);
      savePhases(updatedPhases);
      
      // Remove phase assignment from gates
      const updatedGates = gates.map(gate => 
        gate.phaseId === phaseId ? { ...gate, phaseId: null } : gate
      );
      setGates(updatedGates);
      saveGates(updatedGates);
    }
  };

  const saveGates = (gatesToSave) => {
    if (selectedProject?.id) {
      localStorage.setItem(`gates_${selectedProject.id}`, JSON.stringify(gatesToSave));
    }
  };

  const handleAddGate = () => {
    // This function is now handled by ModernGateManager internally
    // No action needed here as ModernGateManager manages its own form state
  };

  const handleEditGate = (gate) => {
    // This function is now handled by ModernGateManager internally
    // No action needed here as ModernGateManager manages its own form state
  };


  const handleDeleteGate = (gateId) => {
    if (window.confirm('Are you sure you want to delete this gate?')) {
      const updatedGates = gates.filter(gate => gate.id !== gateId);
      setGates(updatedGates);
      saveGates(updatedGates);
    }
  };

  const toggleGateExpansion = (gateId) => {
    const newExpanded = new Set(expandedGates);
    if (newExpanded.has(gateId)) {
      newExpanded.delete(gateId);
    } else {
      newExpanded.add(gateId);
    }
    setExpandedGates(newExpanded);
  };

  const addCriteriaToGate = (gateId) => {
    const newCriteria = {
      id: `criteria-${Date.now()}`,
      name: '',
      description: '',
      selectedFile: null,
      selectedWorkflow: null,
      status: 'pending'
    };

    const updatedGates = gates.map(gate => 
      gate.id === gateId 
        ? { ...gate, criteria: [...(gate.criteria || []), newCriteria] }
        : gate
    );

    setGates(updatedGates);
    saveGates(updatedGates);
  };

  const updateCriteria = (gateId, criteriaId, field, value) => {
    const updatedGates = gates.map(gate => 
      gate.id === gateId 
        ? {
            ...gate,
            criteria: gate.criteria.map(criteria => 
              criteria.id === criteriaId 
                ? { ...criteria, [field]: value }
                : criteria
            )
          }
        : gate
    );

    setGates(updatedGates);
    saveGates(updatedGates);
  };

  const removeCriteria = (gateId, criteriaId) => {
    const updatedGates = gates.map(gate => 
      gate.id === gateId 
        ? {
            ...gate,
            criteria: gate.criteria.filter(criteria => criteria.id !== criteriaId)
          }
        : gate
    );

    setGates(updatedGates);
    saveGates(updatedGates);
  };

  const canSendGateForReview = (gate) => {
    console.log(`🚀🚀🚀 canSendGateForReview called for ${gate.name} (order: ${gate.order}) - PLC VERSION`);
    
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

  // NEW: Comprehensive Gate Status Checking using 3 ACC API endpoints
  const syncGateProgressWithACCComprehensive = async (gate) => {
    if (!gate.criteria || gate.criteria.length === 0) return gate;
    
    try {
      console.log(`🔄 Comprehensive sync for gate: ${gate.name}`);
      
      // Import AccService dynamically to avoid circular imports
      const AccServiceModule = await import('../services/AccService');
      const AccService = AccServiceModule.default;
      
      // Initialize AccService if needed
      if (!AccService.instance) {
        AccService.initialize();
      }
      
      // Use the new comprehensive gate status checking
      console.log(`🔍 Getting comprehensive gate status using 3 ACC endpoints...`);
      const comprehensiveStatus = await AccService.getComprehensiveGateStatus(selectedProject.id, gate);
      
      console.log(`📊 Comprehensive gate status:`, comprehensiveStatus);
      
      // Update criteria with detailed analysis
      const updatedCriteria = gate.criteria.map(criteria => {
        const criteriaAnalysis = comprehensiveStatus.criteriaStatus.find(cs => cs.criteriaId === criteria.id);
        
        if (criteriaAnalysis) {
          return {
            ...criteria,
            reviewStatus: criteriaAnalysis.status,
            progressPercentage: criteriaAnalysis.progressPercentage,
            summary: criteriaAnalysis.summary,
            fileAnalysis: criteriaAnalysis.fileAnalysis,
            workflowAnalysis: criteriaAnalysis.workflowAnalysis,
            lastSyncTime: criteriaAnalysis.lastChecked,
            needsResubmission: criteriaAnalysis.status === 'rejected',
            detailedStatus: criteriaAnalysis.summary
          };
        }
        
        return criteria;
      });

      // Update gate status based on comprehensive analysis
      const updatedGate = {
        ...gate,
        criteria: updatedCriteria,
        status: comprehensiveStatus.status,
        overallProgress: comprehensiveStatus.overallProgress,
        completedCriteria: comprehensiveStatus.completedCriteria,
        totalCriteria: comprehensiveStatus.totalCriteria,
        summary: comprehensiveStatus.summary,
        lastSyncTime: comprehensiveStatus.lastChecked,
        needsAttention: comprehensiveStatus.needsAttention
      };
      
      console.log(`✅ Updated gate ${gate.name}:`, {
        status: updatedGate.status,
        progress: updatedGate.overallProgress,
        completed: updatedGate.completedCriteria,
        total: updatedGate.totalCriteria,
        summary: updatedGate.summary
      });
      
      return updatedGate;
      
    } catch (error) {
      console.error(`❌ Error syncing gate ${gate.name}:`, error);
      return gate;
    }
  };

  // Sync gate progress with ACC review progress (UNUSED - using syncGateProgressWithACCComprehensive instead)
  /*
  const syncGateProgressWithACC = async (gate) => {
    if (!gate.criteria || gate.criteria.length === 0) return gate;

    try {
      console.log(`ðŸ”„ Syncing progress for gate: ${gate.name}`);
      
      // First, get all reviews for the project (same as Reminder tab)
      const allReviews = await AccService.getProjectReviews(selectedProject.id);
      console.log(`ðŸ“Š Found ${allReviews.length} reviews in project`);
      console.log(`ðŸ“Š Sample review data:`, allReviews.slice(0, 2));
      
      const progressPromises = gate.criteria
        .filter(criteria => criteria.reviewId)
        .map(async (criteria) => {
          try {
            // Find the review in the project reviews list
            const review = allReviews.find(r => r.id === criteria.reviewId);
            if (!review) {
              console.log(`âš ï¸ Review ${criteria.reviewId} not found in project reviews`);
              console.log(`ðŸ” Available review IDs:`, allReviews.map(r => r.id));
              return criteria;
            }
            
            console.log(`ðŸ“Š Found review ${criteria.reviewId}:`, review);
            console.log(`ðŸ“Š Review status: ${review.status}`);
            console.log(`ðŸ“Š Review name: ${review.name}`);
            console.log(`ðŸ“Š Review workflowId: ${review.workflowId}`);
            
            // Get comprehensive review status using multiple data sources
            let reviewStatus = 'submitted';
            let needsResubmission = false;
            let detailedStatus = null;
            
            try {
              // Get detailed review data for comprehensive analysis
              const workflowData = await AccService.getReviewWorkflow(selectedProject.id, criteria.reviewId);
              const progressData = await AccService.getReviewProgress(selectedProject.id, criteria.reviewId);
              const versionsData = await AccService.getReviewVersions(selectedProject.id, criteria.reviewId);
              
              // Analyze the comprehensive data
              detailedStatus = analyzeReviewStatus(review, workflowData, progressData, versionsData);
              reviewStatus = detailedStatus.status;
              needsResubmission = detailedStatus.needsResubmission;
              
              console.log(`ðŸ“Š Comprehensive analysis for review ${criteria.reviewId}:`, detailedStatus);
              
            } catch (detailError) {
              console.log(`âš ï¸ Could not get detailed review data for ${criteria.reviewId}:`, detailError.message);
              // Fallback to basic review status mapping
              reviewStatus = mapBasicReviewStatus(review.status);
              console.log(`ðŸ“Š Using basic status mapping: ${review.status} -> ${reviewStatus}`);
            }
            
            console.log(`ðŸ“Š Final status for review ${criteria.reviewId}: ${reviewStatus}`);
            console.log(`ðŸ“Š Criteria before update:`, {
              name: criteria.name,
              reviewId: criteria.reviewId,
              reviewStatus: criteria.reviewStatus,
              selectedFile: criteria.selectedFile?.name
            });
            
            const updatedCriteria = {
              ...criteria,
              reviewStatus,
              needsResubmission,
              detailedStatus,
              lastSyncTime: new Date().toISOString()
            };
            
            console.log(`ðŸ“Š Criteria after update:`, {
              name: updatedCriteria.name,
              reviewId: updatedCriteria.reviewId,
              reviewStatus: updatedCriteria.reviewStatus,
              selectedFile: updatedCriteria.selectedFile?.name
            });
            
            return updatedCriteria;
          } catch (error) {
            console.error(`âŒ Error syncing progress for review ${criteria.reviewId}:`, error);
            return criteria; // Return unchanged if sync fails
          }
        });

      const updatedCriteria = await Promise.all(progressPromises);
      
      // Update the gate with synced criteria
      let updatedGate = { ...gate, criteria: updatedCriteria };
      
      // Check if any criteria need resubmission
      const rejectedCriteria = updatedCriteria.filter(criteria => criteria.needsResubmission);
      if (rejectedCriteria.length > 0) {
        console.log(`âš ï¸ Found ${rejectedCriteria.length} rejected criteria in gate: ${gate.name}`);
        
        // Clear rejected files
        const clearedCriteria = updatedGate.criteria.map(criteria => {
          if (criteria.needsResubmission) {
            console.log(`ðŸ—‘ï¸ Clearing rejected file: ${criteria.selectedFile?.name}`);
            return {
              ...criteria,
              selectedFile: null,
              reviewId: null,
              reviewStatus: null,
              needsResubmission: false
            };
          }
          return criteria;
        });
        
        updatedGate = {
          ...updatedGate,
          criteria: clearedCriteria
        };
        
        // Show alert for rejected files
        alert(`âš ï¸ Some files in gate "${gate.name}" were rejected in ACC and have been cleared. Please select new files and resubmit.`);
      }
      
      console.log(`âœ… Synced progress for gate: ${gate.name}`);
      return updatedGate;
    } catch (error) {
      console.error(`âŒ Error syncing gate progress:`, error);
      return gate; // Return original gate if sync fails
    }
  };
  */

  // Enhanced review status analysis using two-step API approach
  const analyzeReviewStatus = (review, workflowData, progressData, versionsData) => {
    console.log(`ðŸ” Analyzing review status for: ${review.name}`);
    console.log(`ðŸ“Š Versions data:`, versionsData);
    console.log(`ðŸ“Š Progress data:`, progressData);
    
    // Step 1: Analyze file-level approval status from /versions API
    const fileVersions = versionsData?.results || [];
    const fileAnalysis = fileVersions.map(file => {
      const approveStatus = file.approveStatus;
      const statusValue = approveStatus?.value;
      const statusLabel = approveStatus?.label;
      
      console.log(`ðŸ“„ File: ${file.name || file.reviewContent?.name}`);
      console.log(`ðŸ“„ Status Value: ${statusValue}`);
      console.log(`ðŸ“„ Status Label: ${statusLabel}`);
      
      return {
        fileName: file.name || file.reviewContent?.name,
        statusValue,
        statusLabel,
        urn: file.urn,
        itemUrn: file.itemUrn,
        customAttributes: file.reviewContent?.customAttributes || [],
        copiedFileVersionUrn: file.copiedFileVersionUrn
      };
    });
    
    // Step 2: Analyze workflow progress from /progress API
    const progressSteps = progressData?.results || [];
    const progressAnalysis = progressSteps.map(step => {
      console.log(`ðŸ”„ Step: ${step.stepName}`);
      console.log(`ðŸ”„ Status: ${step.status}`);
      console.log(`ðŸ”„ Action By: ${step.actionBy?.name}`);
      console.log(`ðŸ”„ Notes: ${step.notes}`);
      
      return {
        stepId: step.stepId,
        stepName: step.stepName,
        status: step.status,
        claimedBy: step.claimedBy,
        actionBy: step.actionBy,
        candidates: step.candidates,
        endTime: step.endTime,
        notes: step.notes
      };
    });
    
    // Determine comprehensive status based on both APIs
    const approvedFiles = fileAnalysis.filter(file => 
      file.statusValue === 'APPROVED' || file.statusLabel?.toLowerCase().includes('approved')
    );
    const rejectedFiles = fileAnalysis.filter(file => 
      file.statusValue === 'REJECTED' || file.statusLabel?.toLowerCase().includes('rejected')
    );
    const pendingFiles = fileAnalysis.filter(file => 
      !file.statusValue || file.statusValue === 'PENDING' || file.statusValue === 'SUBMITTED'
    );
    const totalFiles = fileAnalysis.length;
    
    // Check if workflow is completed
    const workflowCompleted = progressSteps.some(step => 
      step.status === 'COMPLETED' || step.status === 'APPROVED'
    );
    
    // Check for comments/notes
    const hasComments = progressSteps.some(step => step.notes && step.notes.trim().length > 0);
    const allComments = progressSteps
      .filter(step => step.notes && step.notes.trim().length > 0)
      .map(step => ({
        stepName: step.stepName,
        actionBy: step.actionBy?.name,
        notes: step.notes,
        endTime: step.endTime
      }));
    
    console.log(`ðŸ“Š File Analysis: ${approvedFiles.length} approved, ${rejectedFiles.length} rejected, ${pendingFiles.length} pending`);
    console.log(`ðŸ“Š Workflow completed: ${workflowCompleted}`);
    console.log(`ðŸ“Š Has comments: ${hasComments}`);
    
    // Determine overall status with enhanced logic
    let status = 'submitted';
    let needsResubmission = false;
    let statusReason = '';
    
    if (rejectedFiles.length > 0) {
      status = 'rejected';
      needsResubmission = true;
      statusReason = `${rejectedFiles.length} file(s) rejected`;
      console.log(`âŒ Review rejected: ${statusReason}`);
    } else if (approvedFiles.length === totalFiles && totalFiles > 0) {
      if (workflowCompleted) {
        status = 'approved';
        statusReason = 'All files approved and workflow completed';
        console.log(`âœ… Review fully approved: ${statusReason}`);
      } else {
        status = 'approved-pending-workflow';
        statusReason = 'All files approved, waiting for workflow completion';
        console.log(`â³ Review approved but workflow pending: ${statusReason}`);
      }
    } else if (approvedFiles.length > 0) {
      status = 'partially-approved';
      statusReason = `${approvedFiles.length}/${totalFiles} files approved`;
      console.log(`ðŸ”„ Review partially approved: ${statusReason}`);
    } else if (pendingFiles.length > 0) {
      status = 'in-progress';
      statusReason = `${pendingFiles.length} file(s) pending review`;
      console.log(`ðŸ”„ Review in progress: ${statusReason}`);
    } else {
      status = mapBasicReviewStatus(review.status);
      statusReason = `Basic status mapping: ${review.status}`;
      console.log(`ðŸ“Š Using basic status: ${statusReason}`);
    }
    
    return {
      status,
      needsResubmission,
      statusReason,
      workflowCompleted,
      hasComments,
      comments: allComments,
      fileAnalysis: {
        total: totalFiles,
        approved: approvedFiles.length,
        rejected: rejectedFiles.length,
        pending: pendingFiles.length,
        files: fileAnalysis
      },
      progressAnalysis: {
        totalSteps: progressSteps.length,
        completedSteps: progressSteps.filter(s => s.status === 'COMPLETED' || s.status === 'APPROVED').length,
        steps: progressAnalysis
      },
      analysis: {
        reviewStatus: review.status,
        workflowData: !!workflowData,
        progressData: !!progressData,
        versionsData: !!versionsData,
        timestamp: new Date().toISOString()
      }
    };
  };

  // Helper function to map basic review status
  const mapBasicReviewStatus = (reviewStatus) => {
    const statusMap = {
      'COMPLETED': 'approved',
      'APPROVED': 'approved',
      'REJECTED': 'rejected',
      'IN_PROGRESS': 'in-progress',
      'CLAIMED': 'in-progress',
      'OPEN': 'in-progress',
      'SUBMITTED': 'in-progress', // Treat submitted as in-progress for consistency
      'PENDING': 'pending'
    };
    
    return statusMap[reviewStatus] || 'pending';
  };


  const sendGateForReview = async (gate) => {
    if (!gate.criteria || gate.criteria.length === 0) {
      alert('Please add at least one criteria to this gate');
      return;
    }

    const incompleteCriteria = gate.criteria.filter(criteria => 
      !criteria.selectedFile || !criteria.selectedWorkflow
    );

    if (incompleteCriteria.length === gate.criteria.length) {
      alert('Please add at least one file and workflow to your criteria before sending for review');
      return;
    }

    try {
      setLoading(true);
      
      // Create reviews for criteria that have both file and workflow
      const validCriteria = gate.criteria.filter(criteria => 
        criteria.selectedFile && criteria.selectedWorkflow
      );
      
      const reviewPromises = validCriteria.map(async (criteria) => {
        const reviewName = `${gate.name} - ${criteria.name}`;
        
        // Check if review already exists with this name
        try {
          console.log(`🔍 Checking for existing review: ${reviewName}`);
          const existingReviews = await AccService.getProjectReviews(selectedProject.id);
          const existingReview = existingReviews.find(r => r.name === reviewName);
          
          if (existingReview) {
            console.log(`🔗 Found existing review: ${reviewName} (ID: ${existingReview.id})`);
            return {
              id: existingReview.id,
              name: existingReview.name,
              existing: true
            };
          }
        } catch (error) {
          console.log(`⚠️ Could not check for existing reviews: ${error.message}`);
        }
        
        // Create new review with proper naming
        console.log(`🆕 Creating new review: ${reviewName}`);
        console.log(`🔍 Criteria debug:`, {
          criteriaName: criteria.name,
          selectedFile: criteria.selectedFile,
          selectedWorkflow: criteria.selectedWorkflow,
          projectId: selectedProject.id
        });
        
        if (!criteria.selectedFile?.id) {
          throw new Error(`No file selected for criteria: ${criteria.name}`);
        }
        
        if (!criteria.selectedWorkflow?.id) {
          throw new Error(`No workflow selected for criteria: ${criteria.name}`);
        }
        
        // Use version URN from file picker if available, otherwise get it from API
        let versionUrn = criteria.selectedFile.versionUrn;
        
        if (!versionUrn) {
          console.log(`🔍 No version URN from file picker, getting from API...`);
          versionUrn = await getVersionUrn(selectedProject.id, criteria.selectedFile.id);
          console.log(`🔍 Version URN result from API:`, versionUrn);
        } else {
          console.log(`🔍 Using version URN from file picker:`, versionUrn);
        }
        
        if (!versionUrn) {
          throw new Error(`Failed to get version URN for file: ${criteria.selectedFile.name || criteria.selectedFile.id}. This is likely due to ACC API changes - version selection is no longer available in the file picker.`);
        }
        
        const payload = {
          name: reviewName,
          fileVersions: [{ urn: versionUrn }],
          workflowId: criteria.selectedWorkflow.id
        };
        
        console.log(`🔍 Final payload:`, payload);

        const cleanProjectId = selectedProject.id.startsWith('b.') ? selectedProject.id.substring(2) : selectedProject.id;
        const credentials = JSON.parse(localStorage.getItem("zoyantra_credentials") || '{}');
        const token = credentials.threeLegToken;

        const res = await fetch(`/api/acc/reviews/${cleanProjectId}?projectId=${cleanProjectId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let backendError = '';
          try {
            const errorPayload = await res.json();
            backendError = errorPayload?.message || errorPayload?.error || errorPayload?.details || '';
            if (!backendError && typeof errorPayload === 'object') {
              backendError = JSON.stringify(errorPayload);
            }
          } catch (parseError) {
            backendError = await res.text();
          }
          throw new Error(`Failed to create review for criteria "${criteria.name}". ${backendError}`.trim());
        }

        const result = await res.json();
        return {
          ...result,
          existing: false
        };
      });

      const reviewResults = await Promise.all(reviewPromises);
      
      console.log('📊 Review creation results:', reviewResults);
      console.log('📊 Review results structure:', reviewResults.map(r => ({
        id: r.id,
        name: r.name,
        existing: r.existing,
        keys: Object.keys(r)
      })));
      
      // Count created vs linked reviews
      const createdReviews = reviewResults.filter(r => !r.existing).length;
      const linkedReviews = reviewResults.filter(r => r.existing).length;
      console.log(`✅ Review processing complete: ${createdReviews} created, ${linkedReviews} linked to existing`);
      
      // Store review IDs in criteria for progress tracking
      const updatedGates = gates.map(g => {
        if (g.id === gate.id) {
          const updatedCriteria = g.criteria.map((criteria, index) => {
            if (criteria.selectedFile && criteria.selectedWorkflow && reviewResults[index]) {
              const reviewId = reviewResults[index].id || reviewResults[index].data?.id;
              console.log(`ðŸ“Š Storing reviewId ${reviewId} for criteria: ${criteria.name}`);
              return {
                ...criteria,
                reviewId: reviewId,
                reviewStatus: 'submitted'
              };
            }
            return criteria;
          });
          
          console.log(`ðŸ“Š Updated criteria for gate ${gate.name}:`, updatedCriteria.map(c => ({
            name: c.name,
            reviewId: c.reviewId,
            reviewStatus: c.reviewStatus
          })));
          
          return {
            ...g,
            status: 'submitted',
            criteria: updatedCriteria
          };
        }
        return g;
      });
      
      setGates(updatedGates);
      saveGates(updatedGates);

      console.log('âœ… Gate sent for review successfully');
      alert(`Gate "${gate.name}" submitted for review successfully!`);
      
      } catch (error) {
        console.error('Error sending gate for review:', error);
        
        // Check if it's a version URN issue
        if (error.message.includes('version URN') || error.message.includes('ACC API changes')) {
          alert(`❌ Cannot create review: ${error.message}\n\nThis is a known issue with ACC API changes. The file picker no longer supports version selection. Please try selecting a different file or contact support.`);
        } else {
          alert(`Error sending gate for review: ${error.message}`);
        }
      } finally {
      setLoading(false);
    }
  };

  // Load gates when component mounts
  useEffect(() => {
    loadGates();
    loadPhases();
  }, [selectedProject?.id]);

  // Auto-sync progress with ACC every 60 seconds
  useEffect(() => {
    if (!selectedProject?.id || gates.length === 0) return;

    const syncInterval = setInterval(async () => {
      console.log('ðŸ”„ Auto-syncing all gates with ACC every 60 seconds...');
      const updatedGates = [];
      let hasUpdates = false;
      
      for (const gate of gates) {
        if (gate.criteria?.some(c => c.reviewId)) {
          console.log(`ðŸ”„ Auto-syncing gate: ${gate.name} with ACC...`);
          const updatedGate = await syncGateProgressWithACCComprehensive(gate);
          updatedGates.push(updatedGate || gate);
          if (updatedGate && updatedGate !== gate) {
            hasUpdates = true;
          }
        } else {
          updatedGates.push(gate);
        }
      }
      
      if (hasUpdates) {
        setGates(updatedGates);
        saveGates(updatedGates);
        console.log('âœ… Auto-sync completed with updates');
      }
    }, 60000); // Sync every 60 seconds

    return () => clearInterval(syncInterval);
  }, [selectedProject?.id, gates]);

  const formatDate = (value) => {
    if (!value) return 'Not set';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Not set';
    return parsed.toLocaleDateString();
  };

  const getGateStatusText = (gate) => {
    const status = (gate?.realStatus || gate?.status || 'pending').toString().toLowerCase();
    if (status === 'completed') return 'Completed';
    if (status === 'in-progress' || status === 'submitted') return 'In Progress';
    if (status === 'locked') return 'Locked';
    return 'Pending';
  };

  const getPhaseStatusText = (phaseGates) => {
    if (!phaseGates || phaseGates.length === 0) return 'No Gates';
    const completedCount = phaseGates.filter((gate) => getGateStatusText(gate) === 'Completed').length;
    const inProgressCount = phaseGates.filter((gate) => getGateStatusText(gate) === 'In Progress').length;
    const lockedCount = phaseGates.filter((gate) => getGateStatusText(gate) === 'Locked').length;

    if (completedCount === phaseGates.length) return 'Completed';
    if (inProgressCount > 0 || completedCount > 0) return 'In Progress';
    if (lockedCount === phaseGates.length) return 'Locked';
    return 'Pending';
  };

  const getPhaseDateRange = (phaseGates) => {
    const allDates = phaseGates
      .flatMap((gate) => [gate.startDate, gate.endDate])
      .filter(Boolean)
      .map((dateValue) => new Date(dateValue))
      .filter((dateValue) => !Number.isNaN(dateValue.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (allDates.length === 0) {
      return { start: 'Not set', end: 'Not set' };
    }

    return {
      start: allDates[0].toLocaleDateString(),
      end: allDates[allDates.length - 1].toLocaleDateString()
    };
  };

  const orderedPhases = [...phases].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const phaseTableData = orderedPhases.map((phase) => {
    const phaseGates = gates
      .filter((gate) => gate.phaseId === phase.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const phaseRange = getPhaseDateRange(phaseGates);
    return {
      phase,
      phaseGates,
      phaseStatus: getPhaseStatusText(phaseGates),
      phaseStartDate: phaseRange.start,
      phaseEndDate: phaseRange.end
    };
  });

  const unassignedGates = gates
    .filter((gate) => !gate.phaseId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {console.log('ðŸ” Current viewMode:', viewMode)}
      <div className="flex items-center justify-between mb-6">
        
        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          {[
            { key: 'phases', label: 'Phases', icon: Target },
            { key: 'gates', label: 'Gates', icon: CheckCircle },
            { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { key: 'table', label: 'Table', icon: Clock }
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === mode.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <mode.icon className="w-4 h-4 mr-2" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Simple Review Creation Form - HIDDEN */}
      {false && (
        <>
          {/* Project Status */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Project: {selectedProject?.name || 'Not selected'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Hub: {selectedHub?.name || 'Not selected'}</span>
          </div>
        </div>
      </div>

      {/* Authentication Status */}
      <div className="mb-6 p-4 rounded-lg border">
        {authStatus === "checking" && (
          <div className="bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-blue-800">{authMessage}</span>
            </div>
          </div>
        )}
        
        {authStatus === "authenticated" && (
          <div className="bg-green-50 border-green-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">{authMessage}</span>
            </div>
          </div>
        )}
        
        {authStatus === "expired" && (
          <div className="bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-800">{authMessage}</span>
              </div>
              <button
                onClick={checkAuthenticationStatus}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {authStatus === "missing" && (
          <div className="bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-red-800">{authMessage}</span>
              </div>
              <button
                onClick={startOAuthFlow}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Name Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Review Name</label>
        <input
          type="text"
          placeholder="Enter review name"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={reviewName}
          onChange={(e) => setReviewName(e.target.value)}
        />
      </div>

      {/* Workflow Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Workflow *
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadWorkflows}
              className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 hover:text-blue-800"
              title="Refresh workflows"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </button>
            <button
              onClick={() => {
                console.log('ðŸ” Current workflows:', workflows);
                console.log('ðŸ” Selected workflow ID:', selectedWorkflow?.id);
                console.log('ðŸ” Project ID:', selectedProject?.id);
                const cleanProjectId = selectedProject?.id?.startsWith("b.") 
                  ? selectedProject.id.substring(2) 
                  : selectedProject?.id;
                alert(`Workflows loaded: ${workflows.length}\nSelected: ${selectedWorkflow?.id || 'None'}\nProject (original): ${selectedProject?.id || 'None'}\nProject (for review): ${cleanProjectId || 'None'}`);
              }}
              className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 hover:text-green-800"
              title="Debug workflow state"
            >
              Debug
            </button>
          </div>
        </div>
        <select
          value={selectedWorkflow?.id || ''}
          onChange={(e) => {
            const workflow = workflows.find(w => w.id === e.target.value);
            setSelectedWorkflow(workflow);
            if (workflow) {
              loadWorkflowDetails(workflow.id);
            } else {
              setWorkflowDetails(null);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a workflow</option>
          {(workflows || []).map(workflow => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.name} ({workflow.id})
            </option>
          ))}
        </select>
        {workflows.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            No workflows found. Click "Refresh" to reload or check if workflows exist in this project.
          </p>
        )}
        {workflows.length > 0 && (
          <p className="mt-1 text-xs text-green-600">
            {workflows.length} workflow(s) loaded successfully
          </p>
        )}
      </div>

      {/* Workflow Details */}
      {selectedWorkflow && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-lg font-medium text-blue-900 mb-3">Selected Workflow Details</h4>
          {loadingWorkflowDetails ? (
            <div className="flex items-center text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Loading workflow details...
            </div>
          ) : workflowDetails ? (
            <div className="space-y-3">
              <div>
                <span className="font-medium text-blue-800">Name:</span>
                <span className="ml-2 text-blue-700">{workflowDetails.name}</span>
              </div>
              {workflowDetails.description && (
                <div>
                  <span className="font-medium text-blue-800">Description:</span>
                  <p className="ml-2 text-blue-700 text-sm">{workflowDetails.description}</p>
                </div>
              )}
              {workflowDetails.notes && (
                <div>
                  <span className="font-medium text-blue-800">Notes:</span>
                  <p className="ml-2 text-blue-700 text-sm">{workflowDetails.notes}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-blue-800">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  workflowDetails.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {workflowDetails.status}
                </span>
              </div>
              {workflowDetails.steps && workflowDetails.steps.length > 0 && (
                <div>
                  <span className="font-medium text-blue-800">Steps:</span>
                  <div className="ml-2 space-y-1">
                    {workflowDetails.steps.map((step, index) => (
                      <div key={index} className="text-sm text-blue-700">
                        {index + 1}. {step.name} ({step.type}) - {step.duration} {step.dueDateType}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-blue-700 text-sm">
              Click on a workflow to load its details
            </div>
          )}
        </div>
      )}

      {/* File Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
        {selectedFile ? (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
              <span className="text-xs text-blue-600">âœ“</span>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-blue-600">
                <span className="font-medium">Lineage URN:</span> {selectedFile.id}
              </p>
              {selectedFile.versionUrn ? (
                <p className="text-xs text-green-600">
                  <span className="font-medium">Version URN:</span> {selectedFile.versionUrn}
                </p>
              ) : (
                <p className="text-xs text-yellow-600">
                  <span className="font-medium">âš ï¸ No version URN - will convert automatically</span>
                </p>
              )}
              {selectedFile.versionNumber && (
                <p className="text-xs text-purple-600">
                  <span className="font-medium">Version:</span> {selectedFile.versionNumber}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium">Note:</span> Version URN is required for review creation
              </p>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="mt-2 text-xs text-red-600 hover:text-red-800"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">No file selected</p>
            <button
              onClick={() => {
                console.log('ðŸ” Browse to ACC button clicked');
                console.log('ðŸ” showFileBrowser before:', showFileBrowser);
                setShowFileBrowser(true);
                console.log('ðŸ” showFileBrowser after:', true);
              }}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Browse to ACC
            </button>
          </div>
        )}
      </div>


      {/* Create Review Button */}
      <button
        onClick={createReview}
        disabled={loading || !selectedWorkflow || !selectedFile || authStatus !== "authenticated"}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        {loading ? "Creating Review..." : (
          <>
            Create Review
            {authStatus === "authenticated" && (
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                ðŸ”‘ Authenticated
              </span>
            )}
            {authStatus !== "authenticated" && (
              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded">
                ðŸ”‘ Not Authenticated
              </span>
            )}
          </>
        )}
      </button>

      {/* ACC File Browser Modal */}
      {console.log('ðŸ” Rendering AccFolderBrowser with showFileBrowser:', showFileBrowser)}
      {showFileBrowser && console.log('ðŸ” Modal should be visible now!')}
      <AccFolderBrowser
        isOpen={showFileBrowser}
        projectId={selectedProject?.id}
        onClose={() => {
          console.log('ðŸ” Closing file browser');
          setShowFileBrowser(false);
        }}
        onFileSelect={(selectedFiles) => {
          console.log('ðŸ” AccFolderBrowser onFileSelect called with:', selectedFiles);
          console.log('ðŸ” AccFolderBrowser onFileSelect type:', typeof selectedFiles);
          console.log('ðŸ” AccFolderBrowser onFileSelect isArray:', Array.isArray(selectedFiles));
          
          // Handle both single file and array of files
          let filesToProcess = [];
          if (Array.isArray(selectedFiles)) {
            filesToProcess = selectedFiles;
          } else if (selectedFiles && typeof selectedFiles === 'object') {
            filesToProcess = [selectedFiles];
          }
          
          console.log('ðŸ“ Files to process:', filesToProcess);
          
          // Add selected files to the main file selection (only files, not folders)
          const validFiles = filesToProcess.filter(file => file.type === 'file');
          
          console.log('ðŸ“ Adding files to selection:', validFiles);
          
          if (validFiles.length > 0) {
            if (currentCriteriaForFileSelection) {
              // Update criteria with selected file
              updateCriteria(
                currentCriteriaForFileSelection.gateId, 
                currentCriteriaForFileSelection.criteriaId, 
                'selectedFile', 
                validFiles[0]
              );
              setCurrentCriteriaForFileSelection(null);
            } else {
              // For simple review, just take the first file
              const firstFile = validFiles[0];
              console.log('ðŸ“ Setting selected file:', firstFile);
              console.log('ðŸ“ File version URN:', firstFile.versionUrn);
              console.log('ðŸ“ File version number:', firstFile.versionNumber);
              console.log('ðŸ“ File selected version:', firstFile.selectedVersion);
              console.log('ðŸ“ File keys:', Object.keys(firstFile));
              setSelectedFile(firstFile);
            }
          }
          
          setShowFileBrowser(false);
        }}
        hubId={selectedHub?.id}
        multiSelect={false}
      />
        </>
      )}

      {/* Phases View */}
      {viewMode === 'phases' && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Phase Management</h3>
            <button
              onClick={handleAddPhase}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phase
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phases.map((phase, index) => (
              <div key={phase.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: phase.color }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{phase.name}</h4>
                      <p className="text-sm text-gray-600">{phase.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditPhase(phase)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                      title="Edit Phase"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePhase(phase.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                      title="Delete Phase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  Gates assigned: {gates.filter(gate => gate.phaseId === phase.id).length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gates View */}
      {viewMode === 'gates' && (
        <ModernGateManager
          gates={gates}
          setGates={setGates}
          onDeleteGate={handleDeleteGate}
          onToggleExpansion={toggleGateExpansion}
          onAddCriteria={addCriteriaToGate}
          onUpdateCriteria={updateCriteria}
          onRemoveCriteria={removeCriteria}
          onSendForReview={sendGateForReview}
          onSyncProgress={syncGateProgressWithACCComprehensive}
          expandedGates={expandedGates}
          selectedProject={selectedProject}
          selectedHub={selectedHub}
          workflows={workflows}
          showFileBrowser={showFileBrowser}
          setShowFileBrowser={setShowFileBrowser}
          currentCriteriaForFileSelection={currentCriteriaForFileSelection}
          setCurrentCriteriaForFileSelection={setCurrentCriteriaForFileSelection}
          phases={phases}
        />
      )}

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <Dashboard 
          gates={gates} 
          selectedProject={selectedProject}
        />
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Phase Summary Table</h3>
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Phase</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Total Gates</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Phase Start</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Phase End</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Total Status</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseTableData.map(({ phase, phaseGates, phaseStatus, phaseStartDate, phaseEndDate }) => (
                    <tr key={phase.id} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                          <span className="font-medium text-gray-900">{phase.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{phaseGates.length}</td>
                      <td className="px-4 py-3 text-gray-700">{phaseStartDate}</td>
                      <td className="px-4 py-3 text-gray-700">{phaseEndDate}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{phaseStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Gate Details by Phase</h3>
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Phase</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Gate</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Gate Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Start Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">End Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Phase Total Status</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseTableData.flatMap(({ phase, phaseGates, phaseStatus }) =>
                    (phaseGates.length > 0 ? phaseGates : [{ id: `${phase.id}-no-gates`, name: 'No gates assigned' }]).map((gate, index) => (
                      <tr key={`${phase.id}-${gate.id}`} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-900">{phase.name}</td>
                        <td className="px-4 py-3 text-gray-800">{gate.name}</td>
                        <td className="px-4 py-3 text-gray-800">{gate.phaseId ? getGateStatusText(gate) : 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-700">{gate.phaseId ? formatDate(gate.startDate) : 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-700">{gate.phaseId ? formatDate(gate.endDate) : 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{index === 0 ? phaseStatus : ''}</td>
                      </tr>
                    ))
                  )}
                  {unassignedGates.map((gate) => (
                    <tr key={`unassigned-${gate.id}`} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-900">Unassigned</td>
                      <td className="px-4 py-3 text-gray-800">{gate.name}</td>
                      <td className="px-4 py-3 text-gray-800">{getGateStatusText(gate)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(gate.startDate)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(gate.endDate)}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">Unassigned</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Gates View - Hidden */}
      {false && viewMode === 'gates' && (
        <div className="mt-12 border-t pt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Gate Management System</h3>
          <button
            onClick={handleAddGate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Gate
          </button>
        </div>

        {/* Gates List */}
        <div className="space-y-4">
          {gates.map((gate, index) => {
            const isExpanded = expandedGates.has(gate.id);
            const canSend = canSendGateForReview(gate);
            // NO MORE LEGACY LOCKING LOGIC - Only ACC data determines status
            
            // Calculate gate progress
            const totalCriteria = gate.criteria?.length || 0;
            const criteriaWithFiles = gate.criteria?.filter(criteria => 
              criteria.selectedFile && criteria.selectedWorkflow
            ).length || 0;
            const criteriaSubmitted = gate.criteria?.filter(criteria => 
              criteria.reviewStatus === 'submitted'
            ).length || 0;
            const criteriaApproved = gate.criteria?.filter(criteria => 
              criteria.reviewStatus === 'approved'
            ).length || 0;
            const criteriaRejected = gate.criteria?.filter(criteria => 
              criteria.reviewStatus === 'rejected'
            ).length || 0;
            
            // Calculate progress percentage
            let progressPercentage = 0;
            if (totalCriteria > 0) {
              // If any criteria is approved, show 20% progress
              if (criteriaApproved > 0) {
                progressPercentage = 20;
              }
              // Otherwise, 0% progress
            }
            
            // Determine gate status
            let gateStatus = 'pending';
            if (criteriaApproved === totalCriteria && totalCriteria > 0) {
              gateStatus = 'completed';
            } else if (criteriaSubmitted > 0 || criteriaApproved > 0) {
              gateStatus = 'in-progress';
            } else if (criteriaWithFiles > 0) {
              gateStatus = 'in-progress'; // Changed from 'preparing' to 'in-progress' for consistency
            }
            
            // Color coding
            const statusColor = gateStatus === 'completed' ? 'green' : 
                               gateStatus === 'in-progress' ? 'blue' : 'gray';

            return (
              <div key={gate.id} className={`border-2 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl border-${statusColor}-300 bg-gradient-to-br from-${statusColor}-50 to-${statusColor}-100`}>
                {/* Enhanced Gate Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleGateExpansion(gate.id)}
                      className={`p-2 rounded-full transition-colors duration-200 ${
                        isExpanded ? `bg-${statusColor}-200 text-${statusColor}-700` : `bg-gray-100 text-gray-500 hover:bg-${statusColor}-100`
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          statusColor === 'green' ? 'bg-green-500' :
                          statusColor === 'blue' ? 'bg-blue-500' :
                          statusColor === 'yellow' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900">
                            {gate.name}
                          </h4>
                          {gate.phaseId && (
                            <div className="flex items-center space-x-2 mt-1">
                              {(() => {
                                const phase = phases.find(p => p.id === gate.phaseId);
                                return phase ? (
                                  <>
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: phase.color }}
                                    ></div>
                                    <span className="text-sm text-gray-600">{phase.name}</span>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {gate.description || 'No description provided'}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm font-bold text-gray-900">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                          <div 
                            className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                              statusColor === 'green' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                              statusColor === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                              statusColor === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Status Indicators */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">Files: {criteriaWithFiles}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-gray-600">Submitted: {criteriaSubmitted}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600">Approved: {criteriaApproved}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-600">Rejected: {criteriaRejected}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-3">
                        <span>ðŸ“… Start: {gate.startDate || 'Not set'}</span>
                        <span>ðŸ“… End: {gate.endDate || 'Not set'}</span>
                        <span>ðŸ“‹ Total Criteria: {totalCriteria}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        gateStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        gateStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        gateStatus === 'preparing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {gateStatus === 'completed' ? 'âœ… Completed' :
                         gateStatus === 'in-progress' ? 'ðŸ”„ In Progress' :
                         gateStatus === 'preparing' ? 'âš™ï¸ Preparing' : 'â³ Pending'}
                      </div>
                      
                      <button
                        onClick={() => handleEditGate(gate)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors duration-200"
                        title="Edit Gate"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteGate(gate.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200"
                        title="Delete Gate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    {/* Criteria List */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-700">Criteria</h5>
                        <button
                          onClick={() => addCriteriaToGate(gate.id)}
                          className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Criteria
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {gate.criteria?.map((criteria, criteriaIndex) => (
                          <div key={criteria.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">
                                  {criteriaIndex + 1}.
                                </span>
                                <input
                                  type="text"
                                  placeholder="Criteria name"
                                  value={criteria.name}
                                  onChange={(e) => updateCriteria(gate.id, criteria.id, 'name', e.target.value)}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                                />
                              </div>
                              <button
                                onClick={() => removeCriteria(gate.id, criteria.id)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Remove Criteria"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <textarea
                              placeholder="Criteria description"
                              value={criteria.description}
                              onChange={(e) => updateCriteria(gate.id, criteria.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-gray-900 placeholder-gray-500"
                              rows="2"
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* File Selection */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">File</label>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('ðŸ” File selection clicked for gate:', gate.id, 'criteria:', criteria.id);
                                      console.log('ðŸ” showFileBrowser before:', showFileBrowser);
                                      console.log('ðŸ” selectedProject:', selectedProject);
                                      console.log('ðŸ” selectedHub:', selectedHub);
                                      setCurrentCriteriaForFileSelection({ gateId: gate.id, criteriaId: criteria.id });
                                      setShowFileBrowser(true);
                                      console.log('ðŸ” showFileBrowser after:', true);
                                    }}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-left transition-colors cursor-pointer text-gray-900"
                                  >
                                    {criteria.selectedFile ? criteria.selectedFile.name : 'Select File'}
                                  </button>
                                  {criteria.selectedFile && (
                                    <button
                                      onClick={() => updateCriteria(gate.id, criteria.id, 'selectedFile', null)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                      title="Clear File"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Workflow Selection */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Workflow</label>
                                <select
                                  value={criteria.selectedWorkflow || ''}
                                  onChange={(e) => updateCriteria(gate.id, criteria.id, 'selectedWorkflow', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Workflow</option>
                                  {workflows.map(workflow => (
                                    <option key={workflow.id} value={workflow.id}>
                                      {workflow.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {(!gate.criteria || gate.criteria.length === 0) && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No criteria added yet. Click "Add Criteria" to get started.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Send for Review Button */}
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => sendGateForReview(gate)}
                        disabled={!canSend || loading}
                        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                          canSend && !loading
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {loading ? (
                          'Sending for Review...'
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                            Send Gate for Review
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {gates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No gates created yet. Click "Add Gate" to create your first gate.</p>
            </div>
          )}
        </div>
      </div>
      )}



      {/* Phase Form Modal */}
      {showPhaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPhase === 'new' ? 'Add New Phase' : 'Edit Phase'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={phaseFormData.name}
                  onChange={(e) => setPhaseFormData({...phaseFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phase name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={phaseFormData.description}
                  onChange={(e) => setPhaseFormData({...phaseFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter phase description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex space-x-2">
                  {[
                    { name: 'Blue', value: '#3B82F6' },
                    { name: 'Purple', value: '#8B5CF6' },
                    { name: 'Green', value: '#10B981' },
                    { name: 'Yellow', value: '#F59E0B' },
                    { name: 'Red', value: '#EF4444' },
                    { name: 'Gray', value: '#6B7280' }
                  ].map(color => (
                    <button
                      key={color.value}
                      onClick={() => setPhaseFormData({...phaseFormData, color: color.value})}
                      className={`w-8 h-8 rounded-full border-2 ${
                        phaseFormData.color === color.value ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPhaseForm(false);
                  setEditingPhase(null);
                  setPhaseFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhase}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingPhase === 'new' ? 'Create' : 'Update'} Phase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PLC;

