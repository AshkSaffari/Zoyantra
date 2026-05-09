# 🏗️ Final-100: Zoyantra Construction Cloud

A comprehensive construction project management application with advanced features for Autodesk Construction Cloud (ACC) integration, gate management, and review workflows.

## 🚀 **Key Features**

### 📋 **Project Lifecycle Control (PLC)**
- **Modern Gate Management**: Create and manage project gates with criteria
- **Phase Management**: Organize gates by project phases
- **File Selection**: ACC file browser integration for criteria
- **Workflow Integration**: Connect gates to approval workflows
- **Progress Tracking**: Real-time gate progress based on approvals

### 🔍 **ACC Integration**
- **File Browser**: Modern, flashy UI for browsing ACC documents
- **Version Management**: Automatic version URN conversion
- **Project Selection**: Hub and project management
- **Authentication**: 3-legged OAuth token support

### 📊 **Review Management**
- **Review Creation**: Create reviews with file and workflow selection
- **API Integration**: Direct ACC Reviews API integration
- **Preview Mode**: Test API calls before execution
- **Error Handling**: Comprehensive error management

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works on desktop and mobile
- **Colorful Interface**: Windows-style modern design
- **Interactive Elements**: Hover effects and animations
- **Progress Visualization**: Charts and progress bars

## 🛠️ **Technical Stack**

- **Frontend**: React 18 with modern hooks
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Charts**: Recharts for data visualization
- **Backend**: Node.js/Express proxy server
- **API**: Autodesk Construction Cloud APIs

## 📁 **Project Structure**

```
src/
├── components/
│   ├── plc.js                          # Main PLC component
│   ├── ModernGateManager.js            # Gate management system
│   ├── ModernDashboard.js              # Dashboard visualization
│   ├── AccFolderBrowser.js             # ACC file browser
│   ├── ProjectLifecycleVisualization.js # PLC visualization
│   ├── ReminderTab.js                  # Project reminders
│   └── ui/                             # Reusable UI components
│       ├── Card.js
│       ├── Badge.js
│       └── Progress.js
├── services/
│   ├── AccService.js                   # ACC API service
│   └── AccService_old.js               # Legacy ACC service
├── utils/
│   └── cn.js                          # Utility functions
└── App.js                             # Main application
```

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 16+ 
- npm or yarn
- Autodesk Construction Cloud account
- ACC project with appropriate permissions

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/AshkSaffari/Final-100.git
   cd Final-100
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 **Configuration**

### **Environment Variables**
Create a `.env` file in the root directory:

```env
REACT_APP_ACC_CLIENT_ID=your_client_id
REACT_APP_ACC_CLIENT_SECRET=your_client_secret
REACT_APP_ACC_CALLBACK_URL=http://localhost:3000/callback
```

### **ACC Setup**
1. Create an ACC application in the Autodesk Developer Portal
2. Configure OAuth 2.0 settings
3. Set up webhook endpoints (if needed)
4. Obtain necessary API permissions

## 📋 **Usage**

### **PLC System**
1. **Select Project**: Choose your ACC project
2. **Create Phases**: Define project phases
3. **Add Gates**: Create gates within phases
4. **Define Criteria**: Add review criteria with file selection
5. **Select Workflows**: Connect approval workflows
6. **Send for Review**: Submit gates for approval

### **File Management**
1. **Browse Files**: Use the ACC file browser
2. **Select Files**: Choose files for criteria
3. **Version Handling**: Automatic version URN conversion
4. **File Information**: View file details and metadata

### **Review Creation**
1. **Preview API**: Test API calls before execution
2. **Create Reviews**: Submit reviews to ACC
3. **Track Progress**: Monitor review status
4. **Handle Errors**: Comprehensive error management

## 🔐 **Security**

- **Private Repository**: Secure code storage
- **OAuth 2.0**: Secure authentication
- **Token Management**: Secure token storage
- **API Security**: Proper API key management

## 📊 **Features Overview**

### **Gate Management**
- ✅ Create, edit, delete gates
- ✅ Phase-based organization
- ✅ Criteria with file selection
- ✅ Workflow integration
- ✅ Progress tracking

### **ACC Integration**
- ✅ File browsing
- ✅ Project selection
- ✅ Version management
- ✅ Review creation
- ✅ API integration

### **UI/UX**
- ✅ Modern design
- ✅ Responsive layout
- ✅ Interactive elements
- ✅ Progress visualization
- ✅ Error handling

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Authentication Errors**
   - Check ACC credentials
   - Verify OAuth configuration
   - Ensure proper permissions

2. **File Selection Issues**
   - Verify project access
   - Check file permissions
   - Ensure proper URN format

3. **API Errors**
   - Check network connection
   - Verify API endpoints
   - Review error messages

### **Debug Mode**
Enable debug logging by opening browser console and looking for:
- `🔍` - General debugging
- `📦` - API payloads
- `✅` - Success messages
- `❌` - Error messages

## 📈 **Performance**

- **Optimized Rendering**: React 18 with concurrent features
- **Efficient API Calls**: Cached responses and smart loading
- **Responsive Design**: Mobile-first approach
- **Fast Loading**: Optimized bundle size

## 🤝 **Contributing**

This is a private repository. For contributions or issues, please contact the repository owner.

## 📄 **License**

Private repository - All rights reserved.

## 🎯 **Version History**

### **Final-100 (Current)**
- ✅ Complete PLC system implementation
- ✅ Modern gate management
- ✅ ACC file browser integration
- ✅ Review creation workflow
- ✅ Modern UI/UX design
- ✅ Comprehensive error handling

---

**Final-100** - Complete construction project management solution with ACC integration and modern PLC system.

**Repository**: https://github.com/AshkSaffari/Final-100
**Status**: Private
**Last Updated**: December 2024