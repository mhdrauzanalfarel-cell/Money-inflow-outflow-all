import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  'https://keznmbtbayieobrtlzfp.supabase.co',
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { event } = req.body;
    if (!event) return res.status(400).end();

    const activity = event.activity || [];

    for (const act of activity) {
      const isIn = act.toAddress?.toLowerCase();
      const isOut = act.fromAddress?.toLowerCase();
      const value = act.value || 0;
      const asset = act.asset || 'ETH';
      const hash = act.hash;

      await supa.from('transactions').insert({
        id: hash,
        source: 'crypto',
        category: 'other_crypto',
        type: isIn ? 'income' : 'expense',
        usd: value,
        token: asset,
        note: `Auto: ${act.category}`,
        ts: Date.now()
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

