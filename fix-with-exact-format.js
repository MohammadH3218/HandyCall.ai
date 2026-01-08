const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixWithExactFormat() {
  try {
    console.log('🔍 Fetching current contact flow...\n');
    const describeCommand = new DescribeContactFlowCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
    });

    const response = await client.send(describeCommand);
    const flow = JSON.parse(response.ContactFlow.Content);

    // Find the "Get Caller Speech" block
    const getCallerSpeechBlock = flow.Actions.find(a => a.Identifier === 'Get Caller Speech');

    if (!getCallerSpeechBlock) {
      console.error('❌ Could not find "Get Caller Speech" block!');
      process.exit(1);
    }

    console.log('🔧 Updating to GetParticipantInput with exact format from working flow...\n');

    // Use the EXACT format from the original JSON file
    getCallerSpeechBlock.Type = 'GetParticipantInput';
    
    // Exact format from handycall-conversational-flow.json lines 71-80
    getCallerSpeechBlock.Parameters = {
      "Text": "How can I help you?",
      "InputTimeLimitSeconds": "8",
      "StoreInput": "False",
      "LexV2Bot": {
        "AliasArn": "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
      }
    };
    
    // Exact transitions from the original
    getCallerSpeechBlock.Transitions = {
      "NextAction": "Invoke AI Conversation",
      "Errors": [
        {
          "ErrorType": "NoMatchingError",
          "NextAction": "Error Message"
        },
        {
          "ErrorType": "InputTimeLimitExceeded",
          "NextAction": "Get Caller Speech"  // Loop back
        }
      ]
    };

    console.log('📋 Updated Configuration:');
    console.log('  Type: GetParticipantInput');
    console.log('  Parameters:', JSON.stringify(getCallerSpeechBlock.Parameters, null, 2));
    console.log('');

    // Update the flow
    console.log('💾 Updating contact flow...\n');
    const updateCommand = new UpdateContactFlowContentCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
      Content: JSON.stringify(flow),
    });

    await client.send(updateCommand);

    console.log('✅ Contact flow updated successfully!');
    console.log('\n📞 Configuration:');
    console.log('   - GetParticipantInput block uses Lex for speech-to-text');
    console.log('   - Transcript will be available as $.Lex.InputTranscript');
    console.log('   - Routes directly to Lambda after speech capture');
    console.log('\n🎯 Try calling again: +16057052030');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('   Status Code:', error.$metadata.httpStatusCode);
      console.error('   Request ID:', error.$metadata.requestId);
    }
    if (error.problems) {
      console.error('   Problems:', JSON.stringify(error.problems, null, 2));
      console.log('\n💡 The API is rejecting LexV2Bot in GetParticipantInput.');
      console.log('   This might be a Connect API limitation.');
      console.log('   We may need to use ConnectParticipantWithLexBot differently.');
    }
    process.exit(1);
  }
}

fixWithExactFormat();

