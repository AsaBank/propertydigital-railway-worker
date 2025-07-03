# Base44 Quick Start Guide

## 🚀 Connect Your Base44 Account in 5 Minutes

### Step 1: Set Up Environment Variables

1. In your Railway project, go to **Variables** tab
2. Add these environment variables:
   ```
   BASE44_API_KEY=generate-a-secure-api-key
   BASE44_APP_ID=6863ae20dd6524ba8560bd9c
   ```

### Step 2: Configure Base44 External API

1. Open your Base44 app: https://app.base44.com/apps/6863ae20dd6524ba8560bd9c/editor
2. Navigate to **Settings** → **External APIs**
3. Click **Add External API**
4. Configure as follows:
   - **Name**: PropertyDigital Railway
   - **Base URL**: `https://your-app.railway.app` (get this from Railway dashboard)
   - **Headers**:
     ```json
     {
       "Content-Type": "application/json",
       "x-api-key": "your-api-key-from-step-1"
     }
     ```

### Step 3: Test the Connection

1. In Base44, create a test function:
   ```javascript
   async function testConnection() {
     const response = await externalAPI.propertyDigitalRailway.get('/health');
     return response.data;
   }
   ```

2. Run the function. You should see:
   ```json
   {
     "status": "healthy",
     "mongodb": "connected",
     "base44_integration": {
       "enabled": true,
       "app_id": "6863ae20dd6524ba8560bd9c"
     }
   }
   ```

### Step 4: Create Your First Integration

**Example: Import Payments from Base44**

1. In Base44, create a new action:
   ```javascript
   async function syncPaymentsToMongoDB() {
     // Get payments from your Base44 data
     const payments = await db.payments.find({
       synced: { $ne: true }
     }).limit(100);
     
     // Send to Railway Worker
     const response = await externalAPI.propertyDigitalRailway.post('/api/massive-import', {
       entityType: 'Payment',
       records: payments.map(p => ({
         tenant_id: p.tenantId,
         property_id: p.propertyId,
         amount: p.amount,
         payment_date: p.date,
         payment_type: p.type || 'rent',
         status: p.status || 'pending'
       })),
       userId: currentUser.id
     });
     
     // Mark as synced
     if (response.data.status === 'completed') {
       await db.payments.updateMany(
         { _id: { $in: payments.map(p => p._id) } },
         { $set: { synced: true, syncedAt: new Date() } }
       );
     }
     
     return response.data;
   }
   ```

2. Set up an automation to run this periodically or on-demand

### Step 5: Set Up Webhooks (Optional)

1. In Base44, go to **Automations** → **Webhooks**
2. Create a webhook:
   - **URL**: `https://your-app.railway.app/webhook/base44`
   - **Events**: Record Created, Record Updated
   - **Headers**: 
     ```json
     {
       "x-api-key": "your-api-key"
     }
     ```

## 📊 Available Integrations

### 1. Data Sync
- **Import to MongoDB**: `/api/massive-import`
- **Fetch from MongoDB**: `/api/sync/:entityType`
- **Get Schema**: `/api/schema/:entityType`

### 2. Supported Entity Types
- `Payment` - Rental payments and utilities
- `Tenant` - Tenant information
- `Property` - Property details

### 3. Hebrew Field Mapping
The Railway Worker automatically translates Hebrew fields:
- `מזהה דייר` → `tenant_id`
- `סכום` → `amount`
- `תאריך תשלום` → `payment_date`
- And more...

## 🛠️ Troubleshooting

### Connection Failed?
1. Check your Railway app is deployed and running
2. Verify the API key matches in both systems
3. Check Railway logs: `railway logs`

### Data Not Syncing?
1. Verify field mappings match expected format
2. Check response for error details
3. Ensure MongoDB is connected (check `/health` endpoint)

### CORS Issues?
Add to your Railway variables:
```
ALLOWED_ORIGINS=https://app.base44.com
```

## 📚 Next Steps

1. Review the full integration guide: `base44-integration.md`
2. Customize the endpoints in `base44-endpoints.js`
3. Add more entity types as needed
4. Set up monitoring and alerts

## 🆘 Need Help?

- Check Railway Worker health: `https://your-app.railway.app/health`
- View available endpoints: `https://your-app.railway.app/404`
- Check logs in Railway dashboard
- Review MongoDB connection in Railway variables