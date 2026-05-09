# APS Webhook Integration Guide

This guide explains how to implement real-time webhook integration with Autodesk Platform Services (APS) to keep your expense, D365, and EVM tabs live with real-time data updates.

## Overview

The webhook integration system provides real-time synchronization between APS services and your application tabs. It supports:

- **Cost Management Events**: Budget, expense, contract, and payment updates
- **Data Management Events**: File and folder operations
- **ACC Issues Events**: Issue creation, updates, and status changes
- **Model Derivative Events**: 3D model processing updates

## Architecture

```
APS Services → Webhook Events → Your Backend → Frontend Tabs
     ↓              ↓              ↓           ↓
Cost Management → Webhook → WebhookHandler → Tab Refresh
Data Management → Webhook → WebhookHandler → Tab Refresh
ACC Issues → Webhook → WebhookHandler → Tab Refresh
```

## Components

### 1. WebhookService (`src/services/WebhookService.js`)

The core service that handles webhook event processing and tab notifications.

**Key Features:**
- Event handler registration
- Wildcard pattern matching
- Tab refresh notifications
- Statistics tracking

**Usage:**
```javascript
import WebhookService from '../services/WebhookService';

const webhookService = new WebhookService();
await webhookService.initialize(credentials);
webhookService.registerAllHandlers();
```

### 2. useWebhook Hook (`src/hooks/useWebhook.js`)

React hook for easy webhook integration in components.

**Usage:**
```javascript
import useWebhook from '../hooks/useWebhook';

const MyComponent = ({ projectId, credentials }) => {
  const {
    isConnected,
    lastEvent,
    eventHistory,
    registerTabListener,
    createSubscription,
    deleteSubscription
  } = useWebhook(projectId, credentials);

  // Register tab listener
  useEffect(() => {
    const unsubscribe = registerTabListener('expense', (event) => {
      console.log('Expense tab updated:', event);
      // Refresh expense data
    });

    return unsubscribe;
  }, [registerTabListener]);

  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Last Event: {lastEvent?.eventType}</p>
    </div>
  );
};
```

### 3. WebhookIntegration Component (`src/components/WebhookIntegration.js`)

UI component for managing webhook subscriptions and monitoring events.

**Features:**
- Connection status display
- Event history tracking
- Subscription management
- Statistics dashboard

### 4. WebhookHandler (`src/utils/webhookHandler.js`)

Utility for processing webhook payloads and extracting relevant data.

## Supported Events

### Cost Management Events

| Event Type | Description | Affected Tabs |
|------------|-------------|---------------|
| `budget.created-1.0` | Budget created | Expense, EVM |
| `budget.updated-1.0` | Budget updated | Expense, EVM |
| `budget.deleted-1.0` | Budget deleted | Expense, EVM |
| `expense.created-1.0` | Expense created | Expense |
| `expense.updated-1.0` | Expense updated | Expense |
| `expense.deleted-1.0` | Expense deleted | Expense |
| `expenseItem.created-1.0` | Expense item created | Expense |
| `expenseItem.updated-1.0` | Expense item updated | Expense |
| `expenseItem.deleted-1.0` | Expense item deleted | Expense |
| `contract.created-1.0` | Contract created | Expense, EVM |
| `contract.updated-1.0` | Contract updated | Expense, EVM |
| `contract.deleted-1.0` | Contract deleted | Expense, EVM |
| `scheduleOfValue.created-1.0` | Schedule of value created | EVM |
| `scheduleOfValue.updated-1.0` | Schedule of value updated | EVM |
| `scheduleOfValue.deleted-1.0` | Schedule of value deleted | EVM |

### Data Management Events

| Event Type | Description | Affected Tabs |
|------------|-------------|---------------|
| `dm.version.added` | File version added | Docs |
| `dm.version.modified` | File version modified | Docs |
| `dm.version.deleted` | File version deleted | Docs |
| `dm.folder.added` | Folder added | Docs |
| `dm.folder.modified` | Folder modified | Docs |
| `dm.folder.deleted` | Folder deleted | Docs |
| `dm.operation.started` | Operation started | Docs |
| `dm.operation.completed` | Operation completed | Docs |

### ACC Issues Events

| Event Type | Description | Affected Tabs |
|------------|-------------|---------------|
| `issue.created-1.0` | Issue created | Issues |
| `issue.updated-1.0` | Issue updated | Issues |
| `issue.deleted-1.0` | Issue deleted | Issues |
| `issue.restored-1.0` | Issue restored | Issues |
| `issue.unlinked-1.0` | Issue unlinked | Issues |

## Implementation Steps

### 1. Backend Webhook Endpoint

Create a webhook endpoint in your backend to receive APS webhook events:

```javascript
// Express.js example
app.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const headers = req.headers;
    
    // Process webhook payload
    await webhookHandler.processWebhookPayload(payload, headers);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

### 2. Frontend Integration

Integrate webhook functionality into your tabs:

```javascript
// ExpenseTab.js
import useWebhook from '../hooks/useWebhook';

const ExpenseTab = ({ selectedProject, credentials }) => {
  const { registerTabListener } = useWebhook(selectedProject?.id, credentials);
  const [expenses, setExpenses] = useState([]);

  // Listen for expense-related webhook events
  useEffect(() => {
    const unsubscribe = registerTabListener('expense', (event) => {
      console.log('Expense webhook event:', event);
      
      // Refresh expenses based on event type
      switch (event.eventType) {
        case 'expense.created-1.0':
          // Add new expense to list
          break;
        case 'expense.updated-1.0':
          // Update existing expense
          break;
        case 'expense.deleted-1.0':
          // Remove expense from list
          break;
        default:
          // Refresh all expenses
          loadExpenses();
      }
    });

    return unsubscribe;
  }, [registerTabListener]);

  return (
    <div>
      {/* Expense tab content */}
    </div>
  );
};
```

### 3. Webhook Subscription Management

Use the WebhookIntegration component to manage subscriptions:

```javascript
import WebhookIntegration from '../components/WebhookIntegration';

const App = () => {
  const handleTabRefresh = (tabName, event) => {
    console.log(`Refreshing ${tabName} tab due to ${event.eventType}`);
    // Implement tab-specific refresh logic
  };

  return (
    <div>
      <WebhookIntegration
        selectedProject={selectedProject}
        selectedHub={selectedHub}
        credentials={credentials}
        onTabRefresh={handleTabRefresh}
      />
    </div>
  );
};
```

## Wildcard Pattern Matching

The webhook system supports wildcard patterns for flexible event filtering:

| Pattern | Description | Matches |
|---------|-------------|---------|
| `*` | All events | All events |
| `dm.operation*` | All operation events | `dm.operation.started`, `dm.operation.completed` |
| `*.added` | All added events | `dm.version.added`, `dm.folder.added` |
| `dm.*.modified` | All modified events | `dm.version.modified`, `dm.folder.modified` |
| `autodesk.construction.cost.budget.*` | All budget events | `budget.created-1.0`, `budget.updated-1.0`, `budget.deleted-1.0` |

## Security Considerations

### 1. Webhook Signature Validation

Implement signature validation to ensure webhook authenticity:

```javascript
const crypto = require('crypto');

function validateWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 2. Rate Limiting

Implement rate limiting to prevent webhook spam:

```javascript
const rateLimit = require('express-rate-limit');

const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests'
});

app.use('/webhook', webhookRateLimit);
```

## Monitoring and Debugging

### 1. Event History

Track webhook events for debugging:

```javascript
const { eventHistory } = useWebhook(projectId, credentials);

console.log('Recent events:', eventHistory);
```

### 2. Statistics

Monitor webhook performance:

```javascript
const { statistics } = useWebhook(projectId, credentials);

console.log('Webhook statistics:', statistics);
```

### 3. Error Handling

Implement proper error handling:

```javascript
try {
  await processWebhookPayload(payload);
} catch (error) {
  console.error('Webhook processing error:', error);
  // Implement retry logic or dead letter queue
}
```

## Testing

### 1. Test Webhook Payloads

Use the test functionality to verify webhook processing:

```javascript
const { processPayload } = useWebhook(projectId, credentials);

// Test expense creation
const testPayload = {
  eventType: 'autodesk.construction.cost.expense.created-1.0',
  system: 'autodesk.construction.cost',
  data: {
    expenseId: 'test-123',
    amount: 1000.00,
    status: 'pending'
  }
};

await processPayload(testPayload);
```

### 2. Local Development

For local development, use tools like ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the ngrok URL as your webhook callback URL
```

## Best Practices

1. **Idempotency**: Ensure webhook processing is idempotent to handle duplicate events
2. **Error Handling**: Implement proper error handling and retry logic
3. **Logging**: Log all webhook events for debugging
4. **Security**: Validate webhook signatures and implement rate limiting
5. **Performance**: Use efficient data structures and avoid blocking operations
6. **Monitoring**: Monitor webhook success rates and response times

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check callback URL and authentication
2. **Duplicate events**: Implement idempotency checks
3. **Performance issues**: Optimize event processing and use async operations
4. **Authentication errors**: Verify credentials and token validity

### Debug Tools

- Use browser developer tools to monitor webhook events
- Check network tab for webhook requests
- Monitor console logs for event processing
- Use webhook testing tools like webhook.site

## References

- [APS Webhooks Documentation](https://aps.autodesk.com/en/docs/webhooks/v1/reference/)
- [APS .NET SDK](https://www.nuget.org/packages/Autodesk.Webhooks)
- [Webhook Security Best Practices](https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks)
