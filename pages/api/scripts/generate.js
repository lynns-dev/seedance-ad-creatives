const { searchTopAds } = require('../../../lib/metaAdLibrary');
const { generateAdScripts } = require('../../../lib/scriptGenerator');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productDescription, searchTerms, countries, count } = req.body || {};

    if (!productDescription) {
      return res.status(400).json({ error: 'productDescription is required' });
    }
    if (!searchTerms) {
      return res.status(400).json({ error: 'searchTerms is required (keyword/competitor to scan the Meta Ad Library for)' });
    }

    let referenceAds = [];
    let scanWarning = null;
    try {
      referenceAds = await searchTopAds({ searchTerms, countries });
    } catch (err) {
      // Don't hard-fail script generation just because the ad scan failed
      // (e.g. missing/expired Meta token) - fall back to general conventions.
      console.error('Ad Library scan failed:', err);
      scanWarning = err.message;
    }

    const scripts = await generateAdScripts({ productDescription, referenceAds, count });

    return res.status(200).json({ scripts, referenceAds, scanWarning });
  } catch (err) {
    console.error('Script generation error:', err);
    return res.status(500).json({ error: err.message });
  }
};
