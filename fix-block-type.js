const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixBlockType() {
  try {
    console.log('Fetching current contact flow...');
    const describeCommand = new DescribeContactFlowCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
    });

    const response = await client.send(describeCommand);
    const flow = JSON.parse(response.ContactFlow.Content);

    // Find the "Get Caller Speech" block
    const getCallerSpeechBlock = flow.Actions.find(a => a.Identifier === 'Get Caller Speech');

    console.log('Current block type:', getCallerSpeechBlock.Type);
    console.log('Current parameters:', JSON.stringify(getCallerSpeechBlock.Parameters, null, 2));

    // Change from ConnectParticipantWithLexBot to GetParticipantInput
    getCallerSpeechBlock.Type = 'GetParticipantInput';

    // Update parameters to match GetParticipantInput format
    getCallerSpeechBlock.Parameters = {
      Text: "How can I help you?",
      InputTimeLimitSeconds: "8",
      StoreInput: "False",
      LexV2Bot: {
        AliasArn: "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
      }
    };

    // Fix error routes - add InputTimeLimitExceeded
    if (!getCallerSpeechBlock.Transitions.Errors.find(e => e.ErrorType === 'InputTimeLimitExceeded')) {
      getCallerSpeechBlock.Transitions.Errors.push({
        ErrorType: 'InputTimeLimitExceeded',
        NextAction: 'Get Caller Speech' // Retry on timeout
      });
    }

    console.log('\nUpdated block type:', getCallerSpeechBlock.Type);
    console.log('Updated parameters:', JSON.stringify(getCallerSpeechBlock.Parameters, null, 2));

    // Update the flow
    console.log('\nUpdating contact flow...');
    const updateCommand = new UpdateContactFlowContentCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
      Content: JSON.stringify(flow),
    });

    await client.send(updateCommand);

    console.log('✅ Contact flow updated successfully!');
    console.log('\nChanges made:');
    console.log('  - Block type: ConnectParticipantWithLexBot → GetParticipantInput');
    console.log('  - This uses Lex for speech-to-text only, then returns control to Connect');
    console.log('  - Lambda will now be invoked with the transcript');
    console.log('\nTry calling again: +16057052030');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBlockType();
