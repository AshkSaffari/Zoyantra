import React from 'react';

export default function SignatureTab({ selectedProject, selectedHub }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Signature</h2>
      <p className="text-gray-600">Connect ACC documents to Adobe Sign. Convert DOCX → PDF and send for signature.</p>
      <div className="text-sm text-gray-500">
        Project: {selectedProject?.name || '-'} | Hub: {selectedHub?.attributes?.name || selectedHub?.name || '-'}
      </div>
      <div className="p-4 rounded-lg border bg-white">
        Hook this tab to your integration server endpoints:
        <ul className="list-disc pl-6 mt-2 text-sm">
          <li>/oauth/login/autodesk → connect ACC</li>
          <li>/oauth/login/adobe → connect Adobe Sign</li>
          <li>/files → list DOCX</li>
          <li>/download, /convert-to-pdf, /send-for-sign → full flow</li>
        </ul>
      </div>
    </div>
  );
}


