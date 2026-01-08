const { ConnectClient, DescribeContactFlowCommand } = require('@aws-sdk/client-connect');

const client = new ConnectClient({ region: 'us-east-1' });
const instanceId = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';
const contactFlowId = 'e65be6c8-63b3-48f3-8e04-0377384df3dd';

async function debugFlow() {
  try {
    const command = new DescribeContactFlowCommand({
      InstanceId: instanceId,
      ContactFlowId: contactFlowId,
    });

    const response = await client.send(command);
    const flow = JSON.parse(response.ContactFlow.Content);

    console.log('=== COMPLETE FLOW STRUCTURE ===\n');

    flow.Actions.forEach(action => {
      console.log(`Block: ${action.Identifier}`);
      console.log(`  Type: ${action.Type}`);
      console.log(`  Default NextAction: ${action.Transitions.NextAction || 'NONE'}`);

      if (action.Transitions.Errors && action.Transitions.Errors.length > 0) {
        console.log('  Error Routes:');
        action.Transitions.Errors.forEach(e => {
          console.log(`    - ${e.ErrorType} -> ${e.NextAction}`);
        });
      }

      if (action.Transitions.Conditions && action.Transitions.Conditions.length > 0) {
        console.log('  Condition Routes:');
        action.Transitions.Conditions.forEach(c => {
          console.log(`    - ${JSON.stringify(c.Condition)} -> ${c.NextAction}`);
        });
      }

      console.log('');
    });

    console.log('\n=== POTENTIAL ISSUE ===');
    const getCallerSpeech = flow.Actions.find(a => a.Identifier === 'Get Caller Speech');
    console.log('Get Caller Speech block type:', getCallerSpeech.Type);
    console.log('Expected type: ConnectParticipantWithLexBot');

    if (getCallerSpeech.Type !== 'ConnectParticipantWithLexBot') {
      console.log('❌ ERROR: Block type is wrong!');
    } else {
      console.log('✅ Block type is correct');
      console.log('Lex bot ARN:', getCallerSpeech.Parameters.LexV2Bot?.AliasArn);
      console.log('Default routing:', getCallerSpeech.Transitions.NextAction);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugFlow();
