# 🏗️ Melbourne - Zoyantra Construction Management App

A comprehensive construction management application built with React, featuring seamless Autodesk Construction Cloud (ACC) integration, timesheet management, expense tracking, project analytics, and **Project Life Cycle (PLC) management**.

## 🚀 Key Features

### 🔐 Authentication & Security
- **OAuth 2.0 Integration** with Autodesk Construction Cloud
- **Secure token management** with automatic refresh
- **Multi-region support** (US, APAC, EMEA)
- **Comprehensive data clearing** functionality

### 📊 Project Management
- **Hub & Project Selection** with comprehensive detection
- **Task Management** with archiving and restoration
- **Phase Management** for project organization
- **Resource Management** with crew assignments

### ⏰ Timesheet Management
- **Individual Timesheet Entry** with validation
- **Bulk Timesheet Operations** with selection tools
- **Automatic Archiving** after ACC sync
- **CSV Export** functionality
- **Real-time Validation** and error handling

### 💰 Expense Management
- **Expense Creation** from timesheet data
- **Budget Integration** with ACC Cost Management
- **Expense Tracking** with status management
- **Financial Reporting** and analytics

### 📈 Analytics & Reporting
- **Earned Value Management (EVM)** calculations
- **Site Progress Tracking** with visual indicators
- **Cost Performance Index (CPI)** and **Schedule Performance Index (SPI)**
- **Budget vs. Actual** analysis
- **PDF Export** capabilities

### 👥 Crew Management
- **Member Management** with role assignments
- **Hourly Rate Configuration** per member
- **Crew Organization** and assignment
- **Performance Tracking** integration

### 🎯 **Project Life Cycle (PLC) Management**
- **Gate Management**: Create, edit, delete project gates
- **Status Tracking**: Locked, Open, In Progress, Completed states
- **File Management**: Upload and manage required files for each gate
- **Progress Tracking**: Visual progress bars and completion percentages
- **Review Workflow**: Send gates to review with document management
- **Phase Organization**: Organize gates by project phases
- **Statistics Dashboard**: Overview of gate completion status

## 🛠️ Technology Stack

- **Frontend**: React 18 with Hooks
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context & Local Storage
- **API Integration**: Autodesk Construction Cloud APIs
- **Build Tool**: Create React App
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Autodesk Construction Cloud account
- Valid ACC project access

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AshkSaffari/melbourne.git
   cd melbourne
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `src/config/auth.js` with your Autodesk app credentials
   - Ensure OAuth redirect URI is set to `http://localhost:3000/auth/callback`

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Sign in with your Autodesk account

## 🔧 Configuration

### OAuth Setup
The app uses OAuth 2.0 for authentication. Configure your Autodesk app with:
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **Scopes**: `data:read data:write account:read account:write user-profile:read`

### API Endpoints
- **Authentication**: `https://developer.api.autodesk.com/authentication/v2/`
- **Project API**: `https://developer.api.autodesk.com/project/v1/`
- **Construction Admin API**: `https://developer.api.autodesk.com/construction/admin/v1/`

## 📱 Usage

### Getting Started
1. **Sign In** with your Autodesk account
2. **Select a Hub** from available options
3. **Choose a Project** to work with
4. **Navigate** between tabs for different features

### Timesheet Management
1. Go to **Timesheets** tab
2. **Add new entries** with task details
3. **Select multiple entries** for bulk operations
4. **Sync to ACC** for Performance Tracking integration
5. **Export to CSV** for external reporting

### Expense Management
1. Go to **Expenses** tab
2. **Create expenses** from timesheet data
3. **Track expense status** and amounts
4. **Manage archived expenses** with restore/delete options

### Project Analytics
1. Go to **EV** tab for EVM calculations
2. Use **Gantt Chart** tab for project visualization
3. Access **Crew** for team organization

### **Project Life Cycle Management**
1. Go to **PLC** tab
2. **Create gates** for different project phases
3. **Upload required files** for each gate
4. **Track progress** with visual indicators
5. **Send to review** when ready for approval

## 🔒 Security Features

- **Token Encryption** in localStorage
- **Automatic Token Refresh** before expiration
- **Secure API Communication** with HTTPS
- **Data Validation** on all inputs
- **Error Handling** with user-friendly messages

## 🧹 Data Management

### Clear All Data
Use the **"Clear ALL Data"** button to:
- Remove all authentication tokens
- Clear all timesheet and expense data
- Reset project and member caches
- Restore app to initial state

### Data Persistence
- **Local Storage**: Timesheets, expenses, project data, PLC gates
- **Session Storage**: Temporary OAuth state
- **ACC Integration**: Real-time data synchronization

## 🐛 Troubleshooting

### Common Issues
1. **Authentication Errors**: Clear authentication and sign in again
2. **No Hubs/Projects**: Check ACC permissions and region settings
3. **Sync Failures**: Verify project has Cost Management enabled
4. **Data Not Loading**: Use "Clear ALL Data" and restart

### Debug Mode
- Check browser console for detailed logs
- Use network tab to monitor API calls
- Verify OAuth scopes and permissions

## 📊 Performance

- **Lazy Loading** for large datasets
- **Caching** for frequently accessed data
- **Optimized API Calls** with batching
- **Memory Management** with cleanup functions
- **Responsive Design** with mobile-friendly navigation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or questions:
- Check the troubleshooting section
- Review browser console for errors
- Ensure ACC permissions are correct

## 🎯 Roadmap

- [x] Enhanced reporting features
- [x] Project Life Cycle management
- [x] Responsive navigation design
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Offline mode capabilities

---

**Melbourne** - Built for modern construction management with Autodesk Construction Cloud integration and comprehensive project life cycle management.

## 🔗 Repository

**GitHub**: https://github.com/AshkSaffari/melbourne

**Live Demo**: Available upon request
