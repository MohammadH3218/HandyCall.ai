const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function fixContactFlow() {
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

    if (!getCallerSpeechBlock) {
      console.error('Could not find "Get Caller Speech" block!');
      process.exit(1);
    }

    console.log('Current Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);

    // Fix the routing
    getCallerSpeechBlock.Transitions.NextAction = 'Invoke AI Conversation';

    console.log('Updated Default NextAction:', getCallerSpeechBlock.Transitions.NextAction);

    // Update the flow
    console.log('\nUpdating contact flow...');
    const updateCommand = new UpdateContactFlowContentCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
      Content: JSON.stringify(flow),
    });

    await client.send(updateCommand);

    console.log('✅ Contact flow updated successfully!');
    console.log('The "Get Caller Speech" block now routes to "Invoke AI Conversation" on success.');
    console.log('\nTry calling again: +16057052030');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixContactFlow();
