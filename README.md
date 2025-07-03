# PropertyDigital Railway Worker

A Node.js/Express backend service for PropertyDigital with MongoDB integration and Base44 support.

## 🚀 Features

- **MongoDB Integration**: Store and manage property, tenant, and payment data
- **Base44 Integration**: Connect with Base44 low-code platform
- **Bulk Import**: Handle massive data imports with chunking support
- **Hebrew Support**: Automatic translation of Hebrew field names
- **API Authentication**: Secure API key-based authentication
- **Webhook Support**: Receive real-time updates from Base44

## 📋 Base44 Integration

This service is fully integrated with Base44 (App ID: 6863ae20dd6524ba8560bd9c).

### Quick Start
See `base44-quickstart.md` for a 5-minute setup guide.

### Full Documentation
See `base44-integration.md` for comprehensive integration documentation.

### Available Endpoints

- `GET /health` - Health check with Base44 status
- `POST /api/massive-import` - Import records (payments, tenants, properties)
- `GET /api/sync/:entityType` - Sync data from MongoDB
- `GET /api/schema/:entityType` - Get entity schemas for Base44
- `POST /webhook/base44` - Receive webhooks from Base44

## 🔧 Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run locally: `npm start`

## 🚀 Deployment

This service is designed to run on Railway. Environment variables are automatically configured through Railway's dashboard.

## 📚 Documentation

- `base44-quickstart.md` - Quick setup guide
- `base44-integration.md` - Full integration guide
- `base44-endpoints.js` - Base44-specific endpoints
- `.env.example` - Environment variables reference