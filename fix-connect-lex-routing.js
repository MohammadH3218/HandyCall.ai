const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixConnectLexRouting() {
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

    console.log('🔧 Configuring ConnectParticipantWithLexBot to always route to Lambda...\n');

    // Keep ConnectParticipantWithLexBot (required by API)
    getCallerSpeechBlock.Type = 'ConnectParticipantWithLexBot';
    
    // Keep Lex bot configuration
    getCallerSpeechBlock.Parameters = {
      "Text": "How can I help you?",
      "LexV2Bot": {
        "AliasArn": "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
      }
    };
    
    // The key: Add conditions to catch ALL possible Lex session states
    // ConnectParticipantWithLexBot routes based on Lex session state
    // We need to catch: ReadyForFulfillment, Fulfilled, Failed, ElicitIntent, etc.
    
    getCallerSpeechBlock.Transitions = {
      "NextAction": "Invoke AI Conversation",  // Default fallback
      "Errors": [
        {
          "ErrorType": "NoMatchingCondition",
          "NextAction": "Invoke AI Conversation"  // Catch-all for unmatched conditions
        },
        {
          "ErrorType": "NoMatchingError",
          "NextAction": "Invoke AI Conversation"  // Even errors go to Lambda
        }
      ],
      "Conditions": [
        // Catch when Lex is ready (intent recognized)
        {
          "NextAction": "Invoke AI Conversation",
          "Condition": {
            "Operator": "StringEquals",
            "Operands": ["$.Lex.SessionState.dialogAction.type", "ReadyForFulfillment"]
          }
        },
        // Catch when Lex fulfilled (intent completed)
        {
          "NextAction": "Invoke AI Conversation",
          "Condition": {
            "Operator": "StringEquals",
            "Operands": ["$.Lex.SessionState.dialogAction.type", "Close"]
          }
        },
        // Catch when Lex needs more info (elicit slot)
        {
          "NextAction": "Invoke AI Conversation",
          "Condition": {
            "Operator": "StringEquals",
            "Operands": ["$.Lex.SessionState.dialogAction.type", "ElicitSlot"]
          }
        },
        // Catch when Lex needs intent
        {
          "NextAction": "Invoke AI Conversation",
          "Condition": {
            "Operator": "StringEquals",
            "Operands": ["$.Lex.SessionState.dialogAction.type", "ElicitIntent"]
          }
        }
      ]
    };

    console.log('📋 Updated Configuration:');
    console.log('  Type: ConnectParticipantWithLexBot');
    console.log('  Default NextAction: Invoke AI Conversation');
    console.log('  Added conditions to catch all Lex session states');
    console.log('  All paths route to Lambda');
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
    console.log('   - ConnectParticipantWithLexBot captures speech');
    console.log('   - Conditions catch all Lex session states');
    console.log('   - All paths route to Lambda with transcript');
    console.log('\n🎯 Try calling again: +16057052030');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('   Status Code:', error.$metadata.httpStatusCode);
    }
    if (error.problems) {
      console.error('   Problems:', JSON.stringify(error.problems, null, 2));
    }
    process.exit(1);
  }
}

fixConnectLexRouting();

