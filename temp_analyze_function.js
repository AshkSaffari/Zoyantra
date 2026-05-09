  // Enhanced review status analysis using two-step API approach
  const analyzeReviewStatus = (review, workflowData, progressData, versionsData) => {
    console.log(`🔍 Analyzing review status for: ${review.name}`);
    console.log(`📊 Versions data:`, versionsData);
    console.log(`📊 Progress data:`, progressData);
    
    // Step 1: Analyze file-level approval status from /versions API
    const fileVersions = versionsData?.results || [];
    const fileAnalysis = fileVersions.map(file => {
      const approveStatus = file.approveStatus;
      const statusValue = approveStatus?.value;
      const statusLabel = approveStatus?.label;
      
      console.log(`📄 File: ${file.name || file.reviewContent?.name}`);
      console.log(`📄 Status Value: ${statusValue}`);
      console.log(`📄 Status Label: ${statusLabel}`);
      
      return {
        fileName: file.name || file.reviewContent?.name,
        statusValue,
        statusLabel,
        urn: file.urn,
        itemUrn: file.itemUrn,
        customAttributes: file.reviewContent?.customAttributes || [],
        copiedFileVersionUrn: file.copiedFileVersionUrn
      };
    });
    
    // Step 2: Analyze workflow progress from /progress API
    const progressSteps = progressData?.results || [];
    const progressAnalysis = progressSteps.map(step => {
      console.log(`🔄 Step: ${step.stepName}`);
      console.log(`🔄 Status: ${step.status}`);
      console.log(`🔄 Action By: ${step.actionBy?.name}`);
      console.log(`🔄 Notes: ${step.notes}`);
      
      return {
        stepId: step.stepId,
        stepName: step.stepName,
        status: step.status,
        claimedBy: step.claimedBy,
        actionBy: step.actionBy,
        candidates: step.candidates,
        endTime: step.endTime,
        notes: step.notes
      };
    });
    
    // Determine comprehensive status based on both APIs
    const approvedFiles = fileAnalysis.filter(file => 
      file.statusValue === 'APPROVED' || file.statusLabel?.toLowerCase().includes('approved')
    );
    const rejectedFiles = fileAnalysis.filter(file => 
      file.statusValue === 'REJECTED' || file.statusLabel?.toLowerCase().includes('rejected')
    );
    const pendingFiles = fileAnalysis.filter(file => 
      !file.statusValue || file.statusValue === 'PENDING' || file.statusValue === 'SUBMITTED'
    );
    const totalFiles = fileAnalysis.length;
    
    // Check if workflow is completed
    const workflowCompleted = progressSteps.some(step => 
      step.status === 'COMPLETED' || step.status === 'APPROVED'
    );
    
    // Check for comments/notes
    const hasComments = progressSteps.some(step => step.notes && step.notes.trim().length > 0);
    const allComments = progressSteps
      .filter(step => step.notes && step.notes.trim().length > 0)
      .map(step => ({
        stepName: step.stepName,
        actionBy: step.actionBy?.name,
        notes: step.notes,
        endTime: step.endTime
      }));
    
    console.log(`📊 File Analysis: ${approvedFiles.length} approved, ${rejectedFiles.length} rejected, ${pendingFiles.length} pending`);
    console.log(`📊 Workflow completed: ${workflowCompleted}`);
    console.log(`📊 Has comments: ${hasComments}`);
    
    // Determine overall status with enhanced logic
    let status = 'submitted';
    let needsResubmission = false;
    let statusReason = '';
    
    if (rejectedFiles.length > 0) {
      status = 'rejected';
      needsResubmission = true;
      statusReason = `${rejectedFiles.length} file(s) rejected`;
      console.log(`❌ Review rejected: ${statusReason}`);
    } else if (approvedFiles.length === totalFiles && totalFiles > 0) {
      if (workflowCompleted) {
        status = 'approved';
        statusReason = 'All files approved and workflow completed';
        console.log(`✅ Review fully approved: ${statusReason}`);
      } else {
        status = 'approved-pending-workflow';
        statusReason = 'All files approved, waiting for workflow completion';
        console.log(`⏳ Review approved but workflow pending: ${statusReason}`);
      }
    } else if (approvedFiles.length > 0) {
      status = 'partially-approved';
      statusReason = `${approvedFiles.length}/${totalFiles} files approved`;
      console.log(`🔄 Review partially approved: ${statusReason}`);
    } else if (pendingFiles.length > 0) {
      status = 'in-progress';
      statusReason = `${pendingFiles.length} file(s) pending review`;
      console.log(`🔄 Review in progress: ${statusReason}`);
    } else {
      status = mapBasicReviewStatus(review.status);
      statusReason = `Basic status mapping: ${review.status}`;
      console.log(`📊 Using basic status: ${statusReason}`);
    }
    
    return {
      status,
      needsResubmission,
      statusReason,
      workflowCompleted,
      hasComments,
      comments: allComments,
      fileAnalysis: {
        total: totalFiles,
        approved: approvedFiles.length,
        rejected: rejectedFiles.length,
        pending: pendingFiles.length,
        files: fileAnalysis
      },
      progressAnalysis: {
        totalSteps: progressSteps.length,
        completedSteps: progressSteps.filter(s => s.status === 'COMPLETED' || s.status === 'APPROVED').length,
        steps: progressAnalysis
      },
      analysis: {
        reviewStatus: review.status,
        workflowData: !!workflowData,
        progressData: !!progressData,
        versionsData: !!versionsData,
        timestamp: new Date().toISOString()
      }
    };
  };
