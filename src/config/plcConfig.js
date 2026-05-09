// PLC (Project Life Cycle) Configuration
// This file manages gate configurations and status for project life cycle management

// Gate status constants
export const GATE_STATUS = {
  LOCKED: 'locked',
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed'
};

// Gate status colors for UI
export const GATE_COLORS = {
  [GATE_STATUS.LOCKED]: 'border-gray-400',
  [GATE_STATUS.OPEN]: 'border-blue-400',
  [GATE_STATUS.IN_PROGRESS]: 'border-yellow-400',
  [GATE_STATUS.COMPLETED]: 'border-green-400'
};

// Gate status icons
export const GATE_ICONS = {
  [GATE_STATUS.LOCKED]: '🔒',
  [GATE_STATUS.OPEN]: '🔓',
  [GATE_STATUS.IN_PROGRESS]: '⏳',
  [GATE_STATUS.COMPLETED]: '✅'
};

// Default gate configuration for a project
const getDefaultConfig = () => ({
  gates: [],
  phases: [
    { id: 1, name: 'Initiation', description: 'Project initiation and planning', order: 1 },
    { id: 2, name: 'Planning', description: 'Detailed planning and design', order: 2 },
    { id: 3, name: 'Execution', description: 'Project execution and monitoring', order: 3 },
    { id: 4, name: 'Monitoring', description: 'Progress monitoring and control', order: 4 },
    { id: 5, name: 'Closure', description: 'Project closure and handover', order: 5 }
  ],
  gateOrder: [], // Array of gate IDs in order
  currentPhase: 1, // Current unlocked phase
  reviewWorkflows: [
    { id: 'standard-review', name: 'Standard Review', description: 'Standard review process', duration: 5 },
    { id: 'expedited-review', name: 'Expedited Review', description: 'Fast-track review process', duration: 2 },
    { id: 'technical-review', name: 'Technical Review', description: 'Technical expert review', duration: 7 },
    { id: 'custom-review', name: 'Custom Review', description: 'Custom review process', duration: 3 }
  ],
  notificationSettings: {
    enabled: true,
    reminderDays: [7, 3, 1], // Days before deadline to send reminders
    escalationDays: 1 // Days after deadline to escalate
  }
});

// Get gate configuration for a project
export const getGateConfig = (projectId) => {
  if (!projectId) return getDefaultConfig();
  
  const key = `plc_config_${projectId}`;
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing stored PLC config:', error);
    }
  }
  
  // Return default config if no stored config exists
  return getDefaultConfig();
};

// Save gate configuration for a project
export const saveGateConfig = (projectId, config) => {
  if (!projectId) return;
  
  const key = `plc_config_${projectId}`;
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving PLC config:', error);
  }
};

// Update gate status
export const updateGateStatus = (projectId, gateId, status, completedAt = null) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (gate) {
    gate.status = status;
    if (completedAt) {
      gate.completedAt = completedAt;
    }
    saveGateConfig(projectId, config);
  }
};

// Add file to gate
export const addFileToGate = (projectId, gateId, file) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (gate) {
    if (!gate.files) {
      gate.files = [];
    }
    gate.files.push({
      ...file,
      uploadedAt: new Date().toISOString(),
      reviewStatus: 'pending'
    });
    saveGateConfig(projectId, config);
  }
};

// Remove file from gate
export const removeFileFromGate = (projectId, gateId, fileId) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (gate && gate.files) {
    gate.files = gate.files.filter(f => f.id !== fileId);
    saveGateConfig(projectId, config);
  }
};

// Check if gate can be completed
export const canCompleteGate = (projectId, gateId) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (!gate) return false;
  
  // Check if all required files are uploaded
  const requiredFiles = gate.requiredFiles || [];
  const uploadedFiles = gate.files || [];
  
  for (const requiredFile of requiredFiles) {
    if (requiredFile.required) {
      const hasFile = uploadedFiles.some(file => 
        file.name.toLowerCase().includes(requiredFile.name.toLowerCase()) &&
        file.type.includes(requiredFile.type)
      );
      if (!hasFile) return false;
    }
  }
  
  return true;
};

// Calculate gate progress percentage
export const getGateProgress = (projectId, gateId) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (!gate) return 0;
  
  const requiredFiles = gate.requiredFiles || [];
  const uploadedFiles = gate.files || [];
  
  if (requiredFiles.length === 0) {
    return gate.status === GATE_STATUS.COMPLETED ? 100 : 0;
  }
  
  let completedRequirements = 0;
  
  for (const requiredFile of requiredFiles) {
    if (requiredFile.required) {
      const hasFile = uploadedFiles.some(file => 
        file.name.toLowerCase().includes(requiredFile.name.toLowerCase()) &&
        file.type.includes(requiredFile.type)
      );
      if (hasFile) completedRequirements++;
    }
  }
  
  return Math.round((completedRequirements / requiredFiles.length) * 100);
};

// Get all projects with PLC data
export const getAllProjectsWithPLC = () => {
  const projects = [];
  const keys = Object.keys(localStorage);
  
  for (const key of keys) {
    if (key.startsWith('plc_config_')) {
      const projectId = key.replace('plc_config_', '');
      const config = getGateConfig(projectId);
      projects.push({
        projectId,
        gateCount: config.gates.length,
        completedGates: config.gates.filter(g => g.status === GATE_STATUS.COMPLETED).length
      });
    }
  }
  
  return projects;
};

// Clear all PLC data for a project
export const clearProjectPLCData = (projectId) => {
  if (!projectId) return;
  
  const key = `plc_config_${projectId}`;
  localStorage.removeItem(key);
};

// Clear all PLC data
export const clearAllPLCData = () => {
  const keys = Object.keys(localStorage);
  
  for (const key of keys) {
    if (key.startsWith('plc_config_')) {
      localStorage.removeItem(key);
    }
  }
};

// Add document to gate
export const addDocumentToGate = (projectId, gateId, document) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (gate) {
    if (!gate.documents) {
      gate.documents = [];
    }
    
    const newDocument = {
      id: document.id || `doc-${Date.now()}`,
      name: document.name,
      type: document.type || 'document',
      url: document.url,
      responsibleUser: document.responsibleUser || '',
      reviewWorkflow: document.reviewWorkflow || 'standard-review',
      liveStatus: 'pending-review',
      attachedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      comments: ''
    };
    
    gate.documents.push(newDocument);
    saveGateConfig(projectId, config);
    return newDocument;
  }
  
  return null;
};

// Update document status
export const updateDocumentStatus = (projectId, gateId, documentId, status, reviewedBy = null, comments = '') => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (gate && gate.documents) {
    const document = gate.documents.find(d => d.id === documentId);
    if (document) {
      document.liveStatus = status;
      document.reviewedAt = new Date().toISOString();
      document.reviewedBy = reviewedBy;
      document.comments = comments;
      saveGateConfig(projectId, config);
      
      // Check if all documents are approved to unlock next gate
      checkGateCompletion(projectId, gateId);
    }
  }
};

// Check if gate is complete and unlock next gate
export const checkGateCompletion = (projectId, gateId) => {
  const config = getGateConfig(projectId);
  const gate = config.gates.find(g => g.id === gateId);
  
  if (gate && gate.documents && gate.documents.length > 0) {
    const allApproved = gate.documents.every(doc => doc.liveStatus === 'approved');
    
    if (allApproved && gate.status !== GATE_STATUS.COMPLETED) {
      // Mark gate as completed
      gate.status = GATE_STATUS.COMPLETED;
      gate.completedAt = new Date().toISOString();
      
      // Unlock next gate
      const currentPhase = gate.phase;
      const nextGate = config.gates.find(g => g.phase === currentPhase + 1 && g.status === GATE_STATUS.LOCKED);
      
      if (nextGate) {
        nextGate.status = GATE_STATUS.OPEN;
        nextGate.unlockedAt = new Date().toISOString();
      }
      
      saveGateConfig(projectId, config);
      return true;
    }
  }
  
  return false;
};

// Check for overdue gates and send notifications
export const checkOverdueGates = (projectId) => {
  const config = getGateConfig(projectId);
  const now = new Date();
  const overdueGates = [];
  
  // Ensure gates array exists
  if (!config.gates || !Array.isArray(config.gates)) {
    console.warn('No gates found in config for project:', projectId);
    return [];
  }
  
  config.gates.forEach(gate => {
    if (gate.finishDate && gate.status !== GATE_STATUS.COMPLETED) {
      const finishDate = new Date(gate.finishDate);
      const daysOverdue = Math.ceil((now - finishDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        overdueGates.push({
          gate,
          daysOverdue,
          severity: daysOverdue > config.notificationSettings.escalationDays ? 'critical' : 'warning'
        });
      }
    }
  });
  
  return overdueGates;
};

// Get gate statistics with enhanced data
export const getGateStatistics = (projectId) => {
  const config = getGateConfig(projectId);
  const gates = config.gates || [];
  
  const stats = {
    total: gates.length,
    completed: gates.filter(g => g.status === GATE_STATUS.COMPLETED).length,
    inProgress: gates.filter(g => g.status === GATE_STATUS.IN_PROGRESS).length,
    open: gates.filter(g => g.status === GATE_STATUS.OPEN).length,
    locked: gates.filter(g => g.status === GATE_STATUS.LOCKED).length,
    overdue: checkOverdueGates(projectId).length,
    totalDocuments: gates.reduce((sum, gate) => sum + (gate.documents ? gate.documents.length : 0), 0),
    pendingDocuments: gates.reduce((sum, gate) => {
      if (!gate.documents) return sum;
      return sum + gate.documents.filter(doc => doc.liveStatus === 'pending-review').length;
    }, 0),
    approvedDocuments: gates.reduce((sum, gate) => {
      if (!gate.documents) return sum;
      return sum + gate.documents.filter(doc => doc.liveStatus === 'approved').length;
    }, 0)
  };
  
  return stats;
};

// Add gate with ordering
export const addGateWithOrder = (projectId, gate) => {
  const config = getGateConfig(projectId);
  
  // Set gate order based on phase
  const gateOrder = config.gateOrder || [];
  const newGate = {
    ...gate,
    id: gate.id || `gate-${Date.now()}`,
    order: gateOrder.length + 1,
    status: GATE_STATUS.OPEN
  };
  
  config.gates.push(newGate);
  gateOrder.push(newGate.id);
  config.gateOrder = gateOrder;
  
  saveGateConfig(projectId, config);
  return newGate;
};

// Update gate order
export const updateGateOrder = (projectId, gateOrder) => {
  const config = getGateConfig(projectId);
  config.gateOrder = gateOrder;
  
  // Update gate statuses based on order
  gateOrder.forEach((gateId, index) => {
    const gate = config.gates.find(g => g.id === gateId);
    if (gate) {
      if (index === 0) {
        gate.status = GATE_STATUS.OPEN;
      } else {
        gate.status = GATE_STATUS.LOCKED;
      }
    }
  });
  
  saveGateConfig(projectId, config);
};

// Get available phases for dropdown
export const getAvailablePhases = (projectId) => {
  const config = getGateConfig(projectId);
  return config.phases || [];
};

// Set current phase
export const setCurrentPhase = (projectId, phaseId) => {
  const config = getGateConfig(projectId);
  const phase = config.phases.find(p => p.id === phaseId);
  
  if (!phase) {
    throw new Error('Phase not found');
  }
  
  config.currentPhase = phaseId;
  
  // Update gate statuses based on current phase
  config.gates.forEach(gate => {
    if (gate.phase <= phaseId) {
      if (gate.phase === phaseId) {
        gate.status = GATE_STATUS.OPEN;
      } else if (gate.status === GATE_STATUS.LOCKED) {
        gate.status = GATE_STATUS.OPEN;
      }
    } else {
      gate.status = GATE_STATUS.LOCKED;
    }
  });
  
  saveGateConfig(projectId, config);
  return phase;
};

// Get next gate in sequence
export const getNextGate = (projectId, currentGateId) => {
  const config = getGateConfig(projectId);
  const gateOrder = config.gateOrder || [];
  const currentIndex = gateOrder.indexOf(currentGateId);
  
  if (currentIndex >= 0 && currentIndex < gateOrder.length - 1) {
    const nextGateId = gateOrder[currentIndex + 1];
    return config.gates.find(g => g.id === nextGateId);
  }
  
  return null;
};

// Unlock next gate when current gate is completed
export const unlockNextGate = (projectId, completedGateId) => {
  const config = getGateConfig(projectId);
  const nextGate = getNextGate(projectId, completedGateId);
  
  if (nextGate && nextGate.status === GATE_STATUS.LOCKED) {
    nextGate.status = GATE_STATUS.OPEN;
    nextGate.unlockedAt = new Date().toISOString();
    saveGateConfig(projectId, config);
    return nextGate;
  }
  
  return null;
};

// Phase Management Functions

/**
 * Add a new phase to the project
 */
export const addPhase = (projectId, phaseData) => {
  const config = getGateConfig(projectId);
  const newPhase = {
    id: Date.now(), // Simple ID generation
    name: phaseData.name,
    description: phaseData.description || '',
    order: config.phases.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  config.phases.push(newPhase);
  saveGateConfig(projectId, config);
  return newPhase;
};

/**
 * Update an existing phase
 */
export const updatePhase = (projectId, phaseId, phaseData) => {
  const config = getGateConfig(projectId);
  const phaseIndex = config.phases.findIndex(phase => phase.id === phaseId);
  
  if (phaseIndex === -1) {
    throw new Error('Phase not found');
  }
  
  config.phases[phaseIndex] = {
    ...config.phases[phaseIndex],
    ...phaseData,
    updatedAt: new Date().toISOString()
  };
  
  saveGateConfig(projectId, config);
  return config.phases[phaseIndex];
};

/**
 * Delete a phase from the project
 */
export const deletePhase = (projectId, phaseId) => {
  const config = getGateConfig(projectId);
  
  // Check if any gates are using this phase
  const gatesUsingPhase = config.gates.filter(gate => gate.phaseId === phaseId);
  if (gatesUsingPhase.length > 0) {
    throw new Error(`Cannot delete phase. ${gatesUsingPhase.length} gates are using this phase.`);
  }
  
  // Check if this is the current phase
  if (config.currentPhase === phaseId) {
    throw new Error('Cannot delete the current phase. Please change the current phase first.');
  }
  
  const phaseIndex = config.phases.findIndex(phase => phase.id === phaseId);
  if (phaseIndex === -1) {
    throw new Error('Phase not found');
  }
  
  const deletedPhase = config.phases.splice(phaseIndex, 1)[0];
  
  // Reorder remaining phases
  config.phases.forEach((phase, index) => {
    phase.order = index + 1;
  });
  
  saveGateConfig(projectId, config);
  return deletedPhase;
};

/**
 * Get all phases for a project
 */
export const getPhases = (projectId) => {
  const config = getGateConfig(projectId);
  return config.phases.sort((a, b) => a.order - b.order);
};

/**
 * Get a specific phase by ID
 */
export const getPhaseById = (projectId, phaseId) => {
  const config = getGateConfig(projectId);
  return config.phases.find(phase => phase.id === phaseId);
};

/**
 * Reorder phases
 */
export const reorderPhases = (projectId, phaseIds) => {
  const config = getGateConfig(projectId);
  
  phaseIds.forEach((phaseId, index) => {
    const phase = config.phases.find(p => p.id === phaseId);
    if (phase) {
      phase.order = index + 1;
    }
  });
  
  saveGateConfig(projectId, config);
  return getPhases(projectId);
};


/**
 * Get the current phase
 */
export const getCurrentPhase = (projectId) => {
  const config = getGateConfig(projectId);
  return config.phases.find(phase => phase.id === config.currentPhase);
};
