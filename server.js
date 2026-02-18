import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Environment (Load from parent .env.local if exists, or just .env)
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '../.env') }); // Fallback to parent
dotenv.config(); // Fallback to default

const app = express();
app.use(express.json());
// CRITICAL: Allow ALL origins for Codespace/Local development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY loaded (Bypassing RLS allowed)');
} else {
    console.warn('⚠️ WARNING: Using Anon Key. Server-side DB updates might fail if RLS is enabled!');
}

const PORT = 3000;

// Serve Static Files from the React App
app.use(express.static(join(__dirname, 'dist')));

// Handle Client-Side Routing (Serve index.html for all non-API routes)
app.get('*', (req, res) => {
    // Check if request is for API
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API Endpoint Not Found' });

    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// 1. INITIATION ENDPOINT (Proxy)
app.post('/api/initiate-payment', async (req, res) => {
    const { phone_number, amount, external_reference, callback_url } = req.body;

    // Helper to enforce 07... format (Local) required by Lipia
    const formatPhoneNumber = (phone) => {
        let p = phone.replace(/\D/g, ''); // Remove non-digits
        if (p.startsWith('254') && p.length === 12) return '0' + p.slice(3);
        if (p.length === 9) return '0' + p;
        return p;
    };

    const formattedPhone = formatPhoneNumber(phone_number);
    console.log("Processing Request:", { original: phone_number, formatted: formattedPhone, amount, external_reference }); // Debug Log
    const apiKey = process.env.VITE_LIPIA_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Server Configuration Error: API Key missing' });
    }

    try {
        const response = await fetch('https://lipia-api.kreativelabske.com/api/v2/payments/stk-push', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone_number: formattedPhone,
                amount,
                external_reference,
                callback_url,
                metadata: {
                    source: 'Kinthithe POS'
                }
            }),
            signal: AbortSignal.timeout(10000) // 10 second timeout for slow networks
        });

        const result = await response.json();
        console.log("Lipia Response:", result); // Debug Response
        res.json(result);
    } catch (error) {
        console.error('STK Push Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 2. CALLBACK ENDPOINT (User Provided Logic)
app.post('/api/callback', async (req, res) => {
    console.log('----- M-PESA CALLBACK RECEIVED -----');
    console.log(JSON.stringify(req.body, null, 2));

    const { Body, response } = req.body;

    // Handle Lipia Online Format
    if (response && response.Status === 'Success') {
        const { MpesaReceiptNumber, Amount, ExternalReference } = response;
        console.log(`✅ Lipia Payment Success! Receipt: ${MpesaReceiptNumber}, Ref: ${ExternalReference}`);

        // Update Sale in Supabase
        // CRITICAL: We update amount_paid to unblock the frontend polling.
        const { error, data } = await supabase
            .from('sales')
            .update({
                amount_paid: Amount,
                // payment_ref: MpesaReceiptNumber <-- REMOVED to prevent breaking polling
            })
            .eq('payment_ref', ExternalReference)
            .select();

        if (error) {
            console.error("❌ Error updating sale in DB:", error);
        } else {
            console.log("✅ DB Update Successful. Sale Record:", data);
        }

        return res.json({ result: 'success' });
    }

    // Handle Standard Safaricom Format
    // Handle Standard Safaricom Format (Fallback)
    if (Body && Body.stkCallback) {
        const { ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

        if (ResultCode === 0) {
            const amountItem = CallbackMetadata.Item.find(item => item.Name === 'Amount');
            const mpesaReceiptItem = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
            const phoneItem = CallbackMetadata.Item.find(item => item.Name === 'PhoneNumber');

            const amount = amountItem ? amountItem.Value : 0;
            const mpesaReceipt = mpesaReceiptItem ? mpesaReceiptItem.Value : 'N/A';
            const phone = phoneItem ? phoneItem.Value : 'N/A';

            console.log(`✅ Standard Payment Success! Receipt: ${mpesaReceipt}, Amount: ${amount}`);

            // Fuzzy Match Logic for Sales Table
            // We match by Amount and 'pending' (amount_paid is null or 0)
            const { data: sales } = await supabase
                .from('sales')
                .select('*')
                .eq('sale_type', 'mpesa')
                .or('amount_paid.is.null,amount_paid.eq.0')
                .eq('total_price', amount)
                .order('date', { ascending: false })
                .limit(1);

            if (sales && sales.length > 0) {
                const sale = sales[0];
                console.log(`✅ Found matching sale: ${sale.sale_id}. Updating...`);

                // Update Sale
                /* 
                   NOTE: We do NOT overwrite payment_ref here because the frontend 
                   is polling for the original Reference (POS...). 
                   We only update amount_paid to trigger the receipt.
                */
                const { error } = await supabase
                    .from('sales')
                    .update({
                        amount_paid: amount,
                        // We could store receipt elsewhere if needed
                    })
                    .eq('sale_id', sale.sale_id);

                if (error) console.error("Error updating sale:", error);
                else console.log("✅ Sale updated successfully!");
            } else {
                console.warn(`⚠️ No matching pending sale found for Amount: ${amount}`);
            }
        } else {
            console.log(`❌ Payment Failed. Code: ${ResultCode}`);
        }
        return res.json({ result: 'received' });
    }

    res.json({ result: 'received' });
});

app.listen(PORT, () => {
    console.log(`Inventory/Payment Server running on http://localhost:${PORT}`);
});
