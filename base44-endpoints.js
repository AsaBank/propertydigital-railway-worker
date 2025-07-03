const express = require('express');
const router = express.Router();

// Middleware to verify Base44 webhook signatures
const verifyBase44Webhook = (req, res, next) => {
    const signature = req.headers['x-base44-signature'];
    const secret = process.env.BASE44_WEBHOOK_SECRET;
    
    if (!secret) {
        console.warn('⚠️ BASE44_WEBHOOK_SECRET not configured');
        return next();
    }
    
    // TODO: Implement signature verification based on Base44's method
    // For now, we'll just check if a signature is present
    if (!signature && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Missing webhook signature' });
    }
    
    next();
};

// Base44 webhook receiver
router.post('/webhook/base44', verifyBase44Webhook, async (req, res) => {
    const { event, data, timestamp, metadata } = req.body;
    
    console.log(`📨 Base44 webhook received: ${event}`, {
        timestamp,
        metadata,
        dataCount: Array.isArray(data) ? data.length : 1
    });
    
    try {
        let result;
        
        switch (event) {
            case 'record.created':
            case 'record.updated':
                result = await processRecord(data, event);
                break;
            
            case 'bulk.import':
                result = await handleBulkImport(data, metadata);
                break;
            
            case 'sync.requested':
                result = await handleSyncRequest(data);
                break;
            
            default:
                console.log(`Unknown event: ${event}`);
                result = { status: 'ignored', reason: 'unknown_event' };
        }
        
        res.json({ 
            status: 'received', 
            event,
            result,
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ 
            error: error.message,
            event,
            timestamp: new Date().toISOString()
        });
    }
});

// Base44 data sync endpoint
router.get('/api/sync/:entityType', async (req, res) => {
    const { entityType } = req.params;
    const { lastSync, limit = 100, page = 1, sortBy = 'updated_at', sortOrder = 'desc' } = req.query;
    
    try {
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        
        // Build query
        const query = {};
        if (lastSync) {
            query.updated_at = { $gt: new Date(lastSync) };
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        
        // Get total count
        const totalCount = await db.collection(entityType.toLowerCase()).countDocuments(query);
        
        // Get records
        const records = await db.collection(entityType.toLowerCase())
            .find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        res.json({
            entityType,
            records,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / parseInt(limit))
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get schema information for Base44
router.get('/api/schema/:entityType', async (req, res) => {
    const { entityType } = req.params;
    
    const schemas = {
        payment: {
            fields: {
                tenant_id: { type: 'string', required: true },
                property_id: { type: 'string', required: true },
                amount: { type: 'number', required: true },
                payment_date: { type: 'date', required: true },
                payment_type: { type: 'enum', values: ['electricity', 'water', 'gas', 'vaad_bait', 'rent', 'arnona', 'maintenance', 'other'] },
                payment_method: { type: 'enum', values: ['bank_transfer', 'bit', 'credit_card', 'cash', 'check'] },
                status: { type: 'enum', values: ['paid', 'pending', 'overdue', 'cancelled'] },
                receipt_number: { type: 'string' },
                description: { type: 'string' }
            }
        },
        tenant: {
            fields: {
                id: { type: 'string', required: true },
                name: { type: 'string', required: true },
                email: { type: 'string' },
                phone: { type: 'string' },
                property_id: { type: 'string' },
                lease_start: { type: 'date' },
                lease_end: { type: 'date' },
                monthly_rent: { type: 'number' }
            }
        },
        property: {
            fields: {
                id: { type: 'string', required: true },
                address: { type: 'string', required: true },
                type: { type: 'string' },
                rooms: { type: 'number' },
                size_sqm: { type: 'number' },
                owner_id: { type: 'string' },
                status: { type: 'enum', values: ['available', 'rented', 'maintenance'] }
            }
        }
    };
    
    const schema = schemas[entityType.toLowerCase()];
    if (!schema) {
        return res.status(404).json({ error: 'Entity type not found' });
    }
    
    res.json({
        entityType,
        schema,
        timestamp: new Date().toISOString()
    });
});

// Helper functions
async function processRecord(data, eventType) {
    const db = global.db; // Assuming db is available globally
    
    if (!db) {
        throw new Error('Database not connected');
    }
    
    const { entityType, record } = data;
    const collection = db.collection(entityType.toLowerCase());
    
    // Add metadata
    record.last_modified = new Date().toISOString();
    record.modified_by = 'base44_webhook';
    
    if (eventType === 'record.created') {
        record.created_at = new Date().toISOString();
        const result = await collection.insertOne(record);
        return { inserted: true, id: result.insertedId };
    } else {
        const result = await collection.updateOne(
            { _id: record._id || record.id },
            { $set: record },
            { upsert: true }
        );
        return { updated: result.modifiedCount, upserted: result.upsertedCount };
    }
}

async function handleBulkImport(data, metadata) {
    const { entityType, records } = data;
    const { jobId, userId } = metadata || {};
    
    // Delegate to the existing massive-import logic
    const importData = {
        entityType,
        records,
        userId: userId || 'base44_webhook',
        isChunk: false
    };
    
    // You could emit an event or call the import function directly
    // For now, we'll return a job reference
    return {
        status: 'queued',
        jobId: jobId || require('uuid').v4(),
        recordCount: records.length
    };
}

async function handleSyncRequest(data) {
    const { entityTypes, syncType, options } = data;
    
    // This could trigger a more complex sync process
    return {
        status: 'sync_initiated',
        entityTypes,
        syncType,
        timestamp: new Date().toISOString()
    };
}

module.exports = router;