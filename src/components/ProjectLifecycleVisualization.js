import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  ArrowRight,
  Calendar,
  Users,
  FileText,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { cn } from '../utils/cn';

const ProjectLifecycleVisualization = ({ gates, selectedProject }) => {
  const lifecyclePhases = [
    {
      id: 'initiation',
      name: 'Project Initiation',
      description: 'Project setup and planning phase',
      icon: Play,
      color: 'blue',
      status: 'completed'
    },
    {
      id: 'planning',
      name: 'Planning & Design',
      description: 'Detailed planning and design development',
      icon: Target,
      color: 'purple',
      status: 'in-progress'
    },
    {
      id: 'execution',
      name: 'Execution',
      description: 'Construction and implementation phase',
      icon: Users,
      color: 'green',
      status: 'pending'
    },
    {
      id: 'monitoring',
      name: 'Monitoring & Control',
      description: 'Progress tracking and quality control',
      icon: FileText,
      color: 'orange',
      status: 'pending'
    },
    {
      id: 'closure',
      name: 'Project Closure',
      description: 'Final delivery and project completion',
      icon: CheckCircle,
      color: 'gray',
      status: 'pending'
    }
  ];

  const getPhaseStatus = (phaseId) => {
    // Map gates to phases based on their order
    const gatePhaseMap = {
      0: 'initiation',
      1: 'planning', 
      2: 'execution',
      3: 'monitoring',
      4: 'closure'
    };
    
    const phaseGates = gates.filter(gate => {
      const phaseIndex = Object.keys(gatePhaseMap).find(key => 
        gatePhaseMap[key] === phaseId
      );
      return gate.order === parseInt(phaseIndex);
    });
    
    if (phaseGates.length === 0) return 'pending';
    
    const hasCompletedGates = phaseGates.some(gate => 
      gate.criteria?.every(criteria => criteria.reviewStatus === 'approved')
    );
    
    const hasInProgressGates = phaseGates.some(gate => 
      gate.criteria?.some(criteria => criteria.reviewStatus === 'submitted')
    );
    
    if (hasCompletedGates) return 'completed';
    if (hasInProgressGates) return 'in-progress';
    return 'preparing';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'preparing':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Pause className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'preparing':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-blue-900">
                {selectedProject?.name || 'Project Lifecycle'}
              </CardTitle>
              <p className="text-blue-700 mt-1">
                Track progress through each phase of the project lifecycle
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-medium">Total Gates</div>
              <div className="text-3xl font-bold text-blue-900">{gates.length}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lifecycle Phases */}
      <div className="space-y-4">
        {lifecyclePhases.map((phase, index) => {
          const status = getPhaseStatus(phase.id);
          const Icon = phase.icon;
          
          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
                status === 'completed' ? "border-green-200 bg-green-50" :
                status === 'in-progress' ? "border-blue-200 bg-blue-50" :
                status === 'preparing' ? "border-yellow-200 bg-yellow-50" :
                "border-gray-200 bg-gray-50"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    {/* Phase Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                      status === 'completed' ? "bg-green-100" :
                      status === 'in-progress' ? "bg-blue-100" :
                      status === 'preparing' ? "bg-yellow-100" :
                      "bg-gray-100"
                    )}>
                      <Icon className={cn(
                        "w-6 h-6",
                        status === 'completed' ? "text-green-600" :
                        status === 'in-progress' ? "text-blue-600" :
                        status === 'preparing' ? "text-yellow-600" :
                        "text-gray-400"
                      )} />
                    </div>

                    {/* Phase Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {phase.name}
                        </h3>
                        <Badge variant={getStatusColor(status)}>
                          {status === 'completed' ? 'Completed' :
                           status === 'in-progress' ? 'In Progress' :
                           status === 'preparing' ? 'Preparing' : 'Pending'}
                        </Badge>
                        {getStatusIcon(status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {phase.description}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Phase Progress</span>
                          <span>
                            {status === 'completed' ? '100%' :
                             status === 'in-progress' ? '65%' :
                             status === 'preparing' ? '25%' : '0%'}
                          </span>
                        </div>
                        <Progress 
                          value={status === 'completed' ? 100 :
                                 status === 'in-progress' ? 65 :
                                 status === 'preparing' ? 25 : 0}
                          className="h-2"
                        />
                      </div>
                    </div>

                    {/* Phase Stats */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {gates.filter(gate => {
                          const phaseMap = {
                            0: 'initiation',
                            1: 'planning', 
                            2: 'execution',
                            3: 'monitoring',
                            4: 'closure'
                          };
                          const phaseIndex = Object.keys(phaseMap).find(key => 
                            phaseMap[key] === phase.id
                          );
                          return gate.order === parseInt(phaseIndex);
                        }).length}
                      </div>
                      <div className="text-xs text-gray-500">Gates</div>
                    </div>
                  </div>

                  {/* Connection Arrow */}
                  {index < lifecyclePhases.length - 1 && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Project Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Project Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gates.map((gate, index) => (
              <motion.div
                key={gate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{gate.name}</h4>
                  <p className="text-sm text-gray-600">{gate.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="info">
                    {gate.criteria?.length || 0} Criteria
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectLifecycleVisualization;
