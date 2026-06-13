const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.post('/webhook/paystack', async (req, res) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    const meta = data.metadata || {};
    await sb.from('bookings').insert({
      paystack_ref:  data.reference,
      patient_name:  meta.patient_name || '',
      phone:         meta.phone || '',
      email:         data.customer?.email || '',
      service:       meta.service || '',
      address:       meta.address || '',
      complaint:     meta.complaint || '',
      scheduled_at:  meta.scheduled_at || '',
      amount:        data.amount / 100,
      status:        'confirmed'
    });
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => res.send('Ascle webhook running'));

app.listen(process.env.PORT || 3000);
