const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

const FETCH_TIMEOUT_MS = 15000;
const MAX_TEXT_CHARS = 8000;
const MAX_IMAGE_CANDIDATES = 12;

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
];

function assertPublicHttpUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must be http or https');
  }
  if (BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(url.hostname))) {
    throw new Error('URL host is not allowed');
  }
  return url;
}

const IMAGE_FILENAME_EXCLUDE = /(logo|icon|favicon|sprite|avatar|pixel|badge)/i;

function extractImageCandidates($, baseUrl) {
  const urls = new Set();

  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) urls.add(ogImage);

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) urls.add(src);
  });

  const resolved = [];
  for (const src of urls) {
    try {
      const abs = new URL(src, baseUrl).toString();
      if (IMAGE_FILENAME_EXCLUDE.test(abs)) continue;
      resolved.push(abs);
    } catch {
      // skip unresolvable URLs
    }
  }

  return resolved.slice(0, MAX_IMAGE_CANDIDATES);
}

async function fetchWebsite(rawUrl) {
  const url = assertPublicHttpUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    if (res.status === 403 || res.status === 503) {
      throw new Error(
        `Failed to fetch site (${res.status}) — this site's bot/anti-scraping protection (e.g. Cloudflare) is blocking the request. Skip this step and fill in the product description and reference image manually instead.`
      );
    }
    throw new Error(`Failed to fetch site (${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $('script, style, noscript').remove();

  const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
  const metaDescription =
    $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS);
  const images = extractImageCandidates($, res.url || url.toString());

  return { url: res.url || url.toString(), title, metaDescription, bodyText, images };
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

const ANALYSIS_TOOL = {
  name: 'return_analysis',
  description: 'Return the synthesized product analysis.',
  input_schema: {
    type: 'object',
    properties: {
      productDescription: {
        type: 'string',
        description: 'A concise (3-6 sentence) product description covering what it is, who it is for, and key selling points, written for use as ad creative brief input.',
      },
      suggestedSearchTerms: {
        type: 'string',
        description: 'A short keyword phrase (brand name or product category) suitable for searching the Meta Ad Library for comparable ads.',
      },
      bestImageUrls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Up to 6 of the given candidate image URLs (verbatim, unmodified) most likely to be genuine product photos rather than logos, icons, banners, or decorative UI images.',
      },
    },
    required: ['productDescription', 'suggestedSearchTerms', 'bestImageUrls'],
  },
};

/**
 * Fetch a website and use Claude to synthesize a product description, ad
 * search terms, and a shortlist of likely product-photo image URLs.
 */
async function analyzeWebsite(rawUrl) {
  const site = await fetchWebsite(rawUrl);
  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'return_analysis' },
    messages: [
      {
        role: 'user',
        content: `Analyze this product/brand website and prepare inputs for an ad creative generation tool.

URL: ${site.url}
Title: ${site.title}
Meta description: ${site.metaDescription}

Page text (truncated):
${site.bodyText}

Candidate image URLs found on the page:
${site.images.map((u, i) => `${i + 1}. ${u}`).join('\n') || '(none found)'}

Write the product description, suggested Ad Library search terms, and pick the best product image URLs from the candidates list above (copy them verbatim, do not invent new URLs).`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Model did not return structured analysis');
  }

  const validUrls = new Set(site.images);
  const bestImageUrls = (toolUse.input.bestImageUrls || []).filter((u) => validUrls.has(u));

  return {
    sourceUrl: site.url,
    title: site.title,
    productDescription: toolUse.input.productDescription,
    suggestedSearchTerms: toolUse.input.suggestedSearchTerms,
    images: bestImageUrls.length ? bestImageUrls : site.images.slice(0, 6),
  };
}

module.exports = { analyzeWebsite, fetchWebsite };
