import React from 'react';
import { File, Eye } from 'lucide-react';

const FileWithRevision = ({ file, onViewFile }) => {

  // Get the version to display
  const getDisplayVersion = () => {
    if (file.versionNumber) {
      return `v${file.versionNumber}`;
    }
    if (file.selectedVersion?.attributes?.versionNumber) {
      return `v${file.selectedVersion.attributes.versionNumber}`;
    }
    if (file.version) {
      return `v${file.version}`;
    }
    return 'v1.0'; // fallback
  };

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded p-2 text-xs">
      <div className="flex items-center space-x-2">
        <File className="w-3 h-3 text-gray-500" />
        <span className="text-gray-700 truncate">{file.name}</span>
        <span className="text-gray-500 text-xs">({getDisplayVersion()})</span>
      </div>
      {(file.name.toLowerCase().endsWith('.pdf') || 
        file.name.toLowerCase().endsWith('.docx') || 
        file.name.toLowerCase().endsWith('.doc')) && (
        <button
          onClick={() => onViewFile(file)}
          className="flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Eye className="w-3 h-3 mr-1" />
          View
        </button>
      )}
    </div>
  );
};

export default FileWithRevision;
