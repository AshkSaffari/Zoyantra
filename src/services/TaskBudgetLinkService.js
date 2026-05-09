/**
 * TaskBudgetLinkService
 * Manages the relationship between tasks (from MSP/Primavera/Planner) and budgets
 * Implements many-to-one relationship (many tasks can link to one budget)
 * Handles bi-directional progress synchronization
 */
class TaskBudgetLinkService {
  constructor() {
    this.linksKeyPrefix = 'task_budget_links';
    this.progressKeyPrefix = 'budget_task_progress';
  }

  /**
   * Get storage key for task-budget links
   */
  getLinksKey(projectId) {
    return `${this.linksKeyPrefix}_${projectId}`;
  }

  /**
   * Get storage key for budget progress aggregation
   */
  getProgressKey(projectId) {
    return `${this.progressKeyPrefix}_${projectId}`;
  }

  /**
   * Link a task to a budget (many tasks → one budget)
   * @param {string} taskId - The task identifier
   * @param {string} budgetId - The budget identifier to link to
   * @param {string} projectId - The project identifier
   * @param {object} metadata - Optional metadata (task name, dates, etc.)
   */
  linkTaskToBudget(taskId, budgetId, projectId, metadata = {}) {
    try {
      const linksKey = this.getLinksKey(projectId);
      const links = this.getAllLinks(projectId);

      links[taskId] = {
        budgetId,
        progress: 0,
        lastUpdated: new Date().toISOString(),
        source: 'manual',
        linkedAt: new Date().toISOString(),
        metadata: {
          taskName: metadata.taskName || '',
          startDate: metadata.startDate || '',
          endDate: metadata.endDate || '',
          ...metadata
        },
        history: []
      };

      localStorage.setItem(linksKey, JSON.stringify(links));
      
      // Recalculate budget progress
      this.calculateBudgetProgress(budgetId, projectId);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('taskLinked', {
        detail: { taskId, budgetId, projectId }
      }));

      console.log(`✅ Linked task ${taskId} to budget ${budgetId}`);
      return true;
    } catch (error) {
      console.error('❌ Error linking task to budget:', error);
      return false;
    }
  }

  /**
   * Unlink a task from its budget
   */
  unlinkTask(taskId, projectId) {
    try {
      const links = this.getAllLinks(projectId);
      const link = links[taskId];
      
      if (!link) {
        console.warn(`⚠️ Task ${taskId} is not linked`);
        return false;
      }

      const budgetId = link.budgetId;
      delete links[taskId];

      localStorage.setItem(this.getLinksKey(projectId), JSON.stringify(links));
      
      // Recalculate budget progress without this task
      this.calculateBudgetProgress(budgetId, projectId);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('taskUnlinked', {
        detail: { taskId, budgetId, projectId }
      }));

      console.log(`✅ Unlinked task ${taskId} from budget ${budgetId}`);
      return true;
    } catch (error) {
      console.error('❌ Error unlinking task:', error);
      return false;
    }
  }

  /**
   * Get all task-budget links for a project
   */
  getAllLinks(projectId) {
    try {
      const stored = localStorage.getItem(this.getLinksKey(projectId));
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error loading task links:', error);
      return {};
    }
  }

  /**
   * Get all tasks linked to a specific budget
   * @param {string} budgetId - The budget identifier
   * @param {string} projectId - The project identifier
   * @returns {Array} Array of task objects with their link data
   */
  getTasksForBudget(budgetId, projectId) {
    const links = this.getAllLinks(projectId);
    const tasks = [];

    for (const [taskId, linkData] of Object.entries(links)) {
      if (linkData.budgetId === budgetId) {
        tasks.push({
          taskId,
          ...linkData
        });
      }
    }

    return tasks;
  }

  /**
   * Get the budget linked to a specific task
   * @param {string} taskId - The task identifier
   * @param {string} projectId - The project identifier
   * @returns {object|null} The link data including budgetId
   */
  getBudgetForTask(taskId, projectId) {
    const links = this.getAllLinks(projectId);
    return links[taskId] || null;
  }

  /**
   * Update task progress and trigger budget recalculation
   * Implements bi-directional sync: task → budget
   * @param {string} taskId - The task identifier
   * @param {number} progress - Progress value (0-100)
   * @param {string} projectId - The project identifier
   * @param {string} source - Source of update ('task', 'budget', 'manual', 'timesheet')
   */
  updateTaskProgress(taskId, progress, projectId, source = 'manual') {
    try {
      const links = this.getAllLinks(projectId);
      const link = links[taskId];

      if (!link) {
        console.warn(`⚠️ Task ${taskId} is not linked to any budget`);
        return false;
      }

      // Validate progress
      const validProgress = Math.max(0, Math.min(100, parseFloat(progress) || 0));

      // Add to history
      const historyEntry = {
        date: new Date().toISOString(),
        progress: validProgress,
        source,
        previousProgress: link.progress
      };

      link.progress = validProgress;
      link.lastUpdated = new Date().toISOString();
      link.source = source;
      link.history = link.history || [];
      link.history.push(historyEntry);

      // Keep only last 50 history entries
      if (link.history.length > 50) {
        link.history = link.history.slice(-50);
      }

      localStorage.setItem(this.getLinksKey(projectId), JSON.stringify(links));

      // Recalculate budget progress (average of all linked tasks)
      this.calculateBudgetProgress(link.budgetId, projectId);

      // Dispatch event
      window.dispatchEvent(new CustomEvent('taskProgressUpdated', {
        detail: { taskId, progress: validProgress, budgetId: link.budgetId, projectId, source }
      }));

      console.log(`✅ Updated task ${taskId} progress to ${validProgress}% (source: ${source})`);
      return true;
    } catch (error) {
      console.error('❌ Error updating task progress:', error);
      return false;
    }
  }

  /**
   * Calculate budget progress from all linked tasks (average)
   * @param {string} budgetId - The budget identifier
   * @param {string} projectId - The project identifier
   * @returns {number} The calculated average progress
   */
  calculateBudgetProgress(budgetId, projectId) {
    try {
      const tasks = this.getTasksForBudget(budgetId, projectId);
      
      if (tasks.length === 0) {
        console.log(`ℹ️ No tasks linked to budget ${budgetId}`);
        return 0;
      }

      // Calculate average progress
      const totalProgress = tasks.reduce((sum, task) => sum + (task.progress || 0), 0);
      const averageProgress = totalProgress / tasks.length;

      // Store budget progress data
      const progressKey = this.getProgressKey(projectId);
      const budgetProgress = this.getAllBudgetProgress(projectId);

      budgetProgress[budgetId] = {
        linkedTasks: tasks.map(t => t.taskId),
        taskCount: tasks.length,
        averageProgress: Math.round(averageProgress * 10) / 10, // Round to 1 decimal
        totalProgress,
        lastCalculated: new Date().toISOString(),
        tasks: tasks.map(t => ({
          taskId: t.taskId,
          taskName: t.metadata?.taskName || 'Unknown',
          progress: t.progress,
          lastUpdated: t.lastUpdated
        }))
      };

      localStorage.setItem(progressKey, JSON.stringify(budgetProgress));

      // Dispatch event
      window.dispatchEvent(new CustomEvent('budgetProgressCalculated', {
        detail: { budgetId, progress: budgetProgress[budgetId].averageProgress, projectId }
      }));

      console.log(`✅ Calculated budget ${budgetId} progress: ${budgetProgress[budgetId].averageProgress}% (from ${tasks.length} tasks)`);
      return budgetProgress[budgetId].averageProgress;
    } catch (error) {
      console.error('❌ Error calculating budget progress:', error);
      return 0;
    }
  }

  /**
   * Get all budget progress data for a project
   */
  getAllBudgetProgress(projectId) {
    try {
      const stored = localStorage.getItem(this.getProgressKey(projectId));
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error loading budget progress:', error);
      return {};
    }
  }

  /**
   * Get progress data for a specific budget
   */
  getBudgetProgress(budgetId, projectId) {
    const allProgress = this.getAllBudgetProgress(projectId);
    return allProgress[budgetId] || null;
  }

  /**
   * Update budget progress and distribute to all linked tasks (bi-directional sync: budget → tasks)
   * @param {string} budgetId - The budget identifier
   * @param {number} newProgress - New progress value (0-100)
   * @param {string} projectId - The project identifier
   */
  updateBudgetProgress(budgetId, newProgress, projectId) {
    try {
      const tasks = this.getTasksForBudget(budgetId, projectId);
      
      if (tasks.length === 0) {
        console.warn(`⚠️ No tasks linked to budget ${budgetId}, cannot distribute progress`);
        return false;
      }

      const validProgress = Math.max(0, Math.min(100, parseFloat(newProgress) || 0));
      
      // Distribute progress equally to all linked tasks
      const links = this.getAllLinks(projectId);
      let updated = 0;

      for (const task of tasks) {
        if (links[task.taskId]) {
          links[task.taskId].progress = validProgress;
          links[task.taskId].lastUpdated = new Date().toISOString();
          links[task.taskId].source = 'budget';
          
          // Add to history
          links[task.taskId].history = links[task.taskId].history || [];
          links[task.taskId].history.push({
            date: new Date().toISOString(),
            progress: validProgress,
            source: 'budget',
            previousProgress: task.progress
          });

          updated++;
        }
      }

      localStorage.setItem(this.getLinksKey(projectId), JSON.stringify(links));

      // Update budget progress storage
      this.calculateBudgetProgress(budgetId, projectId);

      // Dispatch event
      window.dispatchEvent(new CustomEvent('budgetProgressUpdated', {
        detail: { budgetId, progress: validProgress, projectId, tasksUpdated: updated }
      }));

      console.log(`✅ Updated budget ${budgetId} progress to ${validProgress}%, distributed to ${updated} tasks`);
      return true;
    } catch (error) {
      console.error('❌ Error updating budget progress:', error);
      return false;
    }
  }

  /**
   * Get progress history for a task
   */
  getTaskProgressHistory(taskId, projectId) {
    const link = this.getBudgetForTask(taskId, projectId);
    return link ? (link.history || []) : [];
  }

  /**
   * Bulk link multiple tasks to budgets
   * @param {Array} links - Array of {taskId, budgetId, metadata} objects
   * @param {string} projectId - The project identifier
   */
  bulkLinkTasks(links, projectId) {
    try {
      let successCount = 0;
      const budgetsToRecalculate = new Set();

      for (const link of links) {
        if (this.linkTaskToBudget(link.taskId, link.budgetId, projectId, link.metadata)) {
          successCount++;
          budgetsToRecalculate.add(link.budgetId);
        }
      }

      // Recalculate all affected budgets
      for (const budgetId of budgetsToRecalculate) {
        this.calculateBudgetProgress(budgetId, projectId);
      }

      console.log(`✅ Bulk linked ${successCount}/${links.length} tasks`);
      return successCount;
    } catch (error) {
      console.error('❌ Error bulk linking tasks:', error);
      return 0;
    }
  }

  /**
   * Clear all links for a project
   */
  clearAllLinks(projectId) {
    try {
      localStorage.removeItem(this.getLinksKey(projectId));
      localStorage.removeItem(this.getProgressKey(projectId));
      console.log(`✅ Cleared all task-budget links for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing links:', error);
      return false;
    }
  }

  /**
   * Export links and progress data for backup/analysis
   */
  exportData(projectId) {
    return {
      links: this.getAllLinks(projectId),
      budgetProgress: this.getAllBudgetProgress(projectId),
      exportedAt: new Date().toISOString(),
      projectId
    };
  }

  /**
   * Import links and progress data
   */
  importData(data, projectId) {
    try {
      if (data.links) {
        localStorage.setItem(this.getLinksKey(projectId), JSON.stringify(data.links));
      }
      if (data.budgetProgress) {
        localStorage.setItem(this.getProgressKey(projectId), JSON.stringify(data.budgetProgress));
      }
      console.log(`✅ Imported task-budget link data for project ${projectId}`);
      return true;
    } catch (error) {
      console.error('❌ Error importing data:', error);
      return false;
    }
  }
}

export default TaskBudgetLinkService;

