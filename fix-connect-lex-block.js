const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixConnectLexBlock() {
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

    console.log('📋 Current Configuration:');
    console.log('  Type:', getCallerSpeechBlock.Type);
    console.log('  Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);
    console.log('');

    // The block is ConnectParticipantWithLexBot - we need to ensure it routes correctly
    // The key is making sure ALL paths (including NoMatchingCondition) route to Lambda
    
    // Ensure default routes to Lambda
    getCallerSpeechBlock.Transitions.NextAction = 'Invoke AI Conversation';
    
    // Update error routes - ALL should route to Lambda so we get the transcript
    getCallerSpeechBlock.Transitions.Errors = [
      {
        "ErrorType": "NoMatchingCondition",
        "NextAction": "Invoke AI Conversation"  // This is key - even if no intent matches, we still get transcript
      },
      {
        "ErrorType": "NoMatchingError",
        "NextAction": "Error Message"  // Only actual errors go to error message
      }
    ];

    // Ensure parameters are correct
    if (!getCallerSpeechBlock.Parameters) {
      getCallerSpeechBlock.Parameters = {};
    }
    
    // Keep the Lex bot configuration
    if (!getCallerSpeechBlock.Parameters.LexV2Bot) {
      getCallerSpeechBlock.Parameters.LexV2Bot = {
        "AliasArn": "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
      };
    }
    
    // Add the prompt text if missing
    if (!getCallerSpeechBlock.Parameters.Text) {
      getCallerSpeechBlock.Parameters.Text = "How can I help you?";
    }

    console.log('📋 Updated Configuration:');
    console.log('  Type:', getCallerSpeechBlock.Type);
    console.log('  Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);
    console.log('  Error Routes:');
    getCallerSpeechBlock.Transitions.Errors.forEach(e => {
      console.log(`    - ${e.ErrorType} -> ${e.NextAction}`);
    });
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
    console.log('   - ConnectParticipantWithLexBot will capture speech');
    console.log('   - Even if no intent matches (NoMatchingCondition), it routes to Lambda');
    console.log('   - Lambda will receive $.Lex.InputTranscript with the speech');
    console.log('\n🎯 Try calling again: +16057052030');
    console.log('   The transcript should now be passed to Lambda!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('   Status Code:', error.$metadata.httpStatusCode);
      console.error('   Request ID:', error.$metadata.requestId);
    }
    if (error.problems) {
      console.error('   Problems:', JSON.stringify(error.problems, null, 2));
    }
    process.exit(1);
  }
}

fixConnectLexBlock();

