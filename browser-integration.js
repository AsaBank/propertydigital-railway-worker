#!/usr/bin/env node

// BROWSER-BASED PROPERTYDIGITAL INTEGRATION
// Direct interaction with your app interface when API is restricted

const puppeteer = require('puppeteer');

class PropertyDigitalBrowserAgent {
    constructor() {
        this.appUrl = 'https://app.base44.com/apps/e4e3e4ec3533478cb91d9112dca99f47';
        this.browser = null;
        this.page = null;
        this.isConnected = false;
    }

    async connect() {
        console.log('🚀 Connecting to PropertyDigital via browser interface...');
        
        try {
            // Launch browser
            this.browser = await puppeteer.launch({ 
                headless: true, // Run in headless mode for server environment
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                defaultViewport: null 
            });
            
            this.page = await this.browser.newPage();
            
            // Navigate to your app
            await this.page.goto(this.appUrl);
            console.log('✅ Connected to PropertyDigital app interface!');
            
            this.isConnected = true;
            return true;
            
        } catch (error) {
            console.error('❌ Browser connection failed:', error.message);
            return false;
        }
    }

    async getProperties() {
        if (!this.isConnected) {
            await this.connect();
        }
        
        console.log('📊 Extracting property data...');
        
        try {
            // Wait for app to load and extract property data
            await this.page.waitForSelector('[data-testid="property"], .property, .property-card', { timeout: 5000 });
            
            const properties = await this.page.evaluate(() => {
                // Look for property elements in the DOM
                const propertyElements = document.querySelectorAll('[data-testid="property"], .property, .property-card, .property-item');
                
                return Array.from(propertyElements).map(element => ({
                    text: element.textContent?.trim(),
                    html: element.innerHTML
                }));
            });
            
            console.log(`✅ Found ${properties.length} property elements`);
            return properties;
            
        } catch (error) {
            console.log('📝 Analyzing page structure...');
            
            // Get page content for analysis
            const content = await this.page.content();
            const title = await this.page.title();
            
            console.log(`Page title: ${title}`);
            
            // Extract any data we can find
            const pageData = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()),
                    tables: Array.from(document.querySelectorAll('table')).length,
                    forms: Array.from(document.querySelectorAll('form')).length,
                    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()),
                    links: Array.from(document.querySelectorAll('a')).map(a => a.textContent?.trim()).filter(t => t)
                };
            });
            
            console.log('Page structure:', JSON.stringify(pageData, null, 2));
            return pageData;
        }
    }

    async getTenants() {
        console.log('👥 Looking for tenant data...');
        
        const tenantData = await this.page.evaluate(() => {
            // Look for tenant-related elements
            const tenantElements = document.querySelectorAll('[data-testid="tenant"], .tenant, .tenant-card, .tenant-row');
            
            return Array.from(tenantElements).map(element => ({
                text: element.textContent?.trim(),
                html: element.innerHTML
            }));
        });
        
        console.log(`✅ Found ${tenantData.length} tenant elements`);
        return tenantData;
    }

    async getPayments() {
        console.log('💰 Looking for payment data...');
        
        const paymentData = await this.page.evaluate(() => {
            // Look for payment-related elements
            const paymentElements = document.querySelectorAll('[data-testid="payment"], .payment, .payment-card, .payment-row');
            
            return Array.from(paymentElements).map(element => ({
                text: element.textContent?.trim(),
                html: element.innerHTML
            }));
        });
        
        console.log(`✅ Found ${paymentData.length} payment elements`);
        return paymentData;
    }

    async takeScreenshot(filename = 'propertydigital-screenshot.png') {
        if (this.page) {
            await this.page.screenshot({ path: filename, fullPage: true });
            console.log(`📸 Screenshot saved: ${filename}`);
        }
    }

    async performAction(action, data = {}) {
        console.log(`🎯 Performing action: ${action}`);
        
        switch (action) {
            case 'click':
                await this.page.click(data.selector);
                break;
                
            case 'fill':
                await this.page.fill(data.selector, data.value);
                break;
                
            case 'navigate':
                await this.page.goto(data.url);
                break;
                
            default:
                console.log(`❓ Unknown action: ${action}`);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔌 Browser connection closed');
        }
    }

    // AI Assistant methods
    async analyzeAppStructure() {
        console.log('🔍 Analyzing PropertyDigital app structure...');
        
        const structure = await this.page.evaluate(() => {
            const analysis = {
                navigation: [],
                mainContent: [],
                forms: [],
                dataElements: [],
                actionButtons: []
            };
            
            // Analyze navigation
            document.querySelectorAll('nav a, .nav a, .menu a').forEach(link => {
                analysis.navigation.push(link.textContent?.trim());
            });
            
            // Analyze main content areas
            document.querySelectorAll('main, .main, .content, .app-content').forEach(area => {
                analysis.mainContent.push({
                    className: area.className,
                    text: area.textContent?.substring(0, 200) + '...'
                });
            });
            
            // Analyze forms
            document.querySelectorAll('form').forEach(form => {
                const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                    type: input.type || input.tagName.toLowerCase(),
                    name: input.name,
                    placeholder: input.placeholder
                }));
                
                analysis.forms.push({ inputs });
            });
            
            // Look for data tables/lists
            document.querySelectorAll('table, .data-table, .list, .grid').forEach(element => {
                analysis.dataElements.push({
                    type: element.tagName.toLowerCase(),
                    className: element.className,
                    rowCount: element.querySelectorAll('tr, .row, .item').length
                });
            });
            
            // Analyze action buttons
            document.querySelectorAll('button, .btn, .action').forEach(button => {
                analysis.actionButtons.push(button.textContent?.trim());
            });
            
            return analysis;
        });
        
        console.log('📊 App structure analysis:', JSON.stringify(structure, null, 2));
        return structure;
    }
}

// Example usage
async function demonstrateBrowserIntegration() {
    const agent = new PropertyDigitalBrowserAgent();
    
    try {
        // Connect to the app
        await agent.connect();
        
        // Take a screenshot
        await agent.takeScreenshot();
        
        // Analyze the app structure
        const structure = await agent.analyzeAppStructure();
        
        // Try to get property data
        const properties = await agent.getProperties();
        
        // Try to get tenant data
        const tenants = await agent.getTenants();
        
        // Try to get payment data
        const payments = await agent.getPayments();
        
        console.log('\n🎉 BROWSER INTEGRATION RESULTS:');
        console.log(`✅ App structure analyzed`);
        console.log(`✅ Found ${properties.length} property elements`);
        console.log(`✅ Found ${tenants.length} tenant elements`);
        console.log(`✅ Found ${payments.length} payment elements`);
        
        // Keep browser open for interaction
        console.log('\n💬 Browser is ready for commands!');
        console.log('The PropertyDigital app is now accessible programmatically.');
        
        // Wait for user interaction (in a real scenario)
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('❌ Browser integration failed:', error.message);
    } finally {
        await agent.close();
    }
}

// Auto-run if this file is executed directly
if (require.main === module) {
    demonstrateBrowserIntegration();
}

module.exports = PropertyDigitalBrowserAgent;