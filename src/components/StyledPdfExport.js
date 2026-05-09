import React, { useState } from 'react';
import { FileText, Download, Settings, Eye } from 'lucide-react';
import PdfExportService from '../services/PdfExportService';

/**
 * Styled PDF Export Component
 * Provides options for different types of styled PDF exports
 */
export default function StyledPdfExport({ 
  data = [], 
  projectName = 'Unknown Project',
  userName = 'Unknown User',
  onExport = () => {}
}) {
  const [exportType, setExportType] = useState('timesheet');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportTypes = [
    { value: 'timesheet', label: 'Timesheet Report', description: 'Complete timesheet data with summary' },
    { value: 'budget', label: 'Budget Performance', description: 'Budget performance analysis and metrics' },
    { value: 'acc', label: 'ACC Export Report', description: 'ACC integration export data' },
    { value: 'summary', label: 'Executive Summary', description: 'High-level summary for management' }
  ];

  const handleExport = async (type) => {
    setIsExporting(true);
    try {
      let doc;
      const filteredData = includeArchived ? data : data.filter(item => !item.archived);
      
      switch (type) {
        case 'timesheet':
          doc = await PdfExportService.generateTimesheetPDF(filteredData, {
            title: 'Timesheet Management Report',
            projectName,
            userName,
            dateRange: getDateRange(filteredData),
            includeArchived
          });
          break;
          
        case 'budget':
          doc = await PdfExportService.generateBudgetPerformancePDF(filteredData, {
            title: 'Budget Performance Report',
            projectName,
            userName,
            budgetName: 'All Budgets'
          });
          break;
          
        case 'acc':
          doc = await PdfExportService.generateACCExportPDF(filteredData, {
            title: 'ACC Export Report',
            projectName,
            userName,
            exportType: 'Timesheet Data'
          });
          break;
          
        case 'summary':
          doc = await PdfExportService.generateTimesheetPDF(filteredData, {
            title: 'Executive Summary Report',
            projectName,
            userName,
            dateRange: getDateRange(filteredData),
            includeArchived
          });
          break;
          
        default:
          throw new Error(`Unknown export type: ${type}`);
      }

      const filename = `${type}-report-${projectName}-${new Date().toISOString().split('T')[0]}.pdf`;
      PdfExportService.savePDF(doc, filename);
      
      onExport(type, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate ${type} PDF. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const getDateRange = (data) => {
    if (data.length === 0) return null;
    
    const dates = data.map(item => new Date(item.date)).filter(date => !isNaN(date));
    if (dates.length === 0) return null;
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
  };

  const getDataSummary = () => {
    const activeData = data.filter(item => !item.archived);
    const archivedData = data.filter(item => item.archived);
    
    return {
      total: data.length,
      active: activeData.length,
      archived: archivedData.length,
      totalHours: data.reduce((sum, item) => sum + (item.hours || 0), 0),
      totalOutput: data.reduce((sum, item) => sum + (item.output || 0), 0)
    };
  };

  const summary = getDataSummary();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Styled PDF Export
          </h3>
          <p className="text-sm text-gray-600">Generate professional PDF reports with custom styling</p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
          <div className="text-sm text-blue-800">Total Entries</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{summary.active}</div>
          <div className="text-sm text-green-800">Active Entries</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{summary.archived}</div>
          <div className="text-sm text-orange-800">Archived Entries</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{summary.totalHours.toFixed(1)}</div>
          <div className="text-sm text-purple-800">Total Hours</div>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exportTypes.map((type) => (
              <div
                key={type.value}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  exportType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setExportType(type.value)}
              >
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-600">{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Include archived entries</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleExport(exportType)}
            disabled={isExporting || data.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {exportTypes.find(t => t.value === exportType)?.label}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">PDF Preview</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Report Type:</strong> {exportTypes.find(t => t.value === exportType)?.label}</p>
            <p><strong>Project:</strong> {projectName}</p>
            <p><strong>User:</strong> {userName}</p>
            <p><strong>Date Range:</strong> {getDateRange(data) || 'N/A'}</p>
            <p><strong>Include Archived:</strong> {includeArchived ? 'Yes' : 'No'}</p>
            <p><strong>Total Entries:</strong> {includeArchived ? summary.total : summary.active}</p>
          </div>
        </div>
      )}

      {/* Export History */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Exports</h4>
        <div className="text-sm text-gray-600">
          <p>No recent exports. Generate your first PDF to see export history here.</p>
        </div>
      </div>
    </div>
  );
}
