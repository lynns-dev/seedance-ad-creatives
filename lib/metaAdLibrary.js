const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

function getAccessToken() {
  const token = process.env.META_AD_LIBRARY_TOKEN;
  if (!token) {
    throw new Error('META_AD_LIBRARY_TOKEN is not set');
  }
  return token;
}

function daysRunning(ad) {
  const start = ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time) : null;
  const end = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time) : new Date();
  if (!start) return 0;
  return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
}

/**
 * Search Meta's public Ad Library for ads matching a keyword/page, and rank
 * them by how long they've been running as a rough "top performing" proxy
 * (the Ad Library API does not expose impressions/spend for most regular
 * commercial ads — only for political/issue ads in some countries — so
 * longevity is the best available signal: advertisers keep winning ads
 * live longer and kill losers fast).
 */
async function searchTopAds({ searchTerms, countries = ['US'], limit = 15 }) {
  if (!searchTerms) {
    throw new Error('searchTerms is required');
  }

  const params = new URLSearchParams({
    access_token: getAccessToken(),
    search_terms: searchTerms,
    ad_type: 'ALL',
    ad_active_status: 'ALL',
    ad_reached_countries: JSON.stringify(countries),
    media_type: 'VIDEO',
    fields: [
      'id',
      'page_name',
      'ad_creative_bodies',
      'ad_creative_link_titles',
      'ad_creative_link_descriptions',
      'ad_delivery_start_time',
      'ad_delivery_stop_time',
      'publisher_platforms',
    ].join(','),
    limit: String(Math.max(limit, 25)),
  });

  const res = await fetch(`${GRAPH_API_BASE}/ads_archive?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || res.statusText;
    throw new Error(`Meta Ad Library API error: ${message}`);
  }

  const ads = (data.data || []).map((ad) => ({
    id: ad.id,
    pageName: ad.page_name,
    bodies: ad.ad_creative_bodies || [],
    linkTitles: ad.ad_creative_link_titles || [],
    linkDescriptions: ad.ad_creative_link_descriptions || [],
    platforms: ad.publisher_platforms || [],
    daysRunning: daysRunning(ad),
  }));

  ads.sort((a, b) => b.daysRunning - a.daysRunning);

  return ads.slice(0, limit);
}

module.exports = { searchTopAds };
