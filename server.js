const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' }));

let mongoClient;
let db;

async function connectToMongoDB() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db('propertydigital');
        console.log('✅ MongoDB connected!');
    } catch (error) {
        console.error('❌ MongoDB failed:', error);
        setTimeout(connectToMongoDB, 5000);
    }
}

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'PropertyDigital Railway Worker is running! 🚀',
        mongodb: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/massive-import', async (req, res) => {
    const jobId = req.headers['x-job-id'] || uuidv4();
    
    try {
        const { entityType, records, userId } = req.body;
        console.log(`🚀 Import: ${records.length} ${entityType} records`);
        
        // Save job status
        await db.collection('job_statuses').replaceOne(
            { jobId },
            {
                jobId,
                status: 'processing',
                total: records.length,
                processed: 0,
                message: `Processing ${records.length} records...`
            },
            { upsert: true }
        );
        
        // Process records in batches
        const batchSize = 1000;
        let processed = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            // Save batch to MongoDB
            await db.collection(entityType.toLowerCase()).insertMany(batch);
            processed += batch.length;
            
            // Update progress
            await db.collection('job_statuses').updateOne(
                { jobId },
                {
                    $set: {
                        processed,
                        progress: Math.round((processed / records.length) * 100),
                        message: `Processed ${processed}/${records.length} records`
                    }
                }
            );
        }
        
        // Mark as completed
        await db.collection('job_statuses').updateOne(
            { jobId },
            {
                $set: {
                    status: 'completed',
                    message: `Successfully imported ${processed} records!`
                }
            }
        );
        
        res.json({
            status: 'completed',
            jobId,
            processed,
            message: `Successfully imported ${processed} ${entityType} records!`
        });
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        
        await db.collection('job_statuses').updateOne(
            { jobId },
            {
                $set: {
                    status: 'failed',
                    error: error.message
                }
            }
        );
        
        res.status(500).json({
            status: 'failed',
            error: error.message
        });
    }
});

app.get('/api/job-status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const status = await db.collection('job_statuses').findOne({ jobId });
        
        if (!status) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

connectToMongoDB();

app.listen(PORT, () => {
    console.log(`🚀 PropertyDigital Railway Worker running on port ${PORT}`);
});
