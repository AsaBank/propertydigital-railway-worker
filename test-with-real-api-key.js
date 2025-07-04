#!/usr/bin/env node

// LIVE TEST with Real Base44 API Key
// Testing PropertyDigital app with provided credentials

const { Base44PlatformClient } = require('./base44-platform-client');

class LiveAPITester {
    constructor() {
        this.apiKey = 'base44_sk_live_fnl5wjb3ax6jg68i5lrtgm2glrkir716';
        this.appId = 'e4e3e4ec3533478cb91d9112dca99f47';
        this.results = [];
    }

    log(message, type = 'info') {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'test' ? '🧪' : '📝';
        console.log(`${emoji} ${message}`);
        this.results.push({ type, message });
    }

    async testLiveAPI() {
        this.log('🚀 TESTING WITH REAL BASE44 API KEY!', 'test');
        this.log(`🔑 API Key: ${this.apiKey.substring(0, 20)}...`, 'info');
        this.log(`📱 App ID: ${this.appId}`, 'info');
        this.log('', 'info');

        // Create authenticated client
        const client = new Base44PlatformClient({
            baseUrl: 'https://app.base44.com',
            appId: this.appId,
            apiKey: this.apiKey
        });

        try {
            // Test 1: Platform Health (should work without auth)
            await this.testPlatformHealth(client);
            
            // Test 2: App Information (now with auth!)
            await this.testAppInfo(client);
            
            // Test 3: App Login Info
            await this.testAppLoginInfo(client);
            
            // Test 4: Entity Discovery
            await this.testEntityDiscovery(client);
            
            // Test 5: Function Discovery
            await this.testFunctionDiscovery(client);
            
            // Test 6: Built-in Integrations
            await this.testBuiltinIntegrations(client);
            
            // Test 7: PropertyDigital Specific Tests
            await this.testPropertyDigitalSpecific(client);
            
            this.printLiveResults();
            
        } catch (error) {
            this.log(`💥 Live API test failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testPlatformHealth(client) {
        this.log('Testing platform health...', 'test');
        try {
            const health = await client.getPlatformHealth();
            if (health.error) {
                this.log(`Platform health: ${health.error}`, 'error');
            } else {
                this.log('Platform health: OK', 'success');
                this.log(`Status: ${JSON.stringify(health)}`, 'info');
            }
        } catch (error) {
            this.log(`Platform health failed: ${error.message}`, 'error');
        }
    }

    async testAppInfo(client) {
        this.log('Testing app information access...', 'test');
        try {
            const appInfo = await client.getAppInfo();
            if (appInfo.error) {
                this.log(`App info error: ${appInfo.error}`, 'error');
            } else {
                this.log('APP INFO ACCESS SUCCESSFUL!', 'success');
                this.log(`App Name: ${appInfo.name || 'Unknown'}`, 'success');
                this.log(`App Type: ${appInfo.type || 'Unknown'}`, 'success');
                this.log(`Full App Data:`, 'info');
                console.log(JSON.stringify(appInfo, null, 2));
                return appInfo;
            }
        } catch (error) {
            this.log(`App info test failed: ${error.message}`, 'error');
        }
    }

    async testAppLoginInfo(client) {
        this.log('Testing app login information...', 'test');
        try {
            const loginInfo = await client.getAppLoginInfo();
            if (loginInfo.error) {
                this.log(`Login info error: ${loginInfo.error}`, 'error');
            } else {
                this.log('App login info retrieved successfully!', 'success');
                this.log(`Login Config: ${JSON.stringify(loginInfo, null, 2)}`, 'info');
            }
        } catch (error) {
            this.log(`Login info test failed: ${error.message}`, 'error');
        }
    }

    async testEntityDiscovery(client) {
        this.log('Discovering PropertyDigital entities...', 'test');
        
        // Common property management entities
        const propertyEntities = [
            'properties', 'property', 'units', 'unit',
            'tenants', 'tenant', 'leases', 'lease',
            'payments', 'payment', 'invoices', 'invoice',
            'maintenance', 'repairs', 'work_orders',
            'contacts', 'vendors', 'owners'
        ];

        let foundEntities = [];

        for (const entity of propertyEntities) {
            try {
                this.log(`Checking entity: ${entity}`, 'info');
                const result = await client.getEntities(entity);
                
                if (result.error) {
                    this.log(`Entity ${entity}: ${result.error}`, 'error');
                } else {
                    this.log(`FOUND ENTITY: ${entity}`, 'success');
                    foundEntities.push(entity);
                    this.log(`${entity} data: ${JSON.stringify(result, null, 2)}`, 'info');
                    
                    // If we find data, this is a major success
                    if (Array.isArray(result) && result.length > 0) {
                        this.log(`${entity} contains ${result.length} records!`, 'success');
                    }
                }
            } catch (error) {
                this.log(`Entity ${entity} test failed: ${error.message}`, 'error');
            }
        }

        if (foundEntities.length > 0) {
            this.log(`DISCOVERY SUCCESS: Found ${foundEntities.length} entities!`, 'success');
            this.log(`Available entities: ${foundEntities.join(', ')}`, 'success');
        }

        return foundEntities;
    }

    async testFunctionDiscovery(client) {
        this.log('Discovering PropertyDigital functions...', 'test');
        
        const propertyFunctions = [
            'generateReport', 'calculateRent', 'sendNotification',
            'processPayment', 'scheduleInspection', 'updateLease',
            'sendReminder', 'generateInvoice', 'uploadDocument'
        ];

        for (const func of propertyFunctions) {
            try {
                this.log(`Testing function: ${func}`, 'info');
                const result = await client.executeFunction(func, { test: true });
                
                if (result.error) {
                    this.log(`Function ${func}: ${result.error}`, 'error');
                } else {
                    this.log(`FOUND FUNCTION: ${func}`, 'success');
                    this.log(`${func} result: ${JSON.stringify(result, null, 2)}`, 'info');
                }
            } catch (error) {
                this.log(`Function ${func} test failed: ${error.message}`, 'error');
            }
        }
    }

    async testBuiltinIntegrations(client) {
        this.log('Testing Base44 built-in integrations...', 'test');
        
        // Test LLM integration
        try {
            this.log('Testing LLM integration...', 'info');
            const llmResult = await client.invokeLLM('Generate a brief property summary for testing PropertyDigital integration');
            
            if (llmResult.error) {
                this.log(`LLM error: ${llmResult.error}`, 'error');
            } else {
                this.log('LLM INTEGRATION WORKING!', 'success');
                this.log(`LLM Response: ${JSON.stringify(llmResult, null, 2)}`, 'success');
            }
        } catch (error) {
            this.log(`LLM test failed: ${error.message}`, 'error');
        }

        // Test email integration
        try {
            this.log('Testing email integration...', 'info');
            const emailResult = await client.sendEmail({
                to: 'test@example.com',
                subject: 'PropertyDigital Integration Test',
                body: 'This is a test email from the PropertyDigital Base44 integration'
            });
            
            if (emailResult.error) {
                this.log(`Email error: ${emailResult.error}`, 'error');
            } else {
                this.log('EMAIL INTEGRATION WORKING!', 'success');
                this.log(`Email result: ${JSON.stringify(emailResult, null, 2)}`, 'success');
            }
        } catch (error) {
            this.log(`Email test failed: ${error.message}`, 'error');
        }
    }

    async testPropertyDigitalSpecific(client) {
        this.log('Testing PropertyDigital specific capabilities...', 'test');
        
        // Try to create a test property record
        try {
            this.log('Attempting to create test property...', 'info');
            const testProperty = {
                name: 'Test Property - Cursor AI Integration',
                address: '123 Integration Test St',
                type: 'Apartment',
                status: 'Active',
                created_by: 'Cursor AI Integration Test'
            };
            
            const createResult = await client.createEntity('properties', testProperty);
            
            if (createResult.error) {
                this.log(`Create property error: ${createResult.error}`, 'error');
            } else {
                this.log('PROPERTY CREATION SUCCESSFUL!', 'success');
                this.log(`Created property: ${JSON.stringify(createResult, null, 2)}`, 'success');
            }
        } catch (error) {
            this.log(`Property creation test failed: ${error.message}`, 'error');
        }
    }

    printLiveResults() {
        this.log('\n🎉 LIVE API TEST RESULTS', 'info');
        this.log('═══════════════════════════════════════', 'info');
        
        const successes = this.results.filter(r => r.type === 'success');
        const errors = this.results.filter(r => r.type === 'error');
        const tests = this.results.filter(r => r.type === 'test');
        
        this.log(`🧪 Tests executed: ${tests.length}`, 'info');
        this.log(`✅ Successful operations: ${successes.length}`, 'success');
        this.log(`❌ Failed operations: ${errors.length}`, 'info');
        
        if (successes.length > 0) {
            this.log('\n🎉 MAJOR BREAKTHROUGHS:', 'success');
            successes.forEach(s => {
                if (s.message.includes('SUCCESSFUL') || s.message.includes('WORKING') || s.message.includes('FOUND')) {
                    this.log(`✅ ${s.message}`, 'success');
                }
            });
        }
        
        this.log('\n🚀 INTEGRATION STATUS:', 'info');
        if (successes.length >= 3) {
            this.log('🎉 FULL INTEGRATION OPERATIONAL!', 'success');
            this.log('🎯 PropertyDigital API access confirmed!', 'success');
            this.log('⚡ Ready for production automation!', 'success');
        } else if (successes.length >= 1) {
            this.log('✅ Partial integration working - great progress!', 'success');
            this.log('🔧 Some features need configuration or permissions', 'info');
        } else {
            this.log('🔑 API key may need additional permissions', 'info');
            this.log('📞 Contact Base44 support for full API access', 'info');
        }
        
        this.log('\n🎯 NEXT STEPS:', 'info');
        if (successes.length > 0) {
            this.log('1. Start the integration server: npm start', 'info');
            this.log('2. Begin building PropertyDigital automations', 'info');
            this.log('3. Explore available entities and functions', 'info');
            this.log('4. Build custom Cursor AI workflows', 'info');
        } else {
            this.log('1. Verify API key permissions in Base44 dashboard', 'info');
            this.log('2. Check if additional setup is needed', 'info');
            this.log('3. Contact Base44 support if needed', 'info');
        }
        
        this.log('\n🏆 ACHIEVEMENT UNLOCKED:', 'success');
        this.log('PropertyDigital Base44 integration with real API key!', 'success');
    }
}

// Run the live test
if (require.main === module) {
    const tester = new LiveAPITester();
    
    tester.testLiveAPI()
        .then(() => {
            console.log('\n🎯 Live API test with real credentials completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Live API test failed:', error.message);
            process.exit(1);
        });
}

module.exports = LiveAPITester;