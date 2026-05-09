# Roma - Zoyantra Construction Performance Management System

## 🏗️ **Enhanced Construction Management Platform**

Roma is an advanced construction performance management system built with React, featuring comprehensive integration with Autodesk Platform Services (APS) and real-time data synchronization.

## ✨ **Key Features**

### **🔐 Enhanced Authentication**
- **Fixed AUTH-001 Error**: Proper environment variable configuration
- **OAuth 2.0 Integration**: Secure authentication with Autodesk services
- **Token Management**: Automatic token refresh and validation
- **Environment Testing**: Built-in utilities for debugging authentication

### **📊 Real-Time Data Synchronization**
- **Webhook Integration**: Real-time updates from APS services
- **Rate Limiting**: Intelligent API rate limit management
- **Live Data Service**: Automatic data refresh across all tabs
- **Event Monitoring**: Comprehensive webhook event tracking

### **📁 Advanced Document Management**
- **Enhanced Docs Tab**: Improved folder navigation and file operations
- **File Processing Status**: Real-time processing indicators
- **Breadcrumb Navigation**: Easy folder hierarchy navigation
- **Bulk Operations**: Multi-file selection and batch operations

### **🏗️ Project Lifecycle Control (PLC)**
- **Gates System**: Ordered gate progression with phase management
- **Document Attachment**: Link documents to specific gates
- **Review Workflow**: Integrated approval processes
- **Progress Tracking**: Visual gate completion status

### **👥 User Management**
- **Admin Tab**: Comprehensive user and permission management
- **Role-Based Access**: Admin and project member roles
- **Invitation System**: User invitation and onboarding
- **ACC Integration**: Direct integration with Autodesk Construction Cloud

### **📈 Performance Analytics**
- **Earned Value Management**: Advanced EVM calculations and S-curves
- **Resource Management**: Team load balancing and capacity planning
- **Budget Tracking**: Real-time budget monitoring and analysis
- **Cost Management**: Comprehensive expense and cost tracking

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 16+ 
- npm or yarn
- Autodesk Platform Services account
- APS application with required API products enabled

### **Environment Setup**
1. **Create `.env` file** in project root:
```env
REACT_APP_CLIENT_ID=your_client_id_here
REACT_APP_CLIENT_SECRET=your_client_secret_here
REACT_APP_ACCOUNT_ID=your_account_id_here
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm start
```

### **APS Configuration**
Enable these API products in your APS application:
- ✅ Data Management API
- ✅ Model Derivative API
- ✅ Object Storage Service (OSS)
- ✅ Webhooks API
- ✅ Cost Management API
- ✅ ACC Issues API
- ✅ ACC Project API

## 🛠️ **Architecture**

### **Core Services**
- **AccService**: Autodesk Construction Cloud integration
- **WebhookService**: Real-time event handling
- **RateLimitService**: API rate limit management
- **EnhancedAPIService**: Intelligent API wrapper

### **React Components**
- **Enhanced Docs Tab**: Advanced document management
- **PLC Tab**: Project lifecycle control
- **Admin Tab**: User and permission management
- **Webhook Integration**: Real-time data synchronization

### **Hooks & Utilities**
- **useWebhook**: Webhook event handling
- **useRateLimit**: Rate limit monitoring
- **envTest**: Environment variable testing

## 📚 **Documentation**

- **Setup Guide**: `SETUP_ENV_VARIABLES.md`
- **Rate Limiting**: `src/docs/RATE_LIMITING_GUIDE.md`
- **Webhook Integration**: `src/docs/WEBHOOK_INTEGRATION_GUIDE.md`
- **Enhanced Docs**: `src/docs/ENHANCED_DOCS_IMPLEMENTATION.md`

## 🔧 **Development**

### **Testing Environment Variables**
Use the built-in test button in the authentication screen to verify:
- Environment variable loading
- OAuth URL generation
- Scope configuration
- API connectivity

### **Debugging**
- **Console Logging**: Comprehensive debug information
- **Environment Testing**: Built-in variable validation
- **API Monitoring**: Real-time API status tracking
- **Error Handling**: Detailed error messages and solutions

## 🚀 **Deployment**

### **Production Environment**
1. Set up production environment variables
2. Configure webhook endpoints
3. Enable all required APS API products
4. Set up proper CORS and security headers

### **Environment Variables**
```env
REACT_APP_CLIENT_ID=production_client_id
REACT_APP_CLIENT_SECRET=production_client_secret
REACT_APP_ACCOUNT_ID=production_account_id
REACT_APP_WEBHOOK_URL=https://your-domain.com/webhooks
```

## 📈 **Performance Features**

- **Rate Limiting**: Intelligent API call management
- **Caching**: Optimized data storage and retrieval
- **Real-time Updates**: Webhook-driven data synchronization
- **Error Recovery**: Automatic retry and fallback mechanisms

## 🔒 **Security**

- **OAuth 2.0**: Secure authentication flow
- **Token Management**: Secure token storage and refresh
- **Environment Variables**: Secure credential management
- **CORS Configuration**: Proper cross-origin setup

## 📞 **Support**

For technical support and questions:
- Check the documentation in `src/docs/`
- Use the built-in environment testing utilities
- Review console logs for debugging information

## 🎯 **Repository Information**

- **Repository**: [Roma](https://github.com/AshkSaffari/Roma)
- **Visibility**: Private
- **Main Branch**: master
- **Latest Commit**: Enhanced authentication and webhook integration

---

**Roma** - Advanced Construction Performance Management with Real-Time APS Integration
