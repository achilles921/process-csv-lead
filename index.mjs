import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3 = new S3Client({ region: 'us-east-2' }); // Adjust region as needed

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  const results = [];

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    const stream = response.Body;

    await new Promise((resolve, reject) => {
      Readable.from(stream)
        .pipe(csvParser(['First Name', 'Last Name', 'Email', 'Phone', 'Quote']))
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('Parsed rows:', results.length);
    results.forEach(row => {
      console.log(`Lead: ${row['First Name']} ${row['Last Name']} - ${row.Email}`);
    });

    return { statusCode: 200, body: 'CSV processed successfully.' };

  } catch (error) {
    console.error('Error processing CSV:', error);
    throw new Error('Failed to process file');
  }


  const leadData = await getLead(email, phone);
  console.log('get lead data response: ', leadData);

  if (!leadData) {
    console.log('No lead found');
    return true;
  }

}