const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Base44ConnectionManager = require('./base44-connection-manager');

const app = express();
const PORT = process.env.PORT || 8080;

// 🔧 MEMORY OPTIMIZATION: Smaller limits
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

let mongoClient;
let db;
let base44Manager;

// 🔧 FIXED: Function name was wrong (connectToMontoDB -> connectToMongoDB)
async function connectToMongoDB() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        mongoClient = new MongoClient(process.env.MONGODB_URI, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        await mongoClient.connect();
        db = mongoClient.db('propertydigital');
        console.log('✅ MongoDB connected successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        setTimeout(connectToMongoDB, 5000);
    }
}

// Initialize Base 44 connection
async function connectToBase44() {
    try {
        console.log('🔗 Connecting to Base 44 service...');
        base44Manager = new Base44ConnectionManager();
        const connectionInfo = await base44Manager.connect();
        console.log(`✅ Base 44 connected: ${connectionInfo.service}`);
        return connectionInfo;
    } catch (error) {
        console.error('❌ Base 44 connection failed:', error.message);
        // Don't retry automatically - let it fail gracefully
        return null;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    const base44Info = base44Manager ? base44Manager.getConnectionInfo() : { connected: false, type: 'not_initialized' };
    
    res.json({
        status: 'healthy',
        message: 'PropertyDigital Railway Worker is running! 🚀',
        mongodb: db ? 'connected' : 'disconnected',
        base44: {
            connected: base44Info.connected,
            service: base44Info.service || 'Unknown',
            type: base44Info.type
        },
        timestamp: new Date().toISOString(),
        memory_usage: process.memoryUsage(),
        version: '2.1.0'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    const base44Info = base44Manager ? base44Manager.getConnectionInfo() : { connected: false };
    
    res.json({
        message: 'Railway worker test successful!',
        timestamp: new Date().toISOString(),
        mongodb: db ? 'connected' : 'disconnected',
        base44: base44Info.connected ? 'connected' : 'disconnected'
    });
});

// Base 44 connection test endpoint
app.get('/api/base44/test', async (req, res) => {
    try {
        if (!base44Manager) {
            return res.status(503).json({
                error: 'Base 44 service not initialized',
                message: 'Check environment variables and restart service'
            });
        }

        const connectionInfo = base44Manager.getConnectionInfo();
        
        if (!connectionInfo.connected) {
            // Try to reconnect
            const reconnectResult = await base44Manager.connect();
            return res.json({
                status: 'reconnected',
                ...reconnectResult,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            status: 'connected',
            ...connectionInfo,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Base 44 test failed:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Base 44 sync endpoint
app.post('/api/base44/sync', async (req, res) => {
    try {
        const { entityType, data } = req.body;

        if (!entityType || !data || !Array.isArray(data)) {
            return res.status(400).json({
                error: 'Missing required fields: entityType, data (array)'
            });
        }

        if (!base44Manager || !base44Manager.getConnectionInfo().connected) {
            return res.status(503).json({
                error: 'Base 44 service not connected',
                message: 'Please check connection and try again'
            });
        }

        console.log(`🔄 Syncing ${data.length} ${entityType} records to Base 44`);
        
        const syncResult = await base44Manager.syncPropertyData(data);
        
        res.json({
            status: 'completed',
            entityType,
            ...syncResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Base 44 sync failed:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 🚀 OPTIMIZED: Massive import with better memory management
app.post('/api/massive-import', async (req, res) => {
    const jobId = req.headers['x-job-id'] || uuidv4();
    const chunkInfo = req.headers['x-chunk-info'] || 'single';
    
    try {
        const { entityType, records, userId, isChunk = false, chunkIndex = 1, totalChunks = 1 } = req.body;
        
        if (!entityType || !records || !Array.isArray(records)) {
            return res.status(400).json({
                error: 'Missing required fields: entityType, records (array)',
                jobId
            });
        }
        
        if (!db) {
            return res.status(500).json({
                error: 'Database not connected - please check MongoDB URI',
                jobId
            });
        }
        
        console.log(`🚀 Processing ${isChunk ? 'CHUNK' : 'BATCH'}: ${records.length} ${entityType} records (${chunkInfo})`);
        
        // Process records in small batches to avoid memory issues
        const batchSize = isChunk ? 25 : 50; // Even smaller batches
        let processed = 0;
        const errors = [];
        
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            try {
                // Clean and prepare records
                const cleanedBatch = batch.map(record => {
                    const cleaned = {};
                    
                    // Map Hebrew fields to English for Payment entity
                    if (entityType === 'Payment') {
                        cleaned.tenant_id = record['מזהה דייר'] || record.tenant_id || 'unknown';
                        cleaned.property_id = record['מזהה נכס'] || record.property_id || 'unknown';
                        cleaned.amount = parseFloat(record['סכום'] || record.amount || 0);
                        cleaned.payment_date = record['תאריך תשלום'] || record.payment_date || new Date().toISOString().split('T')[0];
                        cleaned.payment_type = translatePaymentType(record['סוג תשלום'] || record.payment_type);
                        cleaned.payment_method = translatePaymentMethod(record['אמצעי תשלום'] || record.payment_method);
                        cleaned.status = translateStatus(record['סטטוס'] || record.status);
                        cleaned.receipt_number = record['מספר אסמכתא'] || record.receipt_number;
                        cleaned.description = record['הערות'] || record.description || record.notes;
                    } else {
                        // For other entities, copy as-is but clean
                        Object.keys(record).forEach(key => {
                            if (record[key] !== null && record[key] !== undefined && record[key] !== '') {
                                cleaned[key] = record[key];
                            }
                        });
                    }
                    
                    // Add metadata
                    cleaned.imported_at = new Date().toISOString();
                    cleaned.imported_by = userId || 'railway_worker';
                    cleaned.import_job_id = jobId;
                    if (isChunk) cleaned.chunk_info = chunkInfo;
                    
                    return cleaned;
                });
                
                // Insert batch
                const result = await db.collection(entityType.toLowerCase()).insertMany(cleanedBatch, {
                    ordered: false // Continue even if some records fail
                });
                
                processed += result.insertedCount;
                console.log(`✅ Batch ${Math.ceil((i + batchSize) / batchSize)} completed: ${result.insertedCount}/${batch.length} records`);
                
            } catch (batchError) {
                console.error(`❌ Batch error:`, batchError.message);
                errors.push({
                    batch: Math.ceil((i + batchSize) / batchSize),
                    error: batchError.message,
                    recordsInBatch: batch.length
                });
            }
        }
        
        console.log(`🎉 ${isChunk ? 'Chunk' : 'Import'} completed: ${processed}/${records.length} records`);
        
        res.json({
            status: errors.length > 0 ? 'completed_with_errors' : 'completed',
            jobId,
            processed,
            total: records.length,
            errors: errors.length,
            chunk: isChunk ? `${chunkIndex}/${totalChunks}` : undefined,
            message: `Successfully processed ${processed}/${records.length} ${entityType} records`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        res.status(500).json({
            status: 'failed',
            jobId,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Translation helpers for Hebrew to English
function translatePaymentType(type) {
    const translations = {
        'חשמל': 'electricity',
        'מים': 'water',
        'גז': 'gas',
        'ועד בית': 'vaad_bait',
        'שכר דירה': 'rent',
        'ארנונה': 'arnona',
        'תחזוקה': 'maintenance'
    };
    return translations[type] || type || 'other';
}

function translatePaymentMethod(method) {
    const translations = {
        'העברה בנקאית': 'bank_transfer',
        'ביט': 'bit',
        'אשראי': 'credit_card',
        'מזומן': 'cash',
        'צק': 'check',
        'צ\'ק': 'check'
    };
    return translations[method] || method || 'bank_transfer';
}

function translateStatus(status) {
    const translations = {
        'שולם': 'paid',
        'ממתין': 'pending',
        'באיחור': 'overdue',
        'בוטל': 'cancelled'
    };
    return translations[status] || status || 'pending';
}

// Job status endpoint
app.get('/api/job-status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        if (!db) {
            return res.status(500).json({
                error: 'Database not connected',
                jobId
            });
        }
        
        const jobStatus = await db.collection('job_statuses').findOne({ jobId });
        
        if (!jobStatus) {
            return res.status(404).json({
                error: 'Job not found',
                jobId,
                message: 'Job not found in worker database - may have been processed via chunks'
            });
        }
        
        res.json({
            ...jobStatus,
            checked_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Job status check failed:', error);
        res.status(500).json({
            error: error.message,
            jobId: req.params.jobId
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        available_endpoints: [
            'GET /health',
            'GET /test',
            'GET /api/base44/test',
            'POST /api/base44/sync',
            'POST /api/massive-import',
            'GET /api/job-status/:jobId'
        ]
    });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Optimized Railway Worker running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    
    // Initialize connections
    connectToMongoDB();
    
    // Initialize Base 44 connection (non-blocking)
    setTimeout(async () => {
        try {
            await connectToBase44();
        } catch (error) {
            console.log('⚠️ Base 44 connection will be available when environment variables are configured');
        }
    }, 2000); // Wait 2 seconds for MongoDB to connect first
});

// Memory monitoring
setInterval(() => {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB warning
        console.warn('⚠️ High memory usage:', Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB');
    }
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down gracefully...');
    if (mongoClient) await mongoClient.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    if (mongoClient) await mongoClient.close();
    process.exit(0);
});
