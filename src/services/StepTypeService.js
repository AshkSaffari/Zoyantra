/**
 * StepTypeService - Manages configurable step types for PLC gates
 */
class StepTypeService {
  constructor() {
    this.storageKey = 'zoyantra_step_types';
    this.defaultStepTypes = [
      { id: 'pdf', name: 'PDF Document', icon: '📄', description: 'PDF files and documents' },
      { id: 'docx', name: 'Word Document', icon: '📝', description: 'Microsoft Word documents' },
      { id: 'xlsx', name: 'Excel Spreadsheet', icon: '📊', description: 'Microsoft Excel spreadsheets' },
      { id: 'pptx', name: 'PowerPoint', icon: '📽️', description: 'Microsoft PowerPoint presentations' },
      { id: 'dwg', name: 'AutoCAD Drawing', icon: '📐', description: 'AutoCAD DWG files' },
      { id: 'rvt', name: 'Revit Model', icon: '🏗️', description: 'Autodesk Revit models' },
      { id: 'ifc', name: 'IFC Model', icon: '🏢', description: 'Industry Foundation Classes files' },
      { id: 'txt', name: 'Text File', icon: '📄', description: 'Plain text files' },
      { id: 'image', name: 'Image', icon: '🖼️', description: 'Image files (JPG, PNG, etc.)' },
      { id: 'other', name: 'Other', icon: '📎', description: 'Other file types' }
    ];
  }

  /**
   * Get all step types
   */
  getStepTypes() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.length > 0 ? parsed : this.defaultStepTypes;
      }
      return this.defaultStepTypes;
    } catch (error) {
      console.error('Error loading step types:', error);
      return this.defaultStepTypes;
    }
  }

  /**
   * Save step types
   */
  saveStepTypes(stepTypes) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(stepTypes));
      console.log('✅ Step types saved:', stepTypes.length);
      return true;
    } catch (error) {
      console.error('Error saving step types:', error);
      return false;
    }
  }

  /**
   * Add a new step type
   */
  addStepType(stepType) {
    const stepTypes = this.getStepTypes();
    const newStepType = {
      id: stepType.id || stepType.name.toLowerCase().replace(/\s+/g, '_'),
      name: stepType.name,
      icon: stepType.icon || '📎',
      description: stepType.description || '',
      ...stepType
    };
    
    // Check if ID already exists
    if (stepTypes.find(st => st.id === newStepType.id)) {
      throw new Error('Step type with this ID already exists');
    }
    
    stepTypes.push(newStepType);
    return this.saveStepTypes(stepTypes);
  }

  /**
   * Update a step type
   */
  updateStepType(id, updates) {
    const stepTypes = this.getStepTypes();
    const index = stepTypes.findIndex(st => st.id === id);
    
    if (index === -1) {
      throw new Error('Step type not found');
    }
    
    stepTypes[index] = { ...stepTypes[index], ...updates };
    return this.saveStepTypes(stepTypes);
  }

  /**
   * Delete a step type
   */
  deleteStepType(id) {
    const stepTypes = this.getStepTypes();
    const filtered = stepTypes.filter(st => st.id !== id);
    
    if (filtered.length === stepTypes.length) {
      throw new Error('Step type not found');
    }
    
    return this.saveStepTypes(filtered);
  }

  /**
   * Get step type by ID
   */
  getStepTypeById(id) {
    const stepTypes = this.getStepTypes();
    return stepTypes.find(st => st.id === id);
  }

  /**
   * Reset to default step types
   */
  resetToDefaults() {
    return this.saveStepTypes(this.defaultStepTypes);
  }
}

export default new StepTypeService();
