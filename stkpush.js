import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const initiatePayment = async (phone, label) => {
  console.log(`\n--- Testing Format: ${label} (${phone}) ---`);
  const paymentData = {
    phone_number: phone,
    amount: 10,
    external_reference: `TEST-${Date.now()}-${label}`,
    callback_url: 'https://kinthithe-store.com/api/callback',
    metadata: { source: 'Tester' }
  };

  try {
    const apiKey = (process.env.VITE_LIPIA_API_KEY || '').trim();
    const response = await fetch('https://lipia-api.kreativelabske.com/api/v2/payments/stk-push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ SUCCESS [${label}]:`, result.data.TransactionReference);
    } else {
      console.error(`❌ FAILED [${label}]:`, result.message);
      if (result.error) console.error('   Details:', JSON.stringify(result.error, null, 2));
    }
  } catch (error) {
    console.error(`⚠️ NETWORK ERROR [${label}]:`, error.message);
  }
};

const runTests = async () => {
  // 1. Standard 254
  await initiatePayment('254702322277', 'Standard');

  // 2. Local 07
  await initiatePayment('0702322277', 'Local');

  // 3. Plus +254
  await initiatePayment('+254702322277', 'Plus');
};

runTests();