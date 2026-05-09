      {/* Task Creation Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
        <form onSubmit={handleAddTask}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> Task Name
              </label>
              <input
                type="text"
                name="taskName"
                value={formData.taskName}
                onChange={handleInputChange}
                placeholder="Enter task name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter task description"
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2 flex justify-end">
              {(() => {
                const warnings = getBudgetValidationWarnings();
                const isDisabled = warnings.isOverLimit;
                return (
                  <button 
                    type="submit" 
                    disabled={isDisabled}
                    className={`px-6 py-2 rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 ${
                      isDisabled 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                    title={isDisabled ? 'Cannot create task: would exceed budget limits' : 'Add new task'}
                  >
                    <Plus className="w-4 h-4" /> 
                    {isDisabled ? 'Budget Limit Exceeded' : 'Add Task'}
                  </button>
                );
              })()}
            </div>
          </div>
        </form>
      </div>
