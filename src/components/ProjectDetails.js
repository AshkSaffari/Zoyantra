import React from 'react';
import { Building2, Calendar, User, MapPin, Tag, DollarSign, Users, FileText } from 'lucide-react';

const ProjectDetails = ({ project }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (value, currency = 'USD') => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Project Name</h4>
          <p className="mt-1 text-sm text-gray-900">
            {project.name || 'Unnamed Project'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Project ID</h4>
            <p className="mt-1 text-sm text-gray-900 font-mono">
              {project.id}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700">Status</h4>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              project.status === 'active' ? 'bg-green-100 text-green-800' :
              project.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              project.status === 'archived' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {project.status || 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Type</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.type || 'N/A'}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700">Classification</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.classification || 'N/A'}
            </p>
          </div>
        </div>

        {project.jobNumber && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Job Number</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.jobNumber}
            </p>
          </div>
        )}


        {project.projectValue && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Project Value</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatCurrency(project.projectValue.value, project.projectValue.currency)}
            </p>
          </div>
        )}

        {project.currentPhase && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Current Phase</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.currentPhase}
            </p>
          </div>
        )}

        {project.constructionType && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Construction Type</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.constructionType}
            </p>
          </div>
        )}

        {project.deliveryMethod && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Delivery Method</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.deliveryMethod}
            </p>
          </div>
        )}

        {project.contractType && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Contract Type</h4>
            <p className="mt-1 text-sm text-gray-900">
              {project.contractType}
            </p>
          </div>
        )}

        {(project.addressLine1 || project.city || project.country) && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Location</h4>
            <p className="mt-1 text-sm text-gray-900">
              {[project.addressLine1, project.city, project.stateOrProvince, project.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Created</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(project.createdAt)}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700">Last Updated</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(project.updatedAt)}
            </p>
          </div>
        </div>

        {(project.memberCount || project.companyCount) && (
          <div className="grid grid-cols-2 gap-4">
            {project.memberCount && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Members</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {project.memberCount}
                </p>
              </div>
            )}
            {project.companyCount && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Companies</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {project.companyCount}
                </p>
              </div>
            )}
          </div>
        )}

        {project.products && project.products.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700">Products</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.products.map((product, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    product.status === 'active' ? 'bg-green-100 text-green-800' :
                    product.status === 'activating' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {product.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;



