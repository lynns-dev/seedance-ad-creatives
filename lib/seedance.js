const API_BASE = process.env.SEEDANCE_API_BASE || 'https://api.seedance2.ai';

function getApiKey() {
  const key = process.env.SEEDANCE_API_KEY;
  if (!key) {
    throw new Error('SEEDANCE_API_KEY is not set');
  }
  return key;
}

async function seedanceRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || data?.error || res.statusText;
    throw new Error(`Seedance API error (${res.status}): ${message}`);
  }

  return data;
}

const GENERATION_TYPES = ['text-to-video', 'image-to-video', 'reference-to-video'];
const MODELS = ['seedance-2-0', 'seedance-2-0-fast', 'seedance-2-0-mini'];

/**
 * Create a video generation task.
 * https://api.seedance2.ai/v1/videos/generations
 */
async function createVideoGeneration({
  model = 'seedance-2-0',
  callbackUrl,
  prompt,
  generationType = 'text-to-video',
  imageUrls,
  videoUrls,
  audioUrls,
  duration = 5,
  aspectRatio = 'adaptive',
  resolution = '720p',
  generateAudio = true,
  watermark = false,
  webSearch = false,
  returnLastFrame = false,
  seed = -1,
}) {
  if (!prompt) {
    throw new Error('prompt is required');
  }
  if (!MODELS.includes(model)) {
    throw new Error(`Invalid model: ${model}`);
  }
  if (!GENERATION_TYPES.includes(generationType)) {
    throw new Error(`Invalid generation_type: ${generationType}`);
  }

  const input = {
    prompt,
    generation_type: generationType,
    duration,
    aspect_ratio: aspectRatio,
    resolution,
    generate_audio: generateAudio,
    watermark,
    web_search: webSearch,
    return_last_frame: returnLastFrame,
    seed,
  };

  if (imageUrls?.length) input.image_urls = imageUrls;
  if (videoUrls?.length) input.video_urls = videoUrls;
  if (audioUrls?.length) input.audio_urls = audioUrls;

  const body = { model, input };
  if (callbackUrl) body.callback_url = callbackUrl;

  return seedanceRequest('/v1/videos/generations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Poll the status of a previously created task.
 * https://api.seedance2.ai/v1/tasks/:id
 */
async function getTaskStatus(taskId) {
  if (!taskId) {
    throw new Error('taskId is required');
  }
  return seedanceRequest(`/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
  });
}

module.exports = {
  createVideoGeneration,
  getTaskStatus,
  GENERATION_TYPES,
  MODELS,
};
