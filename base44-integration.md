# Base44 Integration Guide for PropertyDigital Railway Worker

## Overview
This guide will help you connect your Base44 account (App ID: 6863ae20dd6524ba8560bd9c) with your PropertyDigital Railway Worker backend.

## Integration Methods

### Method 1: API Integration (Recommended)

Base44 can communicate with your Railway Worker API endpoints. Here's how to set it up:

#### 1. Configure Base44 API Connections

In your Base44 app:
1. Go to **Settings** → **External APIs**
2. Add a new API connection:
   - **Name**: PropertyDigital Railway Worker
   - **Base URL**: `https://your-railway-app-url.railway.app` (replace with your actual Railway URL)
   - **Headers**: 
     ```json
     {
       "Content-Type": "application/json"
     }
     ```

#### 2. Available Endpoints

Your Railway Worker exposes these endpoints that Base44 can use:

```
GET  /health              - Health check
GET  /test                - Test endpoint
POST /api/massive-import  - Import records (tenants, properties, payments)
GET  /api/job-status/:id  - Check import job status
```

#### 3. Setting up Data Actions in Base44

**For importing data to MongoDB:**
```javascript
// Base44 Custom Action
async function importToMongoDB(entityType, records) {
  const response = await fetch('https://your-railway-app.railway.app/api/massive-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-job-id': generateUUID() // Base44 can generate this
    },
    body: JSON.stringify({
      entityType: entityType, // 'Payment', 'Tenant', 'Property'
      records: records,
      userId: currentUser.id
    })
  });
  
  return await response.json();
}
```

### Method 2: Direct MongoDB Connection

If you prefer Base44 to connect directly to your MongoDB:

1. In Base44, go to **Data Sources** → **Add Database**
2. Select **MongoDB**
3. Use your MongoDB connection string from Railway environment variables
4. Configure collections: `payment`, `tenant`, `property`

### Method 3: Webhook Integration

Set up webhooks to trigger Railway Worker from Base44 events:

1. In Base44, go to **Automations** → **Webhooks**
2. Create webhooks for events like:
   - New record created
   - Record updated
   - Bulk import requested

## Authentication Setup

To secure the connection between Base44 and Railway Worker:

### Option 1: API Key Authentication

1. Update your Railway Worker to accept API keys:

```javascript
// Add this middleware to server.js
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.BASE44_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Apply to protected routes
app.post('/api/massive-import', apiKeyAuth, async (req, res) => {
  // ... existing code
});
```

2. In Railway, set environment variable:
   ```
   BASE44_API_KEY=your-secret-api-key-here
   ```

3. In Base44, add the API key to your connection headers:
   ```json
   {
     "Content-Type": "application/json",
     "x-api-key": "your-secret-api-key-here"
   }
   ```

### Option 2: OAuth2 Integration

For more secure authentication, implement OAuth2 flow between Base44 and Railway Worker.

## Implementation Examples

### 1. Enhanced Server Code with Base44 Support

Create a new file `base44-endpoints.js`:

```javascript
const express = require('express');
const router = express.Router();

// Base44 webhook receiver
router.post('/webhook/base44', async (req, res) => {
  const { event, data, timestamp } = req.body;
  
  console.log(`📨 Base44 webhook received: ${event}`);
  
  try {
    switch (event) {
      case 'record.created':
        // Process new record from Base44
        await processNewRecord(data);
        break;
      
      case 'bulk.import':
        // Handle bulk import request
        await handleBulkImport(data);
        break;
      
      default:
        console.log(`Unknown event: ${event}`);
    }
    
    res.json({ status: 'received', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Base44 data sync endpoint
router.get('/api/sync/:entityType', async (req, res) => {
  const { entityType } = req.params;
  const { lastSync, limit = 100 } = req.query;
  
  try {
    const query = lastSync ? { updated_at: { $gt: new Date(lastSync) } } : {};
    const records = await db.collection(entityType.toLowerCase())
      .find(query)
      .limit(parseInt(limit))
      .toArray();
    
    res.json({
      entityType,
      records,
      count: records.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 2. Base44 Custom Functions

Add these custom functions in your Base44 app:

```javascript
// Function to sync data from Railway Worker
async function syncFromRailway(entityType) {
  const lastSync = await getValue('lastSync_' + entityType) || '2024-01-01';
  
  const response = await externalAPI.railwayWorker.get(`/api/sync/${entityType}`, {
    params: { lastSync, limit: 500 }
  });
  
  if (response.data.records.length > 0) {
    await bulkUpsert(entityType, response.data.records, 'id');
    await setValue('lastSync_' + entityType, response.data.timestamp);
  }
  
  return response.data;
}

// Function to push data to Railway Worker
async function pushToRailway(entityType, records) {
  const chunks = chunkArray(records, 100); // Split into chunks
  const results = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const response = await externalAPI.railwayWorker.post('/api/massive-import', {
      entityType,
      records: chunks[i],
      userId: currentUser.id,
      isChunk: chunks.length > 1,
      chunkIndex: i + 1,
      totalChunks: chunks.length
    }, {
      headers: {
        'x-job-id': generateUUID(),
        'x-chunk-info': `${i + 1}/${chunks.length}`
      }
    });
    
    results.push(response.data);
  }
  
  return results;
}
```

## Environment Variables

Add these to your Railway Worker:

```bash
# Railway environment variables
MONGODB_URI=mongodb+srv://...
PORT=8080
BASE44_API_KEY=your-secret-key
BASE44_APP_ID=6863ae20dd6524ba8560bd9c
BASE44_WEBHOOK_SECRET=webhook-secret

# CORS settings for Base44
ALLOWED_ORIGINS=https://app.base44.com,https://your-base44-custom-domain.com
```

## Testing the Integration

1. **Test API Connection:**
   ```bash
   curl -X GET https://your-railway-app.railway.app/health \
     -H "x-api-key: your-secret-key"
   ```

2. **Test Data Import:**
   ```bash
   curl -X POST https://your-railway-app.railway.app/api/massive-import \
     -H "Content-Type: application/json" \
     -H "x-api-key: your-secret-key" \
     -d '{
       "entityType": "Payment",
       "records": [{
         "tenant_id": "123",
         "amount": 1000,
         "payment_date": "2024-01-15"
       }],
       "userId": "base44-user"
     }'
   ```

## Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Ensure your Railway Worker has proper CORS configuration
   - Add Base44 domains to allowed origins

2. **Authentication Failures:**
   - Verify API key is correctly set in both systems
   - Check request headers in Base44 configuration

3. **Data Format Issues:**
   - Ensure field mappings match between Base44 and MongoDB
   - Use the translation helpers for Hebrew fields

4. **Connection Timeouts:**
   - Check Railway app is running and accessible
   - Verify MongoDB connection string is correct

## Next Steps

1. Set up your Railway Worker environment variables
2. Configure Base44 external API connection
3. Create custom actions in Base44 for data operations
4. Test the integration with sample data
5. Set up monitoring and error handling

For more help, refer to:
- [Base44 Documentation](https://docs.base44.com)
- [Railway Documentation](https://docs.railway.app)
- Your PropertyDigital Railway Worker logs at `/health` endpoint