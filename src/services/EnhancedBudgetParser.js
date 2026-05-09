/**
 * Enhanced Budget Parser
 * Parses ACC budget data to match the Project Control Sheet structure
 */

class EnhancedBudgetParser {
  constructor() {
    this.budgetCategories = {
      'construction': ['Construction Contract Sum', 'Construction', 'Contract Sum'],
      'furniture': ['Furniture & Fittings', 'Furniture', 'Fittings'],
      'architect': ['Architects and Core Consultant Fee', 'Architect', 'Core Consultant'],
      'non-core': ['Non Core Consultant Fee', 'Non Core', 'Consultant Fee'],
      'quantity': ['Quantity Surveyors Fee', 'Quantity Surveyor', 'QS Fee'],
      'disbursement': ['Disbursement', 'Disbursements'],
      'insurance': ['CCI Insurance', 'Insurance', 'CCI'],
      'contingency': ['Contingency', 'Contingency - Stage 1', 'Stage 1']
    };
  }

  /**
   * Parse raw budget data to match ACC Project Control Sheet format
   */
  parseBudgetsForProjectControlSheet(rawBudgets) {
    console.log('📊 Parsing budgets for Project Control Sheet format...');
    
    const parsedBudgets = rawBudgets.map(budget => {
      const parsed = this.parseIndividualBudget(budget);
      return {
        ...parsed,
        // Add Project Control Sheet specific fields
        budgetCode: this.generateBudgetCode(parsed.name),
        architectContractorClassification: this.determineClassification(parsed.name),
        originalBudget: parsed.originalValue || 0,
        approvedInternalBudget: parsed.internalChanges || 0,
        approvedCewaChanges: parsed.cewaChanges || 0,
        revisedBudget: parsed.currentValue || parsed.revisedValue || 0,
        pendingCewaChanges: parsed.pendingChanges || 0,
        projectedFinalCost: parsed.projectedFinalCost || parsed.currentValue || 0,
        category: this.categorizeBudget(parsed.name),
        hasChanges: parsed.isRevised || false,
        changeReason: parsed.changeReason || null
      };
    });

    // Add summary row
    const summary = this.calculateSummary(parsedBudgets);
    parsedBudgets.unshift(summary);

    console.log(`✅ Parsed ${parsedBudgets.length} budgets for Project Control Sheet`);
    return parsedBudgets;
  }

  /**
   * Parse individual budget with enhanced data extraction
   */
  parseIndividualBudget(budget) {
    return {
      id: budget.id,
      name: budget.name || budget.attributes?.name || 'Unnamed Budget',
      originalValue: this.extractAmount(budget, ['originalAmount', 'originalValue', 'amount']),
      currentValue: this.extractAmount(budget, ['currentValue', 'revisedValue', 'totalAmount', 'amount']),
      revisedValue: this.extractAmount(budget, ['revisedValue', 'currentValue']),
      currency: budget.currency || 'USD',
      status: budget.status || 'active',
      isRevised: this.determineIfRevised(budget),
      revisionCount: (budget.revisions || []).length,
      lastModified: budget.lastModified || budget.updatedAt,
      created: budget.created || budget.createdAt,
      attributes: budget.attributes || {},
      subitems: budget.subitems || [],
      revisions: budget.revisions || [],
      // Enhanced fields for Project Control Sheet
      internalChanges: this.extractInternalChanges(budget),
      cewaChanges: this.extractCewaChanges(budget),
      pendingChanges: this.extractPendingChanges(budget),
      projectedFinalCost: this.extractProjectedFinalCost(budget),
      changeReason: this.extractChangeReason(budget)
    };
  }

  /**
   * Extract amount from various possible fields
   */
  extractAmount(budget, fields) {
    for (const field of fields) {
      const value = budget[field] || budget.attributes?.[field];
      if (value !== undefined && value !== null) {
        return parseFloat(value) || 0;
      }
    }
    return 0;
  }

  /**
   * Determine if budget has been revised
   */
  determineIfRevised(budget) {
    return !!(budget.revisions && budget.revisions.length > 0) ||
           (budget.originalValue !== budget.currentValue) ||
           (budget.originalAmount !== budget.revisedAmount);
  }

  /**
   * Extract internal changes (Approved Internal Budget)
   */
  extractInternalChanges(budget) {
    // Look for internal changes in attributes or revisions
    const internalChange = budget.attributes?.internalChanges || 
                          budget.attributes?.approvedInternalBudget ||
                          budget.internalChanges;
    return parseFloat(internalChange) || 0;
  }

  /**
   * Extract CEWA changes (Approved CEWA Changes)
   */
  extractCewaChanges(budget) {
    const cewaChange = budget.attributes?.cewaChanges || 
                      budget.attributes?.approvedCewaChanges ||
                      budget.cewaChanges;
    return parseFloat(cewaChange) || 0;
  }

  /**
   * Extract pending changes (Pending CEWA Changes)
   */
  extractPendingChanges(budget) {
    const pendingChange = budget.attributes?.pendingChanges || 
                         budget.attributes?.pendingCewaChanges ||
                         budget.pendingChanges;
    return parseFloat(pendingChange) || 0;
  }

  /**
   * Extract projected final cost
   */
  extractProjectedFinalCost(budget) {
    const projected = budget.attributes?.projectedFinalCost || 
                     budget.attributes?.projectedCost ||
                     budget.projectedFinalCost;
    return parseFloat(projected) || budget.currentValue || 0;
  }

  /**
   * Extract change reason
   */
  extractChangeReason(budget) {
    return budget.attributes?.changeReason || 
           budget.attributes?.reason ||
           budget.changeReason ||
           (budget.revisions && budget.revisions[0]?.reason) ||
           null;
  }

  /**
   * Generate budget code based on name
   */
  generateBudgetCode(name) {
    const category = this.categorizeBudget(name);
    const categoryCodes = {
      'construction': '01.1',
      'furniture': '02.1',
      'architect': '03.1',
      'non-core': '04.1',
      'quantity': '05.1',
      'disbursement': '06.1',
      'insurance': '07.1',
      'contingency': '08.1',
      'other': '99.1'
    };
    return categoryCodes[category] || '99.1';
  }

  /**
   * Determine architect/contractor classification
   */
  determineClassification(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('architect') || lowerName.includes('consultant')) {
      return 'Architect';
    } else if (lowerName.includes('construction') || lowerName.includes('contract')) {
      return 'Contractor';
    } else if (lowerName.includes('furniture') || lowerName.includes('fittings')) {
      return 'Contractor';
    } else {
      return 'Other';
    }
  }

  /**
   * Categorize budget based on name
   */
  categorizeBudget(name) {
    const lowerName = name.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.budgetCategories)) {
      if (keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Calculate summary row
   */
  calculateSummary(budgets) {
    const summary = {
      id: 'summary',
      name: 'Summary',
      budgetCode: '00.0',
      architectContractorClassification: 'All',
      originalBudget: 0,
      approvedInternalBudget: 0,
      approvedCewaChanges: 0,
      revisedBudget: 0,
      pendingCewaChanges: 0,
      projectedFinalCost: 0,
      category: 'summary',
      hasChanges: false,
      isSummary: true
    };

    budgets.forEach(budget => {
      if (!budget.isSummary) {
        summary.originalBudget += budget.originalBudget || 0;
        summary.approvedInternalBudget += budget.approvedInternalBudget || 0;
        summary.approvedCewaChanges += budget.approvedCewaChanges || 0;
        summary.revisedBudget += budget.revisedBudget || 0;
        summary.pendingCewaChanges += budget.pendingCewaChanges || 0;
        summary.projectedFinalCost += budget.projectedFinalCost || 0;
        
        if (budget.hasChanges) {
          summary.hasChanges = true;
        }
      }
    });

    return summary;
  }

  /**
   * Format budget for display
   */
  formatBudgetForDisplay(budget) {
    return {
      ...budget,
      originalBudgetFormatted: this.formatCurrency(budget.originalBudget),
      approvedInternalBudgetFormatted: this.formatCurrency(budget.approvedInternalBudget),
      approvedCewaChangesFormatted: this.formatCurrency(budget.approvedCewaChanges),
      revisedBudgetFormatted: this.formatCurrency(budget.revisedBudget),
      pendingCewaChangesFormatted: this.formatCurrency(budget.pendingCewaChanges),
      projectedFinalCostFormatted: this.formatCurrency(budget.projectedFinalCost)
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(amount);
  }
}

export default EnhancedBudgetParser;
