import React from 'react';

const PermissionTab = ({ selectedProject, members }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Permissions Tab</h2>
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Project Permissions</h3>
        <div className="space-y-2">
          <p><strong>Selected Project:</strong> {selectedProject ? selectedProject.name : 'None'}</p>
          <p><strong>Members Count:</strong> {members ? members.length : 0}</p>
        </div>
        
        {members && members.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Project Members:</h4>
            <div className="bg-white p-2 rounded border">
              {members.map((member, index) => (
                <div key={index} className="flex justify-between py-1 border-b last:border-b-0">
                  <span>{member.name || member.email || 'Unknown'}</span>
                  <span className="text-gray-600">{member.role || 'No role'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionTab;
