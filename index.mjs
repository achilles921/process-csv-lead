import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { getLead } from './converts.mjs';

const s3 = new S3Client({ region: 'us-east-2' }); // Adjust region as needed

const processedKeys = new Set();

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  if (processedKeys.has(key)) {
    console.log(`Already processed ${key}, skipping.`);
    return { statusCode: 500, body: 'Handled error' }; 
  }

  processedKeys.add(key);

  const results = [];

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    const stream = response.Body;

    await new Promise((resolve, reject) => {
      Readable.from(stream)
        .pipe(csvParser(['Quote', 'First Name', 'Last Name', 'Email', 'Phone']))
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('Parsed rows:', results.length);
    for (const row of results) {
      console.log(`Lead: ${row['First Name']} ${row['Last Name']} - ${row.Email} - ${row.Phone} - ${row.Quote}`);
      const email = row['Email'];
      const phone = row['Phone'];
      const quote = row['Quote'];

      if (row['Phone'] === 'Phone')
        continue;
      
      if (!email && !phone) {
        console.log('No phone or email available on this row');
        continue;
      }

      const leadData = await getLead(email, phone);
      console.log('get lead data response: ', leadData);

      if (!leadData) {
        console.log('No lead found');
        continue;
      }

      const leadId = leadData.lead_id;
      const parsed = parseFloat(quote.replace(/[^0-9.-]+/g, ''));
      if (leadData.quote_value) {
        // sheet is higher, replace
        if (parsed > leadData.quote_value) {
          const updateLeadData = await updateQuoteValue(leadId, parsed);
          console.log('update lead response: ', updateLeadData);
        }
      } else {
        // Update lead quote value from csv
        const updateLeadData = await updateQuoteValue(leadId, parsed);
        console.log('update lead response: ', updateLeadData);
      }
    }

    return { statusCode: 200, body: 'CSV processed successfully.' };

  } catch (error) {
    console.log('Error processing CSV:', error);
    return { statusCode: 500, body: 'Handled error' }; 
  }

}