/**
 * APS Webhook Service
 * Handles real-time webhook events from Autodesk Platform Services
 * Supports Data Management, Cost Management, Issues, and other APS events
 */

class WebhookService {
  constructor() {
    this.webhookUrl = process.env.REACT_APP_WEBHOOK_URL || 'https://your-app.com/webhook';
    this.eventHandlers = new Map();
    this.subscriptions = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the webhook service
   */
  async initialize(credentials) {
    if (this.isInitialized) return;

    this.credentials = credentials;
    this.isInitialized = true;
    
    console.log('🔗 WebhookService initialized');
  }

  /**
   * Register event handlers for different webhook events
   */
  registerEventHandler(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
    console.log(`📝 Registered handler for event: ${eventType}`);
  }

  /**
   * Unregister event handlers
   */
  unregisterEventHandler(eventType, handler) {
    if (this.eventHandlers.has(eventType)) {
      const handlers = this.eventHandlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        console.log(`🗑️ Unregistered handler for event: ${eventType}`);
      }
    }
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhookPayload(payload) {
    try {
      console.log('📨 Processing webhook payload:', payload);

      const { eventType, system, data } = payload;
      
      // Get all handlers for this event type
      const handlers = this.eventHandlers.get(eventType) || [];
      
      // Also check for wildcard patterns
      const wildcardHandlers = this.getWildcardHandlers(eventType);
      
      const allHandlers = [...handlers, ...wildcardHandlers];

      if (allHandlers.length === 0) {
        console.log(`⚠️ No handlers registered for event: ${eventType}`);
        return;
      }

      // Execute all handlers
      for (const handler of allHandlers) {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`❌ Error in webhook handler for ${eventType}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error processing webhook payload:', error);
    }
  }

  /**
   * Get handlers that match wildcard patterns
   */
  getWildcardHandlers(eventType) {
    const handlers = [];
    
    for (const [pattern, patternHandlers] of this.eventHandlers.entries()) {
      if (this.matchesWildcard(pattern, eventType)) {
        handlers.push(...patternHandlers);
      }
    }
    
    return handlers;
  }

  /**
   * Check if event type matches wildcard pattern
   */
  matchesWildcard(pattern, eventType) {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    
    // Handle patterns like "dm.operation*", "*.added", "dm.*.modified"
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(eventType);
  }

  /**
   * Create webhook subscription for a project
   */
  async createSubscription(projectId, events = ['*']) {
    try {
      if (!this.credentials?.threeLegToken) {
        throw new Error('No valid credentials available');
      }

      const subscriptionData = {
        hookAttribute: {
          callbackUrl: this.webhookUrl,
          scope: {
            workflow: projectId
          }
        },
        hookEvents: events
      };

      const response = await fetch('https://developer.api.autodesk.com/webhooks/v1/systems/derivative/events/extraction.finished/hooks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.threeLegToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create webhook subscription: ${response.status}`);
      }

      const result = await response.json();
      this.subscriptions.set(projectId, result);
      
      console.log(`✅ Webhook subscription created for project: ${projectId}`);
      return result;

    } catch (error) {
      console.error('❌ Error creating webhook subscription:', error);
      throw error;
    }
  }

  /**
   * Delete webhook subscription
   */
  async deleteSubscription(projectId) {
    try {
      const subscription = this.subscriptions.get(projectId);
      if (!subscription) return;

      const response = await fetch(`https://developer.api.autodesk.com/webhooks/v1/systems/derivative/events/extraction.finished/hooks/${subscription.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.credentials.threeLegToken}`
        }
      });

      if (response.ok) {
        this.subscriptions.delete(projectId);
        console.log(`✅ Webhook subscription deleted for project: ${projectId}`);
      }

    } catch (error) {
      console.error('❌ Error deleting webhook subscription:', error);
    }
  }

  /**
   * Cost Management Event Handlers
   */
  
  // Budget events
  registerBudgetHandlers() {
    this.registerEventHandler('autodesk.construction.cost.budget.created-1.0', this.handleBudgetCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.budget.updated-1.0', this.handleBudgetUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.budget.deleted-1.0', this.handleBudgetDeleted.bind(this));
  }

  // Expense events
  registerExpenseHandlers() {
    this.registerEventHandler('autodesk.construction.cost.expense.created-1.0', this.handleExpenseCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.expense.updated-1.0', this.handleExpenseUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.expense.deleted-1.0', this.handleExpenseDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.cost.expenseItem.created-1.0', this.handleExpenseItemCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.expenseItem.updated-1.0', this.handleExpenseItemUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.expenseItem.deleted-1.0', this.handleExpenseItemDeleted.bind(this));
  }

  // Contract events
  registerContractHandlers() {
    this.registerEventHandler('autodesk.construction.cost.contract.created-1.0', this.handleContractCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.contract.updated-1.0', this.handleContractUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.contract.deleted-1.0', this.handleContractDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.cost.mainContract.created-1.0', this.handleMainContractCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.mainContract.updated-1.0', this.handleMainContractUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.mainContract.deleted-1.0', this.handleMainContractDeleted.bind(this));
  }

  // Change Order events
  registerChangeOrderHandlers() {
    this.registerEventHandler('autodesk.construction.cost.cor.created-1.0', this.handleChangeOrderRequestCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.cor.updated-1.0', this.handleChangeOrderRequestUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.cor.deleted-1.0', this.handleChangeOrderRequestDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.cost.oco.created-1.0', this.handleOwnerChangeOrderCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.oco.updated-1.0', this.handleOwnerChangeOrderUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.oco.deleted-1.0', this.handleOwnerChangeOrderDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.cost.sco.created-1.0', this.handleSubcontractorChangeOrderCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.sco.updated-1.0', this.handleSubcontractorChangeOrderUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.sco.deleted-1.0', this.handleSubcontractorChangeOrderDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.cost.pco.created-1.0', this.handlePotentialChangeOrderCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.pco.updated-1.0', this.handlePotentialChangeOrderUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.pco.deleted-1.0', this.handlePotentialChangeOrderDeleted.bind(this));
  }

  // Schedule of Values events
  registerScheduleOfValuesHandlers() {
    this.registerEventHandler('autodesk.construction.cost.scheduleOfValue.created-1.0', this.handleScheduleOfValueCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.scheduleOfValue.updated-1.0', this.handleScheduleOfValueUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.scheduleOfValue.deleted-1.0', this.handleScheduleOfValueDeleted.bind(this));
  }

  // Payment events
  registerPaymentHandlers() {
    this.registerEventHandler('autodesk.construction.cost.budgetPayment.created-1.0', this.handleBudgetPaymentCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.budgetPayment.updated-1.0', this.handleBudgetPaymentUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.budgetPayment.deleted-1.0', this.handleBudgetPaymentDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.cost.costPayment.created-1.0', this.handleCostPaymentCreated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.costPayment.updated-1.0', this.handleCostPaymentUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.cost.costPayment.deleted-1.0', this.handleCostPaymentDeleted.bind(this));
  }

  /**
   * Data Management Event Handlers
   */
  registerDataManagementHandlers() {
    // File/Version events
    this.registerEventHandler('dm.version.added', this.handleVersionAdded.bind(this));
    this.registerEventHandler('dm.version.modified', this.handleVersionModified.bind(this));
    this.registerEventHandler('dm.version.deleted', this.handleVersionDeleted.bind(this));
    this.registerEventHandler('dm.version.moved', this.handleVersionMoved.bind(this));
    this.registerEventHandler('dm.version.copied', this.handleVersionCopied.bind(this));

    // Folder events
    this.registerEventHandler('dm.folder.added', this.handleFolderAdded.bind(this));
    this.registerEventHandler('dm.folder.modified', this.handleFolderModified.bind(this));
    this.registerEventHandler('dm.folder.deleted', this.handleFolderDeleted.bind(this));
    this.registerEventHandler('dm.folder.moved', this.handleFolderMoved.bind(this));
    this.registerEventHandler('dm.folder.copied', this.handleFolderCopied.bind(this));

    // Operation events
    this.registerEventHandler('dm.operation.started', this.handleOperationStarted.bind(this));
    this.registerEventHandler('dm.operation.completed', this.handleOperationCompleted.bind(this));
  }

  /**
   * ACC Issues Event Handlers
   */
  registerIssuesHandlers() {
    this.registerEventHandler('autodesk.construction.issues.issue.created-1.0', this.handleIssueCreated.bind(this));
    this.registerEventHandler('autodesk.construction.issues.issue.updated-1.0', this.handleIssueUpdated.bind(this));
    this.registerEventHandler('autodesk.construction.issues.issue.deleted-1.0', this.handleIssueDeleted.bind(this));
    this.registerEventHandler('autodesk.construction.issues.issue.restored-1.0', this.handleIssueRestored.bind(this));
    this.registerEventHandler('autodesk.construction.issues.issue.unlinked-1.0', this.handleIssueUnlinked.bind(this));
  }

  /**
   * Register all event handlers
   */
  registerAllHandlers() {
    this.registerBudgetHandlers();
    this.registerExpenseHandlers();
    this.registerContractHandlers();
    this.registerChangeOrderHandlers();
    this.registerScheduleOfValuesHandlers();
    this.registerPaymentHandlers();
    this.registerDataManagementHandlers();
    this.registerIssuesHandlers();
    
    console.log('📝 All webhook event handlers registered');
  }

  /**
   * Cost Management Event Handlers Implementation
   */
  
  async handleBudgetCreated(payload) {
    console.log('💰 Budget created:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'budget_created', payload);
  }

  async handleBudgetUpdated(payload) {
    console.log('💰 Budget updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'budget_updated', payload);
    this.notifyTabRefresh('evm', 'budget_updated', payload);
  }

  async handleBudgetDeleted(payload) {
    console.log('💰 Budget deleted:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'budget_deleted', payload);
  }

  async handleExpenseCreated(payload) {
    console.log('💸 Expense created:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'expense_created', payload);
  }

  async handleExpenseUpdated(payload) {
    console.log('💸 Expense updated:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'expense_updated', payload);
  }

  async handleExpenseDeleted(payload) {
    console.log('💸 Expense deleted:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'expense_deleted', payload);
  }

  async handleExpenseItemCreated(payload) {
    console.log('💸 Expense item created:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'expense_item_created', payload);
  }

  async handleExpenseItemUpdated(payload) {
    console.log('💸 Expense item updated:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'expense_item_updated', payload);
  }

  async handleExpenseItemDeleted(payload) {
    console.log('💸 Expense item deleted:', payload);
    // Trigger expense tab refresh
    this.notifyTabRefresh('expense', 'expense_item_deleted', payload);
  }

  async handleContractCreated(payload) {
    console.log('📋 Contract created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'contract_created', payload);
    this.notifyTabRefresh('evm', 'contract_created', payload);
  }

  async handleContractUpdated(payload) {
    console.log('📋 Contract updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'contract_updated', payload);
    this.notifyTabRefresh('evm', 'contract_updated', payload);
  }

  async handleContractDeleted(payload) {
    console.log('📋 Contract deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'contract_deleted', payload);
    this.notifyTabRefresh('evm', 'contract_deleted', payload);
  }

  async handleMainContractCreated(payload) {
    console.log('📋 Main contract created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'main_contract_created', payload);
    this.notifyTabRefresh('evm', 'main_contract_created', payload);
  }

  async handleMainContractUpdated(payload) {
    console.log('📋 Main contract updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'main_contract_updated', payload);
    this.notifyTabRefresh('evm', 'main_contract_updated', payload);
  }

  async handleMainContractDeleted(payload) {
    console.log('📋 Main contract deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'main_contract_deleted', payload);
    this.notifyTabRefresh('evm', 'main_contract_deleted', payload);
  }

  async handleChangeOrderRequestCreated(payload) {
    console.log('🔄 Change order request created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'cor_created', payload);
    this.notifyTabRefresh('evm', 'cor_created', payload);
  }

  async handleChangeOrderRequestUpdated(payload) {
    console.log('🔄 Change order request updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'cor_updated', payload);
    this.notifyTabRefresh('evm', 'cor_updated', payload);
  }

  async handleChangeOrderRequestDeleted(payload) {
    console.log('🔄 Change order request deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'cor_deleted', payload);
    this.notifyTabRefresh('evm', 'cor_deleted', payload);
  }

  async handleOwnerChangeOrderCreated(payload) {
    console.log('🔄 Owner change order created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'oco_created', payload);
    this.notifyTabRefresh('evm', 'oco_created', payload);
  }

  async handleOwnerChangeOrderUpdated(payload) {
    console.log('🔄 Owner change order updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'oco_updated', payload);
    this.notifyTabRefresh('evm', 'oco_updated', payload);
  }

  async handleOwnerChangeOrderDeleted(payload) {
    console.log('🔄 Owner change order deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'oco_deleted', payload);
    this.notifyTabRefresh('evm', 'oco_deleted', payload);
  }

  async handleSubcontractorChangeOrderCreated(payload) {
    console.log('🔄 Subcontractor change order created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'sco_created', payload);
    this.notifyTabRefresh('evm', 'sco_created', payload);
  }

  async handleSubcontractorChangeOrderUpdated(payload) {
    console.log('🔄 Subcontractor change order updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'sco_updated', payload);
    this.notifyTabRefresh('evm', 'sco_updated', payload);
  }

  async handleSubcontractorChangeOrderDeleted(payload) {
    console.log('🔄 Subcontractor change order deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'sco_deleted', payload);
    this.notifyTabRefresh('evm', 'sco_deleted', payload);
  }

  async handlePotentialChangeOrderCreated(payload) {
    console.log('🔄 Potential change order created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'pco_created', payload);
    this.notifyTabRefresh('evm', 'pco_created', payload);
  }

  async handlePotentialChangeOrderUpdated(payload) {
    console.log('🔄 Potential change order updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'pco_updated', payload);
    this.notifyTabRefresh('evm', 'pco_updated', payload);
  }

  async handlePotentialChangeOrderDeleted(payload) {
    console.log('🔄 Potential change order deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'pco_deleted', payload);
    this.notifyTabRefresh('evm', 'pco_deleted', payload);
  }

  async handleScheduleOfValueCreated(payload) {
    console.log('📊 Schedule of value created:', payload);
    // Trigger EVM tab refresh
    this.notifyTabRefresh('evm', 'schedule_of_value_created', payload);
  }

  async handleScheduleOfValueUpdated(payload) {
    console.log('📊 Schedule of value updated:', payload);
    // Trigger EVM tab refresh
    this.notifyTabRefresh('evm', 'schedule_of_value_updated', payload);
  }

  async handleScheduleOfValueDeleted(payload) {
    console.log('📊 Schedule of value deleted:', payload);
    // Trigger EVM tab refresh
    this.notifyTabRefresh('evm', 'schedule_of_value_deleted', payload);
  }

  async handleBudgetPaymentCreated(payload) {
    console.log('💳 Budget payment created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'budget_payment_created', payload);
    this.notifyTabRefresh('evm', 'budget_payment_created', payload);
  }

  async handleBudgetPaymentUpdated(payload) {
    console.log('💳 Budget payment updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'budget_payment_updated', payload);
    this.notifyTabRefresh('evm', 'budget_payment_updated', payload);
  }

  async handleBudgetPaymentDeleted(payload) {
    console.log('💳 Budget payment deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'budget_payment_deleted', payload);
    this.notifyTabRefresh('evm', 'budget_payment_deleted', payload);
  }

  async handleCostPaymentCreated(payload) {
    console.log('💳 Cost payment created:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'cost_payment_created', payload);
    this.notifyTabRefresh('evm', 'cost_payment_created', payload);
  }

  async handleCostPaymentUpdated(payload) {
    console.log('💳 Cost payment updated:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'cost_payment_updated', payload);
    this.notifyTabRefresh('evm', 'cost_payment_updated', payload);
  }

  async handleCostPaymentDeleted(payload) {
    console.log('💳 Cost payment deleted:', payload);
    // Trigger expense and EVM tab refresh
    this.notifyTabRefresh('expense', 'cost_payment_deleted', payload);
    this.notifyTabRefresh('evm', 'cost_payment_deleted', payload);
  }

  /**
   * Data Management Event Handlers Implementation
   */
  
  async handleVersionAdded(payload) {
    console.log('📄 Version added:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'version_added', payload);
  }

  async handleVersionModified(payload) {
    console.log('📄 Version modified:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'version_modified', payload);
  }

  async handleVersionDeleted(payload) {
    console.log('📄 Version deleted:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'version_deleted', payload);
  }

  async handleVersionMoved(payload) {
    console.log('📄 Version moved:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'version_moved', payload);
  }

  async handleVersionCopied(payload) {
    console.log('📄 Version copied:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'version_copied', payload);
  }

  async handleFolderAdded(payload) {
    console.log('📁 Folder added:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'folder_added', payload);
  }

  async handleFolderModified(payload) {
    console.log('📁 Folder modified:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'folder_modified', payload);
  }

  async handleFolderDeleted(payload) {
    console.log('📁 Folder deleted:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'folder_deleted', payload);
  }

  async handleFolderMoved(payload) {
    console.log('📁 Folder moved:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'folder_moved', payload);
  }

  async handleFolderCopied(payload) {
    console.log('📁 Folder copied:', payload);
    // Trigger docs tab refresh
    this.notifyTabRefresh('docs', 'folder_copied', payload);
  }

  async handleOperationStarted(payload) {
    console.log('⚙️ Operation started:', payload);
    // Trigger relevant tab refresh based on operation type
    this.notifyTabRefresh('docs', 'operation_started', payload);
  }

  async handleOperationCompleted(payload) {
    console.log('✅ Operation completed:', payload);
    // Trigger relevant tab refresh based on operation type
    this.notifyTabRefresh('docs', 'operation_completed', payload);
  }

  /**
   * ACC Issues Event Handlers Implementation
   */
  
  async handleIssueCreated(payload) {
    console.log('🐛 Issue created:', payload);
    // Trigger issues tab refresh
    this.notifyTabRefresh('issues', 'issue_created', payload);
  }

  async handleIssueUpdated(payload) {
    console.log('🐛 Issue updated:', payload);
    // Trigger issues tab refresh
    this.notifyTabRefresh('issues', 'issue_updated', payload);
  }

  async handleIssueDeleted(payload) {
    console.log('🐛 Issue deleted:', payload);
    // Trigger issues tab refresh
    this.notifyTabRefresh('issues', 'issue_deleted', payload);
  }

  async handleIssueRestored(payload) {
    console.log('🐛 Issue restored:', payload);
    // Trigger issues tab refresh
    this.notifyTabRefresh('issues', 'issue_restored', payload);
  }

  async handleIssueUnlinked(payload) {
    console.log('🐛 Issue unlinked:', payload);
    // Trigger issues tab refresh
    this.notifyTabRefresh('issues', 'issue_unlinked', payload);
  }

  /**
   * Notify tabs to refresh their data
   */
  notifyTabRefresh(tabName, eventType, payload) {
    // Dispatch custom event for tab refresh
    const event = new CustomEvent('webhookRefresh', {
      detail: {
        tab: tabName,
        eventType: eventType,
        payload: payload,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(event);
    console.log(`🔄 Notified ${tabName} tab to refresh due to ${eventType}`);
  }

  /**
   * Get webhook statistics
   */
  getStatistics() {
    return {
      totalHandlers: Array.from(this.eventHandlers.values()).flat().length,
      totalSubscriptions: this.subscriptions.size,
      registeredEvents: Array.from(this.eventHandlers.keys()),
      subscriptions: Array.from(this.subscriptions.entries())
    };
  }
}

export default WebhookService;
