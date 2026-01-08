const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixSimpleRouting() {
  try {
    console.log('🔍 Fetching current contact flow...\n');
    const describeCommand = new DescribeContactFlowCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
    });

    const response = await client.send(describeCommand);
    const flow = JSON.parse(response.ContactFlow.Content);

    const getCallerSpeechBlock = flow.Actions.find(a => a.Identifier === 'Get Caller Speech');

    if (!getCallerSpeechBlock) {
      console.error('❌ Could not find "Get Caller Speech" block!');
      process.exit(1);
    }

    console.log('🔧 Simplifying ConnectParticipantWithLexBot configuration...\n');

    // Keep ConnectParticipantWithLexBot
    getCallerSpeechBlock.Type = 'ConnectParticipantWithLexBot';
    
    // Minimal configuration
    getCallerSpeechBlock.Parameters = {
      "Text": "How can I help you?",
      "LexV2Bot": {
        "AliasArn": "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
      }
    };
    
    // Simplest possible routing - just default and errors
    getCallerSpeechBlock.Transitions = {
      "NextAction": "Invoke AI Conversation",
      "Errors": [
        {
          "ErrorType": "NoMatchingCondition",
          "NextAction": "Invoke AI Conversation"
        },
        {
          "ErrorType": "NoMatchingError",
          "NextAction": "Invoke AI Conversation"
        }
      ]
    };

    console.log('📋 Simplified Configuration:');
    console.log('  Type: ConnectParticipantWithLexBot');
    console.log('  Default NextAction: Invoke AI Conversation');
    console.log('  All error paths: Invoke AI Conversation');
    console.log('');

    // Update the flow
    console.log('💾 Updating contact flow...\n');
    const updateCommand = new UpdateContactFlowContentCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
      Content: JSON.stringify(flow),
    });

    await client.send(updateCommand);

    console.log('✅ Contact flow updated!');
    console.log('\n⚠️  NOTE: ConnectParticipantWithLexBot may still not route correctly.');
    console.log('   This block type is designed for full Lex conversations.');
    console.log('   If this still doesn\'t work, we may need to:');
    console.log('   1. Configure Lex intent to return control explicitly');
    console.log('   2. Use a different speech recognition method');
    console.log('   3. Use Connect\'s built-in speech recognition');
    console.log('\n🎯 Try calling again: +16057052030');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.problems) {
      console.error('   Problems:', JSON.stringify(error.problems, null, 2));
    }
    process.exit(1);
  }
}

fixSimpleRouting();

