const { ConnectClient, DescribeContactFlowCommand, UpdateContactFlowContentCommand } = require('@aws-sdk/client-connect');
const fs = require('fs');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function recreateFlow() {
  try {
    // Get current flow to preserve the action IDs
    console.log('Fetching current flow...');
    const describeCommand = new DescribeContactFlowCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
    });

    const response = await client.send(describeCommand);
    const currentFlow = JSON.parse(response.ContactFlow.Content);

    // Map current identifiers
    const actionMap = {};
    currentFlow.Actions.forEach(action => {
      actionMap[action.Identifier] = action;
    });

    // Read the template flow
    const templateFlow = JSON.parse(fs.readFileSync('./handycall-conversational-flow.json', 'utf8'));

    // Only update the "Get Caller Speech" block
    const getCallerSpeech = currentFlow.Actions.find(a => a.Identifier === 'Get Caller Speech');
    const template = templateFlow.Actions.find(a => a.Type === 'GetParticipantInput');

    console.log('\nChanging block type from', getCallerSpeech.Type, 'to', template.Type);

    // Update the block with template configuration
    getCallerSpeech.Type = template.Type;
    getCallerSpeech.Parameters = template.Parameters;

    // Keep current transitions but add InputTimeLimitExceeded if missing
    const hasTimeoutError = getCallerSpeech.Transitions.Errors.find(e => e.ErrorType === 'InputTimeLimitExceeded');
    if (!hasTimeoutError) {
      getCallerSpeech.Transitions.Errors.push({
        ErrorType: 'InputTimeLimitExceeded',
        NextAction: 'Get Caller Speech'
      });
    }

    // Update the flow
    console.log('\nUpdating contact flow...');
    const updateCommand = new UpdateContactFlowContentCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
      Content: JSON.stringify(currentFlow),
    });

    await client.send(updateCommand);

    console.log('✅ Successfully updated flow!');
    console.log('\nThe "Get Caller Speech" block now uses GetParticipantInput type.');
    console.log('Try calling +16057052030 again!');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.$response) {
      console.error('Response:', error.$response);
    }
    process.exit(1);
  }
}

recreateFlow();
