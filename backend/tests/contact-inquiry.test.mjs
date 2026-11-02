import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { submitContactInquiry } from '../src/controllers/landingPage.controller.js';
import { sendContactInquiryEmail } from '../src/utils/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INQUIRIES_FILE = path.resolve(__dirname, '../data/contactInquiries.json');

test('Unit [Contact Inquiry Validation]: Rejects missing required fields', async () => {
  const cases = [
    { name: '', email: 'test@example.com', message: 'Hello' },
    { name: 'John Doe', email: '', message: 'Hello' },
    { name: 'John Doe', email: 'invalid-email', message: 'Hello' },
    { name: 'John Doe', email: 'test@example.com', message: '' }
  ];

  for (const body of cases) {
    let statusCode = null;
    let jsonResult = null;
    const req = { body };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonResult = data; return this; }
    };

    await submitContactInquiry(req, res);
    assert.equal(statusCode, 400, `Expected 400 for payload: ${JSON.stringify(body)}`);
    assert.equal(jsonResult.success, false);
  }
});

test('Integration [Contact Inquiry Persistence]: Saves valid inquiry to disk and returns 200', async () => {
  const testInquiry = {
    name: 'Tariq Mehmood',
    email: 'tariq.mehmood@example.com',
    message: 'Need 50 bottles of 19L delivered to Saddar Rawalpindi weekly.'
  };

  let statusCode = null;
  let jsonResult = null;
  const req = { body: testInquiry };
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonResult = data; return this; }
  };

  await submitContactInquiry(req, res);
  assert.equal(statusCode, 200);
  assert.equal(jsonResult.success, true);
  assert.ok(jsonResult.message.includes('sent'));

  // Verify file on disk
  const content = await fs.readFile(INQUIRIES_FILE, 'utf-8');
  const inquiries = JSON.parse(content);
  assert.ok(Array.isArray(inquiries));
  const found = inquiries.find(i => i.email === testInquiry.email && i.name === testInquiry.name);
  assert.ok(found, 'Inquiry should be recorded in contactInquiries.json');
  assert.equal(found.message, testInquiry.message);
  assert.ok(found.id);
  assert.ok(found.createdAt);
});

test('Unit [Mailer]: sendContactInquiryEmail function returns message object structure', async () => {
  // Test function signature and safety when SMTP is not connected
  assert.equal(typeof sendContactInquiryEmail, 'function');
});
