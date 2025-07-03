const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// 🔧 MEMORY OPTIMIZATION: Smaller limits
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

let mongoClient;
let db;

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

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Railway worker test successful!',
        timestamp: new Date().toISOString(),
        mongodb: db ? 'connected' : 'disconnected'
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
                // Clean and prepare records with enhanced error tracking
                const cleanedBatch = [];
                const recordErrors = [];
                
                for (let idx = 0; idx < batch.length; idx++) {
                    const record = batch[idx];
                    const globalIndex = i + idx;
                    try {
                        const cleaned = {};
                        
                        // Use smart field mapping system
                        const normalized = fieldMapper.normalizeRecord(record, entityType);
                        
                        // Apply entity-specific transformations for Payment
                        if (entityType === 'Payment') {
                            // Map tenant and property IDs
                            normalized.tenant_id = record['מזהה דייר'] || record.tenant_id || normalized.tenant_id || 'unknown';
                            normalized.property_id = record['מזהה נכס'] || record.property_id || normalized.property_id || 'unknown';
                            
                            // Apply translation helpers
                            if (normalized.payment_type) {
                                normalized.payment_type = translatePaymentType(normalized.payment_type);
                            }
                            if (normalized.payment_method) {
                                normalized.payment_method = translatePaymentMethod(normalized.payment_method);
                            }
                            if (normalized.status) {
                                normalized.status = translateStatus(normalized.status);
                            }
                            
                            // Validation for Payment entity
                            if (isNaN(normalized.amount)) {
                                throw new Error(`Invalid amount: ${normalized.amount}`);
                            }
                        }
                        
                        // Copy normalized fields to cleaned object
                        Object.assign(cleaned, normalized);
                        
                        // Add metadata
                        cleaned.imported_at = new Date().toISOString();
                        cleaned.imported_by = userId || 'railway_worker';
                        cleaned.import_job_id = jobId;
                        if (isChunk) cleaned.chunk_info = chunkInfo;
                        
                        cleanedBatch.push(cleaned);
                    } catch (recordError) {
                        const errorDetail = await errorLogger.logError('RECORD_PROCESSING_ERROR', {
                            jobId,
                            entityType,
                            recordIndex: globalIndex,
                            recordData: record,
                            error: recordError.message,
                            stack: recordError.stack
                        });
                        recordErrors.push(errorDetail);
                    }
                }
                
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
        
        // Prepare detailed response
        const response = {
            status: errors.length > 0 ? 'completed_with_errors' : 'completed',
            jobId,
            processed,
            total: records.length,
            failed: records.length - processed,
            errors: errors.length,
            errorDetails: errors.slice(0, 10), // First 10 errors for quick review
            chunk: isChunk ? `${chunkIndex}/${totalChunks}` : undefined,
            message: `Successfully processed ${processed}/${records.length} ${entityType} records`,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - parseInt(jobId.split('_')[1] || Date.now()),
            cacheStats: globalEntityCache.getStats()
        };
        
        // Store job result for future reference
        if (db) {
            try {
                await db.collection('import_jobs').insertOne({
                    ...response,
                    entityType,
                    userId,
                    completedAt: new Date()
                });
            } catch (err) {
                console.error('Failed to save job result:', err);
            }
        }
        
        res.json(response);
        
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

// Enhanced error logging system
const errorLogger = {
    logError: async (errorType, details) => {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            type: errorType,
            jobId: details.jobId,
            entityType: details.entityType,
            recordIndex: details.recordIndex,
            recordData: details.recordData,
            error: details.error,
            stack: details.stack
        };
        
        // Log to console with structured format
        console.error(`🚨 [${errorType}] Error in record ${details.recordIndex}:`, {
            error: details.error,
            record: details.recordData,
            stack: details.stack
        });
        
        // Save to database for persistent error tracking
        if (db) {
            try {
                await db.collection('import_errors').insertOne(errorRecord);
            } catch (dbError) {
                console.error('Failed to save error to database:', dbError);
            }
        }
        
        return errorRecord;
    }
};

// Smart field mapping system
const fieldMapper = {
    // Common field variations mapping
    commonMappings: {
        // Name variations
        'שם': 'name',
        'full_name': 'name',
        'fullname': 'name',
        'שם מלא': 'name',
        'שם פרטי ומשפחה': 'name',
        
        // Phone variations
        'טלפון': 'phone',
        'telephone': 'phone',
        'מספר טלפון': 'phone',
        'נייד': 'mobile',
        'טלפון נייד': 'mobile',
        
        // Email variations
        'אימייל': 'email',
        'דוא"ל': 'email',
        'דואר אלקטרוני': 'email',
        'mail': 'email',
        
        // Address variations
        'כתובת': 'address',
        'מיקום': 'address',
        'רחוב': 'street',
        'עיר': 'city',
        
        // Status variations
        'סטטוס': 'status',
        'מצב': 'status',
        'פעיל': 'active',
        'לא פעיל': 'inactive',
        
        // Property specific
        'יחידות': 'total_units',
        'מספר יחידות': 'total_units',
        'units': 'total_units',
        'שטח': 'area',
        'גודל': 'size',
        
        // Tenant specific
        'תחילת חוזה': 'lease_start',
        'סיום חוזה': 'lease_end',
        'שכר דירה': 'rent_amount',
        'שכירות': 'rent_amount',
        
        // Payment specific
        'סכום': 'amount',
        'תאריך': 'date',
        'תאריך תשלום': 'payment_date',
        'אמצעי תשלום': 'payment_method',
        'הערות': 'notes',
        'תיאור': 'description'
    },
    
    // Smart field detection
    detectFieldType: (value) => {
        if (!value) return null;
        
        const strValue = String(value).trim();
        
        // Email detection
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
            return 'email';
        }
        
        // Phone detection (Israeli formats)
        if (/^0[0-9]{8,9}$/.test(strValue.replace(/[-\s]/g, ''))) {
            return 'phone';
        }
        
        // Date detection
        if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(strValue) || 
            /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(strValue)) {
            return 'date';
        }
        
        // Number detection
        if (!isNaN(strValue.replace(/,/g, '')) && strValue.replace(/,/g, '') !== '') {
            return 'number';
        }
        
        // Boolean detection
        if (['כן', 'לא', 'true', 'false', 'yes', 'no'].includes(strValue.toLowerCase())) {
            return 'boolean';
        }
        
        return 'string';
    },
    
    // Normalize value based on type
    normalizeValue: (value, fieldType) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const strValue = String(value).trim();
        
        switch (fieldType) {
            case 'phone':
                // Remove spaces and dashes, ensure starts with 0
                let phone = strValue.replace(/[-\s]/g, '');
                if (!phone.startsWith('0') && phone.length === 9) {
                    phone = '0' + phone;
                }
                return phone;
                
            case 'date':
                // Try to parse various date formats
                const dateFormats = [
                    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, // DD/MM/YYYY
                    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,  // DD/MM/YY
                    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/   // YYYY/MM/DD
                ];
                
                for (const format of dateFormats) {
                    const match = strValue.match(format);
                    if (match) {
                        let [_, part1, part2, part3] = match;
                        if (part3.length === 2) {
                            part3 = '20' + part3; // Assume 2000s
                        }
                        
                        // Determine if DD/MM/YYYY or YYYY/MM/DD
                        const year = part1.length === 4 ? part1 : part3;
                        const month = part1.length === 4 ? part2 : part2;
                        const day = part1.length === 4 ? part3 : part1;
                        
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                }
                return strValue;
                
            case 'number':
                return parseFloat(strValue.replace(/,/g, ''));
                
            case 'boolean':
                return ['כן', 'true', 'yes', '1'].includes(strValue.toLowerCase());
                
            default:
                return strValue;
        }
    },
    
    // Smart record normalization
    normalizeRecord: (record, entityType, existingSchema = null) => {
        const normalized = {};
        
        // Apply common mappings first
        Object.entries(record).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase().trim();
            const mappedKey = fieldMapper.commonMappings[lowerKey] || key;
            
            // Detect field type
            const fieldType = fieldMapper.detectFieldType(value);
            
            // Normalize the value
            normalized[mappedKey] = fieldMapper.normalizeValue(value, fieldType);
        });
        
        // Entity-specific normalization
        switch (entityType.toLowerCase()) {
            case 'property':
                // Ensure required fields with smart defaults
                if (!normalized.name && !normalized.address) {
                    normalized.name = 'נכס ללא שם';
                }
                if (!normalized.total_units && normalized.units) {
                    normalized.total_units = normalized.units;
                }
                normalized.status = normalized.status || 'active';
                break;
                
            case 'tenant':
                // Ensure tenant has a name
                if (!normalized.name && (normalized.first_name || normalized.last_name)) {
                    normalized.name = `${normalized.first_name || ''} ${normalized.last_name || ''}`.trim();
                }
                if (!normalized.name) {
                    normalized.name = 'דייר ללא שם';
                }
                normalized.status = normalized.status || 'active';
                break;
                
            case 'payment':
                // Payment specific normalizations
                if (!normalized.payment_date && normalized.date) {
                    normalized.payment_date = normalized.date;
                }
                normalized.status = normalized.status || 'pending';
                normalized.amount = normalized.amount || 0;
                break;
        }
        
        return normalized;
    }
};

// Rate Limit Handler with intelligent retry
const rateLimitHandler = {
    // Track API calls per endpoint
    callHistory: new Map(),
    
    // Configuration
    config: {
        maxCallsPerMinute: 60,
        maxCallsPerSecond: 5,
        retryDelay: 1000, // Start with 1 second
        maxRetries: 3,
        backoffMultiplier: 2
    },
    
    // Check if we can make a call
    canMakeCall: function(endpoint) {
        const now = Date.now();
        const history = this.callHistory.get(endpoint) || [];
        
        // Clean old entries (older than 1 minute)
        const recentHistory = history.filter(time => now - time < 60000);
        this.callHistory.set(endpoint, recentHistory);
        
        // Check per-second limit
        const lastSecond = recentHistory.filter(time => now - time < 1000);
        if (lastSecond.length >= this.config.maxCallsPerSecond) {
            return false;
        }
        
        // Check per-minute limit
        if (recentHistory.length >= this.config.maxCallsPerMinute) {
            return false;
        }
        
        return true;
    },
    
    // Record a call
    recordCall: function(endpoint) {
        const history = this.callHistory.get(endpoint) || [];
        history.push(Date.now());
        this.callHistory.set(endpoint, history);
    },
    
    // Wait for rate limit
    waitForRateLimit: async function(endpoint, attempt = 0) {
        while (!this.canMakeCall(endpoint)) {
            const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt);
            console.log(`⏳ Rate limit reached for ${endpoint}. Waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.recordCall(endpoint);
    }
};

// Enhanced Entity Cache System
class EntityCache {
    constructor(maxSize = 10000, ttl = 3600000) { // 1 hour TTL by default
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.hits = 0;
        this.misses = 0;
    }
    
    // Generate cache key
    generateKey(entityType, identifier) {
        return `${entityType}:${JSON.stringify(identifier)}`;
    }
    
    // Get from cache
    get(entityType, identifier) {
        const key = this.generateKey(entityType, identifier);
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.ttl) {
            this.hits++;
            return cached.data;
        }
        
        this.misses++;
        return null;
    }
    
    // Set in cache
    set(entityType, identifier, data) {
        const key = this.generateKey(entityType, identifier);
        
        // Implement LRU if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    // Batch get - useful for checking multiple entities at once
    batchGet(entityType, identifiers) {
        const results = {
            found: {},
            missing: []
        };
        
        identifiers.forEach(id => {
            const cached = this.get(entityType, id);
            if (cached) {
                results.found[id] = cached;
            } else {
                results.missing.push(id);
            }
        });
        
        return results;
    }
    
    // Clear cache for specific entity type
    clearEntityType(entityType) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(entityType + ':')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }
    
    // Get cache statistics
    getStats() {
        const totalRequests = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: totalRequests > 0 ? (this.hits / totalRequests * 100).toFixed(2) + '%' : '0%',
            totalRequests
        };
    }
}

// Initialize global cache
const globalEntityCache = new EntityCache();

// Batch processor for efficient bulk operations
const batchProcessor = {
    // Process records in optimized batches
    processBatch: async function(records, processor, options = {}) {
        const {
            batchSize = 25,
            concurrency = 3,
            onProgress = null,
            onError = null
        } = options;
        
        const results = [];
        const errors = [];
        let processed = 0;
        
        // Split into batches
        const batches = [];
        for (let i = 0; i < records.length; i += batchSize) {
            batches.push(records.slice(i, i + batchSize));
        }
        
        // Process batches with controlled concurrency
        for (let i = 0; i < batches.length; i += concurrency) {
            const concurrentBatches = batches.slice(i, i + concurrency);
            
            const batchPromises = concurrentBatches.map(async (batch, idx) => {
                try {
                    const batchResults = await processor(batch, i + idx);
                    results.push(...batchResults);
                    processed += batch.length;
                    
                    if (onProgress) {
                        onProgress(processed, records.length);
                    }
                } catch (error) {
                    errors.push({
                        batchIndex: i + idx,
                        error: error.message,
                        records: batch
                    });
                    
                    if (onError) {
                        onError(error, batch);
                    }
                }
            });
            
            await Promise.all(batchPromises);
        }
        
        return { results, errors, processed };
    }
};

// Import history endpoint
app.get('/api/import-history', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({
                error: 'Database not connected'
            });
        }
        
        const { entityType, userId, limit = 20, skip = 0 } = req.query;
        
        const query = {};
        if (entityType) query.entityType = entityType;
        if (userId) query.userId = userId;
        
        const history = await db.collection('import_jobs')
            .find(query)
            .sort({ completedAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .toArray();
        
        const total = await db.collection('import_jobs').countDocuments(query);
        
        res.json({
            history,
            total,
            page: Math.floor(skip / limit) + 1,
            totalPages: Math.ceil(total / limit)
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch import history:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

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
            'POST /api/massive-import',
            'GET /api/job-status/:jobId',
            'GET /api/import-history'
        ]
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Optimized Railway Worker running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
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

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    if (mongoClient) await mongoClient.close();
    process.exit(0);
});
