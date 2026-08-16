export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, fileName } = req.body || {};
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing PDF data' });
    }

    const buffer = Buffer.from(pdfBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName || 'Bill.pdf'}"`,
    );
    return res.status(200).send(buffer);
  } catch {
    return res.status(500).json({ error: 'Download failed' });
  }
}
