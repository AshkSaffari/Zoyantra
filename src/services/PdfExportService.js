import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Professional PDF Export Service
 * Creates styled PDFs with branding, tables, and professional formatting
 */
class PdfExportService {
  constructor() {
    this.brandColors = {
      primary: '#2563eb',      // Blue
      secondary: '#1e40af',    // Dark Blue
      accent: '#3b82f6',       // Light Blue
      success: '#10b981',      // Green
      warning: '#f59e0b',      // Orange
      danger: '#ef4444',       // Red
      gray: '#6b7280',         // Gray
      lightGray: '#f3f4f6',    // Light Gray
      darkGray: '#374151'      // Dark Gray
    };
  }

  /**
   * Generate a styled timesheet PDF
   */
  async generateTimesheetPDF(data, options = {}) {
    const {
      title = 'Timesheet Report',
      projectName = 'Unknown Project',
      userName = 'Unknown User',
      dateRange = null,
      includeArchived = false
    } = options;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add header
    this.addHeader(doc, title, projectName, userName, dateRange);
    
    // Add summary section
    this.addSummarySection(doc, data, includeArchived);
    
    // Add timesheet table
    this.addTimesheetTable(doc, data);
    
    // Add footer
    this.addFooter(doc);
    
    return doc;
  }

  /**
   * Generate a styled budget performance PDF
   */
  async generateBudgetPerformancePDF(data, options = {}) {
    const {
      title = 'Budget Performance Report',
      projectName = 'Unknown Project',
      userName = 'Unknown User',
      budgetName = 'Unknown Budget'
    } = options;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add header
    this.addHeader(doc, title, projectName, userName);
    
    // Add budget summary
    this.addBudgetSummary(doc, data, budgetName);
    
    // Add performance metrics
    this.addPerformanceMetrics(doc, data);
    
    // Add detailed breakdown
    this.addDetailedBreakdown(doc, data);
    
    // Add footer
    this.addFooter(doc);
    
    return doc;
  }

  /**
   * Generate a styled ACC export PDF
   */
  async generateACCExportPDF(data, options = {}) {
    const {
      title = 'ACC Export Report',
      projectName = 'Unknown Project',
      userName = 'Unknown User',
      exportType = 'Timesheet Data'
    } = options;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add header
    this.addHeader(doc, title, projectName, userName);
    
    // Add export info
    this.addExportInfo(doc, exportType, data.length);
    
    // Add data table
    this.addDataTable(doc, data);
    
    // Add footer
    this.addFooter(doc);
    
    return doc;
  }

  /**
   * Add professional header to PDF
   */
  addHeader(doc, title, projectName, userName, dateRange = null) {
    // Company branding area
    doc.setFillColor(this.brandColors.primary);
    doc.rect(0, 0, 210, 30, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ZOYANTRA Timesheet System', 15, 20);
    
    // Report title
    doc.setTextColor(this.brandColors.darkGray);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, 45);
    
    // Project info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${projectName}`, 15, 55);
    doc.text(`User: ${userName}`, 15, 62);
    
    if (dateRange) {
      doc.text(`Period: ${dateRange}`, 15, 69);
    }
    
    // Generated date
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 76);
    
    // Add a line separator
    doc.setDrawColor(this.brandColors.primary);
    doc.setLineWidth(0.5);
    doc.line(15, 85, 195, 85);
  }

  /**
   * Add summary section with key metrics
   */
  addSummarySection(doc, data, includeArchived = false) {
    const activeData = data.filter(item => !item.archived);
    const archivedData = data.filter(item => item.archived);
    
    // Summary box
    doc.setFillColor(this.brandColors.lightGray);
    doc.rect(15, 95, 180, 25, 'F');
    
    // Summary title
    doc.setTextColor(this.brandColors.darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, 108);
    
    // Summary metrics
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const totalHours = activeData.reduce((sum, item) => sum + (item.hours || 0), 0);
    const totalOutput = activeData.reduce((sum, item) => sum + (item.output || 0), 0);
    
    doc.text(`Active Entries: ${activeData.length}`, 20, 115);
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 80, 115);
    doc.text(`Total Output: ${totalOutput.toFixed(2)}`, 140, 115);
    
    if (includeArchived) {
      doc.text(`Archived Entries: ${archivedData.length}`, 20, 120);
    }
  }

  /**
   * Add timesheet data table
   */
  addTimesheetTable(doc, data) {
    const tableData = data.map(item => [
      item.date || 'N/A',
      item.userName || 'N/A',
      item.projectName || 'N/A',
      item.budgetName || 'N/A',
      (item.hours || 0).toFixed(2),
      (item.output || 0).toFixed(2),
      item.archived ? 'Yes' : 'No',
      item.synced ? 'Yes' : 'No'
    ]);

    doc.autoTable({
      startY: 130,
      head: [['Date', 'User', 'Project', 'Budget', 'Hours', 'Output', 'Archived', 'Synced']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.brandColors.primary,
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: this.brandColors.lightGray
      },
      columnStyles: {
        4: { halign: 'right' }, // Hours
        5: { halign: 'right' }, // Output
        6: { halign: 'center' }, // Archived
        7: { halign: 'center' }  // Synced
      },
      margin: { left: 15, right: 15 }
    });
  }

  /**
   * Add budget summary section
   */
  addBudgetSummary(doc, data, budgetName) {
    // Budget info box
    doc.setFillColor(this.brandColors.lightGray);
    doc.rect(15, 95, 180, 20, 'F');
    
    doc.setTextColor(this.brandColors.darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Budget: ${budgetName}`, 20, 108);
    
    // Calculate totals
    const totalHours = data.reduce((sum, item) => sum + (item.hours || 0), 0);
    const totalOutput = data.reduce((sum, item) => sum + (item.output || 0), 0);
    const productivity = totalHours > 0 ? (totalOutput / totalHours).toFixed(2) : 0;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 20, 115);
    doc.text(`Total Output: ${totalOutput.toFixed(2)}`, 80, 115);
    doc.text(`Productivity: ${productivity}`, 140, 115);
  }

  /**
   * Add performance metrics section
   */
  addPerformanceMetrics(doc, data) {
    // Performance metrics box
    doc.setFillColor(this.brandColors.lightGray);
    doc.rect(15, 125, 180, 15, 'F');
    
    doc.setTextColor(this.brandColors.darkGray);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Metrics', 20, 135);
    
    // Calculate metrics
    const avgHours = data.length > 0 ? data.reduce((sum, item) => sum + (item.hours || 0), 0) / data.length : 0;
    const avgOutput = data.length > 0 ? data.reduce((sum, item) => sum + (item.output || 0), 0) / data.length : 0;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Average Hours per Entry: ${avgHours.toFixed(2)}`, 20, 142);
    doc.text(`Average Output per Entry: ${avgOutput.toFixed(2)}`, 100, 142);
  }

  /**
   * Add detailed breakdown table
   */
  addDetailedBreakdown(doc, data) {
    const tableData = data.map(item => [
      item.date || 'N/A',
      item.userName || 'N/A',
      (item.hours || 0).toFixed(2),
      (item.output || 0).toFixed(2),
      item.hours > 0 ? ((item.output || 0) / item.hours).toFixed(2) : '0.00',
      item.archived ? 'Yes' : 'No'
    ]);

    doc.autoTable({
      startY: 150,
      head: [['Date', 'User', 'Hours', 'Output', 'Rate', 'Archived']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.brandColors.secondary,
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: this.brandColors.lightGray
      },
      columnStyles: {
        2: { halign: 'right' }, // Hours
        3: { halign: 'right' }, // Output
        4: { halign: 'right' }, // Rate
        5: { halign: 'center' }  // Archived
      },
      margin: { left: 15, right: 15 }
    });
  }

  /**
   * Add export information section
   */
  addExportInfo(doc, exportType, recordCount) {
    // Export info box
    doc.setFillColor(this.brandColors.lightGray);
    doc.rect(15, 95, 180, 20, 'F');
    
    doc.setTextColor(this.brandColors.darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Export Information', 20, 108);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Export Type: ${exportType}`, 20, 115);
    doc.text(`Record Count: ${recordCount}`, 100, 115);
    doc.text(`Export Date: ${new Date().toLocaleString()}`, 20, 120);
  }

  /**
   * Add data table for ACC export
   */
  addDataTable(doc, data) {
    const tableData = data.map(item => [
      item.date || 'N/A',
      item.userName || 'N/A',
      item.projectName || 'N/A',
      item.budgetName || 'N/A',
      (item.hours || 0).toFixed(2),
      (item.output || 0).toFixed(2),
      item.archived ? 'Yes' : 'No'
    ]);

    doc.autoTable({
      startY: 130,
      head: [['Date', 'User', 'Project', 'Budget', 'Hours', 'Output', 'Archived']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.brandColors.accent,
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: this.brandColors.lightGray
      },
      columnStyles: {
        4: { halign: 'right' }, // Hours
        5: { halign: 'right' }, // Output
        6: { halign: 'center' }  // Archived
      },
      margin: { left: 15, right: 15 }
    });
  }

  /**
   * Add professional footer
   */
  addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(this.brandColors.gray);
      doc.setLineWidth(0.5);
      doc.line(15, 280, 195, 280);
      
      // Footer text
      doc.setTextColor(this.brandColors.gray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('ZOYANTRA Timesheet System - Professional Timesheet Management', 15, 285);
      doc.text(`Page ${i} of ${pageCount}`, 150, 285);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 290);
    }
  }

  /**
   * Generate PDF from HTML element (for complex layouts)
   */
  async generatePDFFromHTML(elementId, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id '${elementId}' not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return doc;
  }

  /**
   * Save PDF to file
   */
  savePDF(doc, filename) {
    doc.save(filename);
  }

  /**
   * Get PDF as blob for upload
   */
  getPDFBlob(doc) {
    return doc.output('blob');
  }
}

export default new PdfExportService();
