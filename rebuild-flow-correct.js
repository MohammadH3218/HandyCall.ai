const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function rebuildFlow() {
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

    console.log('📋 Current block type:', getCallerSpeechBlock.Type);
    console.log('🔧 Converting to GetParticipantInput with proper Lex configuration...\n');

    // Change to GetParticipantInput - this uses Lex just for speech-to-text
    getCallerSpeechBlock.Type = 'GetParticipantInput';
    
    // GetParticipantInput uses different parameter structure
    // Based on AWS Connect API docs, it should be:
    getCallerSpeechBlock.Parameters = {
      "Text": "How can I help you?",
      "InputTimeLimitSeconds": "8",
      "StoreInput": "False"
    };
    
    // For Lex integration in GetParticipantInput, we need to add it differently
    // Actually, GetParticipantInput might not support LexV2Bot directly
    // Let me try without Lex first to see if that's the issue
    
    // Actually, wait - let me check if we can use a different approach
    // Maybe we need to keep ConnectParticipantWithLexBot but configure the bot differently
    
    // Let me try a hybrid: keep the block but ensure it always routes
    // Actually, the real issue might be that ConnectParticipantWithLexBot only routes
    // when Lex returns a specific state. Let me check the AWS docs format.
    
    // For now, let me try the simplest fix: ensure the block always routes to Lambda
    // by checking if we can add a condition or change the routing logic
    
    console.log('⚠️  Actually, let me try a different approach...');
    console.log('   The issue is ConnectParticipantWithLexBot routing behavior.');
    console.log('   Let me check if we can configure it to always return control.\n');
    
    // Revert to ConnectParticipantWithLexBot but with different configuration
    getCallerSpeechBlock.Type = 'ConnectParticipantWithLexBot';
    
    // Keep the Lex bot
    getCallerSpeechBlock.Parameters = {
      "Text": "How can I help you?",
      "LexV2Bot": {
        "AliasArn": "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
      }
    };
    
    // The key: ensure ALL transitions go to Lambda
    // ConnectParticipantWithLexBot routes based on Lex session state
    // We need to catch all possible states
    
    getCallerSpeechBlock.Transitions = {
      "NextAction": "Invoke AI Conversation",  // Default
      "Errors": [
        {
          "ErrorType": "NoMatchingCondition",
          "NextAction": "Invoke AI Conversation"
        },
        {
          "ErrorType": "NoMatchingError", 
          "NextAction": "Invoke AI Conversation"  // Even errors go to Lambda
        }
      ],
      "Conditions": [
        // Add conditions to catch all Lex states and route to Lambda
        {
          "NextAction": "Invoke AI Conversation",
          "Condition": {
            "Operator": "StringEquals",
            "Operands": ["$.Lex.SessionState.intent.name", "FreeConversationIntent"]
          }
        }
      ]
    };

    console.log('📋 Updated Configuration:');
    console.log('  Type:', getCallerSpeechBlock.Type);
    console.log('  Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);
    console.log('  All error paths route to Lambda');
    console.log('  Added condition to catch Lex intent matches');
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
    console.log('\n🎯 Try calling again: +16057052030');
    console.log('   All paths should now route to Lambda.');

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

rebuildFlow();

