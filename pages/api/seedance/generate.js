const { createVideoGeneration } = require('../../../lib/seedance');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      prompt,
      model,
      generationType,
      imageUrls,
      videoUrls,
      audioUrls,
      duration,
      aspectRatio,
      resolution,
      generateAudio,
      watermark,
      seed,
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const callbackUrl = siteUrl ? `${siteUrl}/api/seedance/webhook` : undefined;

    const result = await createVideoGeneration({
      prompt,
      model,
      generationType,
      imageUrls,
      videoUrls,
      audioUrls,
      duration,
      aspectRatio,
      resolution,
      generateAudio,
      watermark,
      seed,
      callbackUrl,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Seedance generate error:', err);
    return res.status(500).json({ error: err.message });
  }
};
