const { LexModelsV2Client, DescribeIntentCommand, UpdateIntentCommand } = require('@aws-sdk/client-lex-models-v2');

const client = new LexModelsV2Client({ region: 'us-east-1' });
const botId = 'MB9C3YAJSG';
const botVersion = 'DRAFT';
const localeId = 'en_US';
const intentId = 'UUHMCIWK3B'; // FreeConversationIntent

async function fixLexIntent() {
  try {
    console.log('🔍 Fetching current intent configuration...\n');
    
    const describeCommand = new DescribeIntentCommand({
      botId,
      botVersion,
      localeId,
      intentId,
    });

    const intent = await client.send(describeCommand);
    
    console.log('📋 Current Intent Configuration:');
    console.log('  Intent Name:', intent.intentName);
    console.log('  Fulfillment Code Hook:', intent.fulfillmentCodeHook ? 'ENABLED' : 'DISABLED');
    console.log('  Dialog Code Hook:', intent.dialogCodeHook ? 'ENABLED' : 'DISABLED');
    console.log('');

    // The key is to ensure the intent returns control to Connect
    // We need to set fulfillmentCodeHook to null and ensure it returns to Connect
    console.log('🔧 Updating intent to return control to Connect...\n');
    
    const updateCommand = new UpdateIntentCommand({
      botId,
      botVersion,
      localeId,
      intentId,
      intentName: intent.intentName,
      description: intent.description,
      sampleUtterances: intent.sampleUtterances,
      // Remove fulfillment code hook so it returns control to Connect
      fulfillmentCodeHook: null,
      dialogCodeHook: null,
      // Keep other settings
      initialResponseSetting: intent.initialResponseSetting,
      slotPriorities: intent.slotPriorities,
    });

    await client.send(updateCommand);

    console.log('✅ Intent updated successfully!');
    console.log('\n📞 Configuration:');
    console.log('   - Intent will no longer fulfill automatically');
    console.log('   - Control will return to Connect after speech capture');
    console.log('   - Connect will route to Lambda with transcript');
    console.log('\n⚠️  IMPORTANT: You need to BUILD the bot for changes to take effect!');
    console.log('   Run: aws lexv2-models build-bot --bot-id MB9C3YAJSG --bot-version DRAFT');
    console.log('\n🎯 After building, try calling again: +16057052030');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('   Status Code:', error.$metadata.httpStatusCode);
      console.error('   Request ID:', error.$metadata.requestId);
    }
    process.exit(1);
  }
}

fixLexIntent();

