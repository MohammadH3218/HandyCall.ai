const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixLexBlock() {
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
      console.log('Available blocks:', flow.Actions.map(a => a.Identifier).join(', '));
      process.exit(1);
    }

    console.log('📋 Current Configuration:');
    console.log('  Type:', getCallerSpeechBlock.Type);
    console.log('  Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);
    console.log('  Parameters:', JSON.stringify(getCallerSpeechBlock.Parameters, null, 2));
    console.log('');

    // Check if it's already the correct type
    if (getCallerSpeechBlock.Type === 'GetParticipantInput') {
      console.log('✅ Block is already GetParticipantInput type!');
      
      // Just verify the routing is correct
      if (getCallerSpeechBlock.Transitions.NextAction !== 'Invoke AI Conversation') {
        console.log('⚠️  Fixing routing...');
        getCallerSpeechBlock.Transitions.NextAction = 'Invoke AI Conversation';
      } else {
        console.log('✅ Routing is already correct!');
        console.log('\nThe flow should be working. If calls are still failing, the issue might be elsewhere.');
        return;
      }
    } else {
      console.log('🔧 Converting block from', getCallerSpeechBlock.Type, 'to GetParticipantInput...\n');
      
      // Change the block type
      getCallerSpeechBlock.Type = 'GetParticipantInput';
      
      // Update parameters to the correct format for GetParticipantInput
      const lexAliasArn = getCallerSpeechBlock.Parameters?.LexV2Bot?.AliasArn || 
                         'arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC';
      
      getCallerSpeechBlock.Parameters = {
        "Text": getCallerSpeechBlock.Parameters?.Text || "How can I help you?",
        "InputTimeLimitSeconds": "8",
        "StoreInput": "False",
        "LexV2Bot": {
          "AliasArn": lexAliasArn
        }
      };
      
      // Fix routing
      getCallerSpeechBlock.Transitions.NextAction = 'Invoke AI Conversation';
      
      // Update error routes
      getCallerSpeechBlock.Transitions.Errors = [
        {
          "ErrorType": "NoMatchingCondition",
          "NextAction": "Invoke AI Conversation"
        },
        {
          "ErrorType": "NoMatchingError",
          "NextAction": "Error Message"
        },
        {
          "ErrorType": "InputTimeLimitExceeded",
          "NextAction": "Invoke AI Conversation"
        }
      ];
    }

    console.log('📋 Updated Configuration:');
    console.log('  Type:', getCallerSpeechBlock.Type);
    console.log('  Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);
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
    console.log('\n📞 The "Get Caller Speech" block is now configured as GetParticipantInput with Lex.');
    console.log('   It will route to "Invoke AI Conversation" when speech is captured.');
    console.log('\n🎯 Try calling again: +16057052030');
    console.log('   The call should now work end-to-end!');

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

fixLexBlock();

