# Complete Amazon Connect Setup Guide

Since AWS CLI contact flow creation has strict validation, we'll use a hybrid approach:
1. **Import the contact flow via Console** (easiest)
2. **Use CLI for everything else** (phone number association, etc.)

## Step 1: Import Contact Flow (Console - 2 minutes)

1. Go to Amazon Connect Console: https://console.aws.amazon.com/connect/
2. Select your instance: `e55edc1b-5259-45ce-bb2c-1b3248c6031b`
3. Go to **Routing** → **Contact flows**
4. Click **Create contact flow**
5. In the flow designer, click the dropdown (⌄) next to **Save** button
6. Select **Import flow (beta)**
7. Choose the file: `handycall-flow-final.json` (or use the provided minimal version below)
8. Click **Import**
9. Review the flow - it should show:
   - Update Contact Attributes (sets UserInput to empty)
   - Invoke AWS Lambda Function (calls your orchestrator)
   - Play Prompt (speaks the AI response)
   - Disconnect
10. Click **Save**
11. Click **Publish**

## Step 2: Get Your Contact Flow ID (CLI)

After saving, run this to get the flow ID:

```bash
aws connect list-contact-flows \
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b \
  --query 'ContactFlowSummaryList[?Name==`HandyCall AI Inbound`].Id' \
  --output text
```

Save this ID - you'll need it for the next step.

## Step 3: Associate Phone Number with Contact Flow (CLI)

```bash
# Replace CONTACT_FLOW_ID with the ID from Step 2
aws connect associate-phone-number-contact-flow \
  --phone-number-id 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 \
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b \
  --contact-flow-id CONTACT_FLOW_ID
```

**Note:** If the above command doesn't work (API might differ), use this alternative:

```bash
aws connect update-phone-number \
  --phone-number-id 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 \
  --target-arn arn:aws:connect:us-east-1:982081079378:instance/e55edc1b-5259-45ce-bb2c-1b3248c6031b/contact-flow/CONTACT_FLOW_ID
```

## Step 4: Verify Setup (CLI)

```bash
# Verify phone number is associated
aws connect describe-phone-number \
  --phone-number-id 91c44d1d-fd3c-4c57-8ea5-c98e146d4b59 \
  --instance-id e55edc1b-5259-45ce-bb2c-1b3248c6031b

# Verify company is registered
aws dynamodb get-item \
  --table-name handycall_prod_companies \
  --key '{"company_id":{"S":"test-handycall-001"}}' \
  --query 'Item.[company_name.S,phone_number.S,status.S]' \
  --output table
```

## Step 5: Test!

Call **+16057052030** from your phone. You should:
1. Hear the AI greeting from your agent config
2. Then the call will disconnect (since we have a minimal flow)

## Next Steps: Add Conversation Loop

Once the basic flow works, you can enhance it in the Console to add:
- Get customer input block
- Loop back to Lambda
- Store user input in contact attributes

---

## Troubleshooting

### Lambda not receiving UserInput parameter

The Lambda code reads from `contactData.Parameters.UserInput`. To pass this:
- In the Console, edit the "Invoke AWS Lambda Function" block
- Add a parameter: Key = `UserInput`, Value = `$.Attributes.UserInput`

### Flow not working

Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/handycall-call-orchestrator --follow
```

### Company not found

Verify the company is registered with the correct phone number:
```bash
aws dynamodb get-item \
  --table-name handycall_prod_companies \
  --key '{"company_id":{"S":"test-handycall-001"}}'
```

