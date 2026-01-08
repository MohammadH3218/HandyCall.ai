#!/usr/bin/env ts-node
/**
 * Script to associate AWS Connect phone number with a company
 *
 * Usage:
 *   ts-node scripts/associate-phone-number.ts <company_id>
 *
 * This script links the existing phone number +16057052030 to a company
 * so that incoming calls can be routed correctly.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PHONE_NUMBER = '+16057052030';
const PHONE_NUMBER_ID = '91c44d1d-fd3c-4c57-8ea5-c98e146d4b59';
const INSTANCE_ID = 'e55edc1b-5259-45ce-bb2c-1b3248c6031b';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'handycall_dev_';

async function associatePhoneNumber(companyId: string) {
  try {
    console.log(`\nAssociating phone number ${PHONE_NUMBER} with company ${companyId}...`);

    // 1. Check if company exists
    const getCommand = new GetCommand({
      TableName: `${TABLE_PREFIX}companies`,
      Key: { company_id: companyId },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      console.error(`❌ Company ${companyId} not found in database`);
      process.exit(1);
    }

    const company = result.Item;
    console.log(`✅ Found company: ${company.company_name}`);

    // 2. Update company with Connect phone number details
    const updateCommand = new UpdateCommand({
      TableName: `${TABLE_PREFIX}companies`,
      Key: { company_id: companyId },
      UpdateExpression: 'SET connect_phone_number_id = :phone_id, connect_phone_number = :phone, connect_instance_id = :instance, updated_at = :updated',
      ExpressionAttributeValues: {
        ':phone_id': PHONE_NUMBER_ID,
        ':phone': PHONE_NUMBER,
        ':instance': INSTANCE_ID,
        ':updated': Date.now(),
      },
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await docClient.send(updateCommand);
    const updatedCompany = updateResult.Attributes;

    console.log('\n✅ Successfully associated phone number with company!');
    console.log('\nUpdated company details:');
    console.log(`  Company Name: ${updatedCompany?.company_name}`);
    console.log(`  Company ID: ${updatedCompany?.company_id}`);
    console.log(`  Connect Phone Number: ${updatedCompany?.connect_phone_number}`);
    console.log(`  Connect Phone Number ID: ${updatedCompany?.connect_phone_number_id}`);
    console.log(`  Connect Instance ID: ${updatedCompany?.connect_instance_id}`);

    console.log('\n🎉 Done! You can now make test calls to', PHONE_NUMBER);
    console.log('   The call will be routed to this company.');

  } catch (error) {
    console.error('❌ Error associating phone number:', error);
    process.exit(1);
  }
}

async function listCompanies() {
  try {
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const scanCommand = new ScanCommand({
      TableName: `${TABLE_PREFIX}companies`,
      Limit: 10,
    });

    const result = await docClient.send(scanCommand);

    if (!result.Items || result.Items.length === 0) {
      console.log('\n⚠️  No companies found in database');
      console.log('   Create a company first by registering at: http://localhost:3001/register');
      return;
    }

    console.log('\nAvailable companies:');
    console.log('════════════════════════════════════════════════════════════════');

    result.Items.forEach((company: any, index: number) => {
      console.log(`\n${index + 1}. ${company.company_name}`);
      console.log(`   ID: ${company.company_id}`);
      console.log(`   Email: ${company.email}`);
      console.log(`   Status: ${company.status}`);
      if (company.connect_phone_number) {
        console.log(`   ✓ Already has Connect phone: ${company.connect_phone_number}`);
      }
    });

    console.log('\n════════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error listing companies:', error);
  }
}

// Main
const main = async () => {
  console.log('\n📞 AWS Connect Phone Number Association Script');
  console.log('==============================================');

  const companyId = process.argv[2];

  if (!companyId) {
    console.log('\nUsage: ts-node scripts/associate-phone-number.ts <company_id>');
    console.log('\nTo see available companies, run with --list flag:');
    console.log('       ts-node scripts/associate-phone-number.ts --list\n');

    if (process.argv.includes('--list') || process.argv.includes('-l')) {
      await listCompanies();
    } else {
      console.log('Listing available companies...\n');
      await listCompanies();
    }

    process.exit(0);
  }

  await associatePhoneNumber(companyId);
};

main();
