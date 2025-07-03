# Base 44 Connection Setup Guide

This guide will help you connect your PropertyDigital Railway Worker to your Base 44 account.

## 🎯 Supported Base 44 Services

The system automatically detects which Base service you're using based on your environment variables:

### 1. **Basebear Database API**
If you're using Basebear (cloud database service):
```bash
BASEBEAR_API_KEY=your_basebear_api_key_here
BASEBEAR_DATABASE_ID=your_database_id_here
```

### 2. **Base Blockchain Network**
If you're using Base blockchain (Ethereum L2):
```bash
BASE_RPC_URL=https://mainnet.base.org
BASE_PRIVATE_KEY=your_private_key_here
BASE_NETWORK=mainnet
BASE_CONTRACT_ADDRESS=your_contract_address_here
```

### 3. **Custom Base 44 API**
If you're using a custom Base 44 API service:
```bash
BASE44_API_URL=https://api.base44.com
BASE44_API_KEY=your_api_key_here
BASE44_USERNAME=your_username_here
BASE44_PASSWORD=your_password_here
```

## 🚀 Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your Base 44 credentials:**
   Edit the `.env` file with your actual credentials (choose one option above).

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## 🧪 Testing Your Connection

### Health Check
Check overall system status including Base 44:
```bash
GET /health
```

### Base 44 Connection Test
Test your Base 44 connection specifically:
```bash
GET /api/base44/test
```

Example response:
```json
{
  "status": "connected",
  "type": "basebear",
  "connected": true,
  "service": "Basebear Database API",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 📊 Syncing Data to Base 44

### Sync Property Data
Send data to your Base 44 service:

```bash
POST /api/base44/sync
Content-Type: application/json

{
  "entityType": "Property",
  "data": [
    {
      "property_id": "PROP001",
      "address": "123 Main St",
      "tenant_id": "TENANT001",
      "rent_amount": 1500
    }
  ]
}
```

### Sync Payment Data
```bash
POST /api/base44/sync
Content-Type: application/json

{
  "entityType": "Payment",
  "data": [
    {
      "tenant_id": "TENANT001",
      "property_id": "PROP001",
      "amount": 1500,
      "payment_date": "2024-01-01",
      "payment_type": "rent",
      "status": "paid"
    }
  ]
}
```

## 🔧 Configuration Details

### For Basebear API:
1. **Get API Key:** Login to Basebear → Settings → API Keys
2. **Find Database ID:** Use the `/databases` endpoint or check your dashboard
3. **Set Environment Variables:**
   ```bash
   BASEBEAR_API_KEY=your_actual_api_key
   BASEBEAR_DATABASE_ID=your_database_uuid
   ```

### For Base Blockchain:
1. **Get RPC URL:** Use `https://mainnet.base.org` for mainnet
2. **Private Key:** Your wallet's private key (keep secure!)
3. **Set Environment Variables:**
   ```bash
   BASE_RPC_URL=https://mainnet.base.org
   BASE_PRIVATE_KEY=0x1234567890abcdef...
   BASE_NETWORK=mainnet
   ```

### For Custom API:
1. **API URL:** Your Base 44 service endpoint
2. **Authentication:** API key or username/password
3. **Set Environment Variables:**
   ```bash
   BASE44_API_URL=https://api.yourbase44service.com
   BASE44_API_KEY=your_api_key
   ```

## 🔍 Troubleshooting

### Common Issues:

**Connection Not Detected:**
- Check that you've set the correct environment variables
- Restart the server after changing `.env` file
- Test with: `GET /api/base44/test`

**Authentication Failed:**
- Verify your API keys are correct
- Check that your account has proper permissions
- Ensure API endpoints are accessible

**Sync Failures:**
- Check data format matches expected schema
- Verify array structure for data field
- Look at server logs for detailed error messages

### Debug Commands:

```bash
# Check health status
curl http://localhost:8080/health

# Test Base 44 connection
curl http://localhost:8080/api/base44/test

# Check server logs
docker logs your-container-name
```

## 📚 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check with Base 44 status |
| GET | `/test` | Basic test including connections |
| GET | `/api/base44/test` | Test Base 44 connection specifically |
| POST | `/api/base44/sync` | Sync property data to Base 44 |
| POST | `/api/massive-import` | Import data to MongoDB |
| GET | `/api/job-status/:jobId` | Check import job status |

## 🛡️ Security Notes

- Never commit `.env` files to version control
- Keep private keys and API keys secure
- Use environment variables in production
- Consider using secrets management for sensitive data
- Regularly rotate API keys

## 📞 Support

If you need help determining which "Base 44" service you're using or need assistance with setup:

1. Check your account dashboard/settings for API documentation
2. Look for terms like "API Key", "Connection String", or "Authentication"
3. Contact your Base 44 service provider for specific integration details

---

**Note:** This integration supports multiple Base services. The system will automatically detect which one you're using based on your environment variables.