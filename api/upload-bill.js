/** Temporary PDF hosting so WhatsApp can open the customer chat with a bill link. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, fileName } = req.body || {};
    if (!pdfBase64 || !fileName) {
      return res.status(400).json({ error: 'Missing PDF data' });
    }

    const buffer = Buffer.from(pdfBase64, 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'PDF too large' });
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(fileName, buffer, {
        access: 'public',
        contentType: 'application/pdf',
        addRandomSuffix: true,
      });
      return res.status(200).json({ url: blob.url });
    }

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), fileName);

    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();

    if (uploadData?.status !== 'success' || !uploadData?.data?.url) {
      throw new Error('Temporary upload failed');
    }

    const pageUrl = String(uploadData.data.url);
    const directUrl = pageUrl.includes('tmpfiles.org/')
      ? pageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
      : pageUrl;

    return res.status(200).json({ url: directUrl });
  } catch {
    return res.status(500).json({ error: 'Could not upload PDF' });
  }
}
