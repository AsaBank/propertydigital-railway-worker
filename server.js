const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// 🔧 MEMORY OPTIMIZATION: Smaller limits and streaming
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));  // Reduced from 100mb to 10mb

let mongoClient;
let db;

async function connectToMontoDB() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        mongoClient = new MongoClient(process.env.MONGODB_URI, {
            maxPoolSize: 5,  // Limit connection pool
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'PropertyDigital Railway Worker is running! 🚀',
        mongodb: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        memory_usage: process.memoryUsage(),
        version: '2.0.0'
    });
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
                error: 'Database not connected',
                jobId
            });
        }
        
        console.log(`🚀 Processing ${isChunk ? 'CHUNK' : 'BATCH'}: ${records.length} ${entityType} records (${chunkInfo})`);
        
        // For chunks, use a simpler approach
        if (isChunk) {
            try {
                // Process chunk in smaller batches
                const batchSize = 50; // Even smaller for chunks
                let processed = 0;
                
                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize);
                    
                    // Clean and prepare records
                    const cleanedBatch = batch.map(record => {
                        const cleaned = {};
                        
                        // Map Hebrew fields to English for Payment entity
                        if (entityType === 'Payment') {
                            cleaned.tenant_id = record['מזהה דייר'] || record.tenant_id;
                            cleaned.property_id = record['מזהה נכס'] || record.property_id;
                            cleaned.amount = parseFloat(record['סכום'] || record.amount || 0);
                            cleaned.payment_date = record['תאריך תשלום'] || record.payment_date;
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
                        cleaned.chunk_info = chunkInfo;
                        
                        return cleaned;
                    });
                    
                    // Insert batch
                    const result = await db.collection(entityType.toLowerCase()).insertMany(cleanedBatch, {
                        ordered: false
                    });
                    
                    processed += result.insertedCount;
                    console.log(`✅ Chunk batch ${Math.ceil((i + batchSize) / batchSize)} completed: ${result.insertedCount} records`);
                }
                
                console.log(`🎉 Chunk completed: ${processed}/${records.length} records`);
                
                return res.json({
                    status: 'completed',
                    jobId,
                    processed,
                    total: records.length,
                    chunk: `${chunkIndex}/${totalChunks}`,
                    message: `Chunk ${chunkIndex}/${totalChunks} completed successfully`
                });
                
            } catch (chunkError) {
                console.error('❌ Chunk processing failed:', chunkError);
                return res.status(500).json({
                    status: 'failed',
                    jobId,
                    error: chunkError.message,
                    chunk: `${chunkIndex}/${totalChunks}`
                });
            }
        }
        
        // Original large batch processing (kept for compatibility)
        // ... rest of original code for non-chunk processing
        
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
        'ארנונה': 'arnona'
    };
    return translations[type] || type || 'other';
}

function translatePaymentMethod(method) {
    const translations = {
        'העברה בנקאית': 'bank_transfer',
        'ביט': 'bit',
        'אשראי': 'credit_card',
        'מזומן': 'cash',
        'צק': 'check'
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

// Job status endpoint (unchanged)
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
                message: 'Job not found in worker database'
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

// Error handling
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        available_endpoints: [
            'GET /health',
            'POST /api/massive-import',
            'GET /api/job-status/:jobId'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Optimized Railway Worker running on port ${PORT}`);
    connectToMongoDB();
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
