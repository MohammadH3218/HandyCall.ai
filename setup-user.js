const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const region = 'us-east-1';

const ddbClient = new DynamoDBClient({ region });
const dynamodb = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region });

async function setupUser() {
  const email = 'mohammadh3218@gmail.com';
  const password = 'Syzymh66!'; // Will hash this for DynamoDB
  const userPoolId = 'us-east-1_gBsGtRPnM'; // users pool

  console.log('Setting up user:', email);

  // Step 1: Check if user already exists in DynamoDB
  const existingUserQuery = await dynamodb.send(new QueryCommand({
    TableName: 'handycall_prod_users',
    IndexName: 'email-index',
    KeyConditionExpression: '#email = :email',
    ExpressionAttributeNames: { '#email': 'email' },
    ExpressionAttributeValues: { ':email': email },
    Limit: 1
  }));

  if (existingUserQuery.Items && existingUserQuery.Items.length > 0) {
    console.log('User already exists in DynamoDB:', existingUserQuery.Items[0]);
    return;
  }

  // Step 2: Create a company
  const companyId = uuidv4();
  const timestamp = Date.now();

  const company = {
    company_id: companyId,
    company_name: 'Mohammad Test Company',
    service_type: 'GENERAL',
    phone_number: '+1234567890',
    email: email,
    status: 'TRIAL',
    timezone: 'America/New_York',
    business_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' }
    },
    created_at: timestamp,
    updated_at: timestamp,
    trial_ends_at: timestamp + (14 * 24 * 60 * 60 * 1000) // 14 days
  };

  console.log('Creating company:', company.company_name);
  await dynamodb.send(new PutCommand({
    TableName: 'handycall_prod_companies',
    Item: company
  }));
  console.log('✅ Company created with ID:', companyId);

  // Step 3: Create user in DynamoDB
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    company_id: companyId,
    user_id: userId,
    email: email,
    first_name: 'Mohammad',
    last_name: 'User',
    role: 'OWNER',
    is_active: true,
    password_hash: passwordHash,
    created_at: timestamp,
    updated_at: timestamp
  };

  console.log('Creating user in DynamoDB...');
  await dynamodb.send(new PutCommand({
    TableName: 'handycall_prod_users',
    Item: user
  }));
  console.log('✅ User created in DynamoDB');

  // Step 4: Update Cognito user to add custom:company_id attribute
  console.log('Updating Cognito user attributes...');
  await cognitoClient.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: [
      { Name: 'custom:company_id', Value: companyId }
    ]
  }));
  console.log('✅ Cognito user updated with company_id');

  console.log('\n🎉 Setup complete!');
  console.log('Company ID:', companyId);
  console.log('User ID:', userId);
  console.log('Email:', email);
  console.log('Role:', user.role);
}

setupUser()
  .then(() => {
    console.log('\n✅ User setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting up user:', error);
    process.exit(1);
  });
