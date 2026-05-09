/**
 * NotificationService
 * Handles notifications for PLC gates, including overdue alerts
 */

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
  }

  // Add notification listener
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove notification listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners(notification) {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Create notification
  createNotification(type, title, message, data = {}) {
    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.notifications.unshift(notification);
    this.notifyListeners(notification);
    
    // Store in localStorage
    this.saveNotifications();
    
    return notification;
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get unread notifications
  getUnreadNotifications() {
    return this.notifications.filter(notif => !notif.read);
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners({ type: 'notification_updated', notification });
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(notif => {
      notif.read = true;
    });
    this.saveNotifications();
    this.notifyListeners({ type: 'all_notifications_read' });
  }

  // Clear notification
  clearNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners({ type: 'notification_cleared', notificationId });
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners({ type: 'all_notifications_cleared' });
  }

  // Save notifications to localStorage
  saveNotifications() {
    try {
      localStorage.setItem('zoyantra_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // Load notifications from localStorage
  loadNotifications() {
    try {
      const stored = localStorage.getItem('zoyantra_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Check for overdue gates and create notifications
  checkOverdueGates(projectId, gates) {
    const now = new Date();
    const overdueGates = [];

    gates.forEach(gate => {
      if (gate.finishDate && gate.status !== 'completed') {
        const finishDate = new Date(gate.finishDate);
        const daysOverdue = Math.ceil((now - finishDate) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          overdueGates.push({
            gate,
            daysOverdue,
            severity: daysOverdue > 7 ? 'critical' : 'warning'
          });

          // Create notification for overdue gate
          this.createNotification(
            'overdue_gate',
            `Gate Overdue: ${gate.name}`,
            `The gate "${gate.name}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Please complete the required documents and approvals.`,
            {
              projectId,
              gateId: gate.id,
              gateName: gate.name,
              daysOverdue,
              severity: daysOverdue > 7 ? 'critical' : 'warning',
              finishDate: gate.finishDate
            }
          );
        }
      }
    });

    return overdueGates;
  }

  // Check for upcoming deadlines
  checkUpcomingDeadlines(projectId, gates, reminderDays = [7, 3, 1]) {
    const now = new Date();
    const upcomingDeadlines = [];

    gates.forEach(gate => {
      if (gate.finishDate && gate.status !== 'completed') {
        const finishDate = new Date(gate.finishDate);
        const daysUntilDeadline = Math.ceil((finishDate - now) / (1000 * 60 * 60 * 24));
        
        if (reminderDays.includes(daysUntilDeadline) && daysUntilDeadline > 0) {
          upcomingDeadlines.push({
            gate,
            daysUntilDeadline
          });

          // Create notification for upcoming deadline
          this.createNotification(
            'upcoming_deadline',
            `Deadline Reminder: ${gate.name}`,
            `The gate "${gate.name}" is due in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''}. Please ensure all documents are ready for review.`,
            {
              projectId,
              gateId: gate.id,
              gateName: gate.name,
              daysUntilDeadline,
              finishDate: gate.finishDate
            }
          );
        }
      }
    });

    return upcomingDeadlines;
  }

  // Create document review notification
  createDocumentReviewNotification(projectId, gateId, gateName, documentName, responsibleUser) {
    return this.createNotification(
      'document_review',
      `Document Review Required: ${documentName}`,
      `The document "${documentName}" in gate "${gateName}" requires review by ${responsibleUser}.`,
      {
        projectId,
        gateId,
        gateName,
        documentName,
        responsibleUser
      }
    );
  }

  // Create gate completion notification
  createGateCompletionNotification(projectId, gateId, gateName) {
    return this.createNotification(
      'gate_completed',
      `Gate Completed: ${gateName}`,
      `The gate "${gateName}" has been completed and the next gate has been unlocked.`,
      {
        projectId,
        gateId,
        gateName
      }
    );
  }

  // Create document approval notification
  createDocumentApprovalNotification(projectId, gateId, gateName, documentName, status) {
    return this.createNotification(
      'document_approval',
      `Document ${status === 'approved' ? 'Approved' : 'Rejected'}: ${documentName}`,
      `The document "${documentName}" in gate "${gateName}" has been ${status}.`,
      {
        projectId,
        gateId,
        gateName,
        documentName,
        status
      }
    );
  }

  // Initialize notification service
  initialize() {
    this.loadNotifications();
    
    // Set up periodic checks for overdue gates
    setInterval(() => {
      this.checkAllProjectsForOverdueGates();
    }, 60000); // Check every minute
  }

  // Check all projects for overdue gates
  checkAllProjectsForOverdueGates() {
    // This would typically iterate through all projects
    // For now, we'll just log that the check is running
    console.log('Checking for overdue gates...');
  }
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;
