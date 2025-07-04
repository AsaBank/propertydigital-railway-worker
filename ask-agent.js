#!/usr/bin/env node

// 🤖 ASK PROPERTYDIGITAL AI AGENT - INTERACTIVE COMMAND MODE
// Give me any command and I'll execute it immediately!

const PropertyDigitalAICommands = require('./ai-agent-commands');

async function askAgent() {
    const aiAgent = new PropertyDigitalAICommands();
    
    console.log('🤖 PROPERTYDIGITAL AI AGENT - READY FOR YOUR COMMANDS!');
    console.log('💬 You can ask me anything in English or Hebrew\n');
    
    // Get command from arguments
    const command = process.argv.slice(2).join(' ');
    
    if (!command) {
        console.log('📝 Usage Examples:');
        console.log('   node ask-agent.js "add property"');
        console.log('   node ask-agent.js "הוסף נכס"');
        console.log('   node ask-agent.js "dashboard"');
        console.log('   node ask-agent.js "דוח כספי"');
        console.log('   node ask-agent.js "demo all"');
        console.log('\n💡 Or run without arguments to see available commands');
        
        console.log('\n🎯 AVAILABLE COMMANDS:');
        console.log('   🏠 "add property" / "הוסף נכס" - Add new property');
        console.log('   👥 "add tenant" / "הוסף דייר" - Add new tenant');
        console.log('   📊 "dashboard" / "דשבורד" - Generate dashboard');
        console.log('   💰 "financial report" / "דוח כספי" - Financial summary');
        console.log('   🔄 "setup automations" / "הגדר אוטומציות" - Configure automations');
        console.log('   🎯 "demo all" / "הדגמה מלאה" - Full demonstration');
        
        console.log('\n🔥 I AM LIVE AND READY - JUST GIVE ME A COMMAND!');
        return;
    }
    
    console.log(`🎯 Processing your request: "${command}"`);
    console.log('⚡ Executing...\n');
    
    try {
        const result = await aiAgent.processCommand(command);
        
        console.log('\n✅ Command completed successfully!');
        console.log('🤖 Ready for your next command!');
        console.log('\n💬 To give me another command, run:');
        console.log(`   node ask-agent.js "your next command"`);
        
    } catch (error) {
        console.error('\n❌ Error processing command:', error.message);
        console.log('🔧 Please try again or use a different command');
    }
}

// Run if called directly
if (require.main === module) {
    askAgent();
}

module.exports = askAgent;