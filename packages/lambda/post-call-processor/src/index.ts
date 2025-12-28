import { S3Event } from './types/s3.types';
import { DynamoDBService } from './services/dynamodb.service';
import { S3Service } from './services/s3.service';
import { TranscribeService } from './services/transcribe.service';
import { BedrockService } from './services/bedrock.service';
import { v4 as uuidv4 } from 'uuid';

const TRANSCRIPTS_BUCKET = process.env.S3_BUCKET_TRANSCRIPTS || 'handycall-transcripts-prod';

/**
 * Post-Call Processor Lambda Handler
 *
 * Triggered by S3 when a call recording is uploaded
 * Performs async processing:
 * 1. Transcribe the recording
 * 2. Generate summary with Claude Haiku
 * 3. Extract highlights (pricing, complaints, appointments)
 * 4. Detect flagged questions
 * 5. Update call record in DynamoDB
 * 6. Store transcript in S3
 */
export const handler = async (event: S3Event): Promise<void> => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      console.log(`Processing recording: s3://${bucket}/${key}`);

      // Extract call ID from the recording key
      // Expected format: recordings/{company_id}/{call_id}.wav
      const callId = extractCallIdFromKey(key);
      if (!callId) {
        console.error(`Could not extract call ID from key: ${key}`);
        continue;
      }

      // Step 1: Get call record from DynamoDB
      const call = await getCallRecord(callId);
      if (!call) {
        console.error(`Call record not found for call_id: ${callId}`);
        continue;
      }

      console.log(`Processing call for company: ${call.company_id}`);

      // Step 2: Transcribe the recording
      console.log('Starting transcription...');
      const { fullText, segments } = await TranscribeService.transcribeRecording(
        callId,
        bucket,
        key,
        TRANSCRIPTS_BUCKET,
      );

      console.log(`Transcription complete. Length: ${fullText.length} chars`);

      // Step 3: Generate summary with Claude Haiku
      console.log('Generating call summary...');
      const company = await getCompany(call.company_id);
      const companyName = company?.company_name || 'the company';

      const { summary, outcome, nextSteps } = await BedrockService.generateSummary(
        fullText,
        companyName,
      );

      console.log(`Summary generated: ${summary}`);

      // Step 4: Extract highlights
      console.log('Extracting call highlights...');
      const highlights = await BedrockService.extractHighlights(fullText, segments);
      console.log(`Found ${highlights.length} highlights`);

      // Store highlights in DynamoDB
      for (const highlight of highlights) {
        await createHighlight(call.company_id, callId, highlight);
      }

      // Step 5: Detect flagged questions
      console.log('Detecting flagged questions...');
      const flaggedQuestions = await BedrockService.detectFlaggedQuestions(fullText);
      console.log(`Found ${flaggedQuestions.length} potential flagged questions`);

      // Create flagged question records
      for (const fq of flaggedQuestions) {
        await createFlaggedQuestion(
          call.company_id,
          callId,
          call.contact_id,
          fq.question,
          fq.context,
        );
      }

      // Step 6: Store transcript in S3
      const transcriptKey = `transcripts/${call.company_id}/${callId}.json`;
      await S3Service.uploadJSON(TRANSCRIPTS_BUCKET, transcriptKey, {
        call_id: callId,
        company_id: call.company_id,
        contact_id: call.contact_id,
        full_text: fullText,
        segments: segments,
        summary: summary,
        outcome: outcome,
        next_steps: nextSteps,
        highlights: highlights,
        flagged_questions: flaggedQuestions,
        processed_at: new Date().toISOString(),
      });

      console.log(`Transcript stored: s3://${TRANSCRIPTS_BUCKET}/${transcriptKey}`);

      // Step 7: Update call record in DynamoDB
      await DynamoDBService.update(
        'calls',
        { company_id: call.company_id, call_id: callId },
        {
          transcript_url: `s3://${TRANSCRIPTS_BUCKET}/${transcriptKey}`,
          summary: summary,
          outcome: outcome,
          status: 'COMPLETED',
          ended_at: Date.now(),
          updated_at: Date.now(),
        },
      );

      console.log(`Call record updated successfully for ${callId}`);
    } catch (error) {
      console.error('Error processing recording:', error);
      // Continue processing other records even if one fails
    }
  }
};

/**
 * Extract call ID from S3 key
 */
function extractCallIdFromKey(key: string): string | null {
  // Expected format: recordings/{company_id}/{call_id}.wav
  const match = key.match(/recordings\/[^/]+\/([^/.]+)\./);
  return match ? match[1] : null;
}

/**
 * Get call record from DynamoDB
 */
async function getCallRecord(callId: string): Promise<any> {
  try {
    // We need to scan because we only have call_id, not company_id
    // In production, consider adding a GSI on call_id for better performance
    const calls = await DynamoDBService.scan(
      'calls',
      'call_id = :call_id',
      { ':call_id': callId },
    );

    return calls.length > 0 ? calls[0] : null;
  } catch (error) {
    console.error('Error getting call record:', error);
    return null;
  }
}

/**
 * Get company record
 */
async function getCompany(companyId: string): Promise<any> {
  try {
    return await DynamoDBService.get('companies', { company_id: companyId });
  } catch (error) {
    console.error('Error getting company:', error);
    return null;
  }
}

/**
 * Create a call highlight
 */
async function createHighlight(
  companyId: string,
  callId: string,
  highlight: { type: string; content: string; timestamp?: number },
): Promise<void> {
  try {
    const highlightId = uuidv4();
    const now = Date.now();

    await DynamoDBService.put('call_highlights', {
      company_id: companyId,
      highlight_id: highlightId,
      call_id: callId,
      type: highlight.type,
      content: highlight.content,
      timestamp: highlight.timestamp,
      created_at: now,
      type_created: `${highlight.type}#${now}`,
    });
  } catch (error) {
    console.error('Error creating highlight:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Create a flagged question
 */
async function createFlaggedQuestion(
  companyId: string,
  callId: string,
  contactId: string,
  question: string,
  context: string,
): Promise<void> {
  try {
    const flaggedId = uuidv4();
    const now = Date.now();

    await DynamoDBService.put('flagged_questions', {
      company_id: companyId,
      flagged_id: flaggedId,
      call_id: callId,
      contact_id: contactId,
      question: question,
      context: context,
      status: 'OPEN',
      created_at: now,
      updated_at: now,
      status_created: `OPEN#${now}`,
    });
  } catch (error) {
    console.error('Error creating flagged question:', error);
    // Don't throw - this is not critical
  }
}
