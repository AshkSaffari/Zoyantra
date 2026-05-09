class LocalPhaseService {
  constructor() {
    this.storageKey = 'cewa_project_phases';
    this.phases = this.loadPhases();
  }

  // Load phases from localStorage
  loadPhases() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading phases from localStorage:', error);
      return {};
    }
  }

  // Save phases to localStorage
  savePhases() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.phases));
    } catch (error) {
      console.error('Error saving phases to localStorage:', error);
    }
  }

  // Get current phase for a specific project
  getProjectPhase(projectId) {
    const projectData = this.phases[projectId];
    if (!projectData) return 'Not Set';
    
    // Handle legacy format (string) - convert to new format
    if (typeof projectData === 'string') {
      console.log('🔄 Converting legacy string format to object format in getProjectPhase');
      const legacyPhase = projectData;
      this.phases[projectId] = {
        current: legacyPhase,
        history: []
      };
      return legacyPhase;
    }
    
    return projectData.current || 'Not Set';
  }
  
  // Get phase history for a specific project
  getProjectPhaseHistory(projectId) {
    const projectData = this.phases[projectId];
    if (!projectData) {
      return [];
    }
    
    // Handle legacy format (string) - convert to new format
    if (typeof projectData === 'string') {
      console.log('🔄 Converting legacy string format to object format in getProjectPhaseHistory');
      const legacyPhase = projectData;
      this.phases[projectId] = {
        current: legacyPhase,
        history: []
      };
      return [];
    }
    
    return projectData.history || [];
  }
  
  // Get all phases (current + history) for a specific project
  getAllProjectPhases(projectId) {
    const projectData = this.phases[projectId];
    if (!projectData) return [];
    
    // Handle legacy format (string) - convert to new format
    if (typeof projectData === 'string') {
      console.log('🔄 Converting legacy string format to object format in getAllProjectPhases');
      const legacyPhase = projectData;
      this.phases[projectId] = {
        current: legacyPhase,
        history: []
      };
      return [{
        phase: legacyPhase,
        timestamp: new Date().toISOString(),
        dateSet: new Date().toISOString().split('T')[0],
        isCurrent: true
      }];
    }
    
    const current = projectData.current;
    const history = projectData.history || [];
    
    // Combine current and history, with current first
    const allPhases = [];
    
    // Add history (most recent first)
    const reversedHistory = [...history].reverse();
    let currentPhaseFound = false;
    
    reversedHistory.forEach((entry, index) => {
      // Only mark as current if it's the current phase AND it's the first occurrence (most recent)
      const isCurrent = entry.phase === current && current !== 'Not Set' && !currentPhaseFound;
      if (isCurrent) {
        currentPhaseFound = true;
      }
      
      allPhases.push({
        ...entry,
        isCurrent: isCurrent
      });
    });
    
    // If current phase is not in history, add it at the top
    if (current && current !== 'Not Set' && !currentPhaseFound) {
      allPhases.unshift({
        phase: current,
        timestamp: new Date().toISOString(),
        dateSet: new Date().toISOString().split('T')[0],
        isCurrent: true
      });
    }
    
    return allPhases;
  }

  // Set phase for a specific project with history tracking
  setProjectPhase(projectId, phase) {
    console.log('🔍 Setting project phase:', projectId, phase);
    const now = new Date().toISOString();
    
    // Initialize project phases if not exists
    if (!this.phases[projectId]) {
      this.phases[projectId] = {
        current: phase,
        history: []
      };
    }

    // Handle legacy format (string) - convert to new format
    if (typeof this.phases[projectId] === 'string') {
      console.log('🔄 Converting legacy string format to object format');
      const legacyPhase = this.phases[projectId];
      this.phases[projectId] = {
        current: legacyPhase,
        history: []
      };
    }

    // Ensure history array exists and is an array
    if (!Array.isArray(this.phases[projectId].history)) {
      this.phases[projectId].history = [];
    }
    
    console.log('🔍 Current history before set:', this.phases[projectId].history);
    
    // Add current phase to history if it's different from the last one
    const lastPhase = this.phases[projectId].history.length > 0 
      ? this.phases[projectId].history[this.phases[projectId].history.length - 1].phase
      : this.phases[projectId].current;
    
    if (lastPhase !== phase) {
      // Add to history
      this.phases[projectId].history.push({
        phase: phase,
        timestamp: now,
        dateSet: now.split('T')[0] // YYYY-MM-DD format
      });
      
      console.log('🔍 History after adding to history:', this.phases[projectId].history);
      
      // Keep only last 20 entries
      if (this.phases[projectId].history.length > 20) {
        this.phases[projectId].history = this.phases[projectId].history.slice(-20);
      }
    }
    
    // Update current phase
    this.phases[projectId].current = phase;
    this.savePhases();
    console.log('✅ Project phase set successfully');
  }

  // Get current phases for multiple projects
  getMultipleProjectPhases(projectIds) {
    const result = {};
    projectIds.forEach(projectId => {
      result[projectId] = this.getProjectPhase(projectId);
    });
    return result;
  }

  // Get available phase options
  getAvailablePhases() {
    return [
      'Concept',
      'Design', 
      'Bidding',
      'Planning',
      'Preconstruction',
      'Construction',
      'Commissioning',
      'Warranty',
      'Complete',
      'Facility Management',
      'Operation',
      'Strategic Definition',
      'Preparation and Brief',
      'Concept Design',
      'Developed Design',
      'Technical Design',
      'Handover and Close Out',
      'In Use'
    ];
  }

  // Clear all phases (useful for testing)
  clearAllPhases() {
    this.phases = {};
    this.savePhases();
  }

  // Export phases data
  exportPhases() {
    return {
      phases: this.phases,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Import phases data
  importPhases(data) {
    try {
      if (data.phases && typeof data.phases === 'object') {
        this.phases = { ...this.phases, ...data.phases };
        this.savePhases();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing phases:', error);
      return false;
    }
  }

  // Add phase with custom date
  addPhaseWithDate(projectId, phaseData) {
    console.log('🔍 Adding phase with date:', projectId, phaseData);
    
    // Initialize project data if it doesn't exist
    if (!this.phases[projectId]) {
      this.phases[projectId] = {
        current: 'Not Set',
        history: []
      };
    }

    // Handle legacy format (string) - convert to new format
    if (typeof this.phases[projectId] === 'string') {
      console.log('🔄 Converting legacy string format to object format');
      const legacyPhase = this.phases[projectId];
      this.phases[projectId] = {
        current: legacyPhase,
        history: []
      };
    }

    // Ensure history array exists and is an array
    if (!Array.isArray(this.phases[projectId].history)) {
      this.phases[projectId].history = [];
    }

    console.log('🔍 Current history before add:', this.phases[projectId].history);

    // Check if this exact phase and date combination already exists
    const existingPhase = this.phases[projectId].history.find(phase => 
      phase.phase === phaseData.phase && phase.dateSet === phaseData.dateSet
    );

    if (!existingPhase) {
      // Add to history only if it doesn't already exist
      this.phases[projectId].history.push(phaseData);
      console.log('🔍 History after add:', this.phases[projectId].history);
      
      // Keep only last 7 entries for this project
      if (this.phases[projectId].history.length > 7) {
        this.phases[projectId].history = this.phases[projectId].history.slice(-7);
      }
    } else {
      console.log('🔍 Phase already exists, not adding duplicate');
    }
    
    this.savePhases();
    console.log('✅ Phase added successfully');
  }

  // Remove phase by index
  removePhaseByIndex(projectId, index) {
    console.log('🔍 Removing phase by index:', projectId, index);
    
    if (!this.phases[projectId]) {
      console.log('❌ Project not found:', projectId);
      return;
    }

    // Handle legacy format (string) - convert to new format
    if (typeof this.phases[projectId] === 'string') {
      console.log('🔄 Converting legacy string format to object format');
      const legacyPhase = this.phases[projectId];
      this.phases[projectId] = {
        current: legacyPhase,
        history: []
      };
    }

    // Ensure history array exists and is an array
    if (!Array.isArray(this.phases[projectId].history)) {
      console.log('❌ History array not found or not an array');
      this.phases[projectId].history = [];
      return;
    }

    // Get all phases (current + history) to find the correct index
    const allPhases = this.getAllProjectPhases(projectId);
    
    if (index < 0 || index >= allPhases.length) {
      console.log('❌ Invalid index:', index, 'for total phases length:', allPhases.length);
      return;
    }

    // Find the phase to remove
    const phaseToRemove = allPhases[index];
    console.log('🔍 Phase to remove:', phaseToRemove);

    // If it's the current phase, clear current phase
    if (phaseToRemove.isCurrent) {
      console.log('🔍 Removing current phase');
      this.phases[projectId].current = 'Not Set';
    } else {
      // Remove from history
      const historyIndex = this.phases[projectId].history.findIndex(phase => 
        phase.phase === phaseToRemove.phase && phase.dateSet === phaseToRemove.dateSet
      );
      
      if (historyIndex !== -1) {
        console.log('🔍 Removing from history at index:', historyIndex);
        this.phases[projectId].history.splice(historyIndex, 1);
      }
    }

    this.savePhases();
    console.log('✅ Phase removed successfully');
  }

}

export default new LocalPhaseService();

