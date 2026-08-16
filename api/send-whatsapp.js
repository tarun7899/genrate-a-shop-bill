/** Send bill PDF to a customer via WhatsApp Cloud API (document + caption). */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return res.status(503).json({ error: 'WhatsApp API not configured', configured: false });
  }

  try {
    const { to, pdfUrl, caption, fileName } = req.body || {};
    const phone = String(to || '').replace(/\D/g, '');
    if (!phone || !pdfUrl) {
      return res.status(400).json({ error: 'Missing phone or PDF URL' });
    }

    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'document',
          document: {
            link: pdfUrl,
            filename: fileName || 'Bill.pdf',
            caption: String(caption || '').slice(0, 1024),
          },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'WhatsApp send failed';
      return res.status(response.status).json({ error: message, details: data });
    }

    return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id });
  } catch {
    return res.status(500).json({ error: 'Could not send WhatsApp message' });
  }
}
