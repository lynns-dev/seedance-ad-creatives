const { analyzeWebsite } = require('../../lib/websiteAnalyzer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const analysis = await analyzeWebsite(url);
    return res.status(200).json(analysis);
  } catch (err) {
    console.error('Site analysis error:', err);
    return res.status(500).json({ error: err.message });
  }
};
