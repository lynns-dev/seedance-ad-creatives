const Anthropic = require('@anthropic-ai/sdk');

// Fixed set of structurally distinct ad archetypes. We assign one per
// generated script (round-robin) so "diverse range of ad types" isn't left
// to the model's discretion — it's guaranteed by construction.
const AD_ARCHETYPES = [
  {
    key: 'ugc_testimonial',
    label: 'UGC testimonial',
    guidance: 'A real-feeling customer talking directly to camera about why they love the product, handheld/selfie-style framing.',
  },
  {
    key: 'problem_solution',
    label: 'Problem → solution',
    guidance: 'Open on a relatable frustration/pain point, then show the product resolving it in a clear before/after beat.',
  },
  {
    key: 'unboxing_demo',
    label: 'Unboxing / product demo',
    guidance: 'Close-up hands-on unboxing and demonstration of the product’s features and use, satisfying tactile detail shots.',
  },
  {
    key: 'pov_day_in_life',
    label: 'POV / day-in-the-life',
    guidance: 'First-person point-of-view shot showing the product woven naturally into a daily routine.',
  },
  {
    key: 'founder_story',
    label: 'Founder / brand story',
    guidance: 'A founder or brand voice speaking earnestly about why they made the product, warm and personal tone.',
  },
  {
    key: 'comparison',
    label: 'Comparison / versus',
    guidance: 'Side-by-side or split-screen contrast between this product and the old/inferior way of doing things.',
  },
  {
    key: 'humor_skit',
    label: 'Humor / skit',
    guidance: 'A short comedic skit or exaggerated scenario that lands on the product as the punchline or fix.',
  },
  {
    key: 'social_proof_montage',
    label: 'Social proof montage',
    guidance: 'Fast-cut montage implying popularity/reviews — multiple quick shots, energetic pacing, review-style captions implied in the visuals.',
  },
  {
    key: 'tutorial_howto',
    label: 'Tutorial / how-to',
    guidance: 'Clear instructional walkthrough of how to use the product step by step, calm and informative pacing.',
  },
  {
    key: 'asmr_closeup',
    label: 'ASMR / sensory close-up',
    guidance: 'Slow, satisfying macro close-ups emphasizing texture, sound-implying motion, and premium feel.',
  },
];

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

function summarizeReferenceAds(referenceAds = []) {
  if (!referenceAds.length) return 'No reference ads were found; rely on general high-performing ad conventions.';
  return referenceAds
    .slice(0, 10)
    .map((ad, i) => {
      const text = [...(ad.bodies || []), ...(ad.linkTitles || []), ...(ad.linkDescriptions || [])]
        .filter(Boolean)
        .join(' | ');
      return `${i + 1}. Advertiser: ${ad.pageName || 'unknown'} | Running ${Math.round(ad.daysRunning || 0)} days | Copy: ${text || '(no text captured)'}`;
    })
    .join('\n');
}

const SCRIPTS_TOOL = {
  name: 'return_scripts',
  description: 'Return the generated ad scripts.',
  input_schema: {
    type: 'object',
    properties: {
      scripts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            archetype: { type: 'string' },
            title: { type: 'string' },
            hook: { type: 'string', description: 'The first 1-2 seconds hook line/visual' },
            script: { type: 'string', description: 'Full scene-by-scene script/shot list' },
            videoPrompt: {
              type: 'string',
              description: 'A single dense prompt suitable for a text/image-to-video generation model, describing the full shot in cinematic detail',
            },
          },
          required: ['archetype', 'title', 'hook', 'script', 'videoPrompt'],
        },
      },
    },
    required: ['scripts'],
  },
};

/**
 * Generate a diverse set of ad scripts (one per archetype, cycling if count
 * exceeds the archetype list) grounded in scanned top-performing ad copy
 * and the product description.
 */
async function generateAdScripts({ productDescription, referenceAds = [], count = AD_ARCHETYPES.length }) {
  if (!productDescription) {
    throw new Error('productDescription is required');
  }

  const archetypes = Array.from({ length: count }, (_, i) => AD_ARCHETYPES[i % AD_ARCHETYPES.length]);
  const client = getClient();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    tools: [SCRIPTS_TOOL],
    tool_choice: { type: 'tool', name: 'return_scripts' },
    messages: [
      {
        role: 'user',
        content: `You are a direct-response video ad creative strategist.

Product:
${productDescription}

Reference ads (currently-running, longevity-ranked as a proxy for top performers):
${summarizeReferenceAds(referenceAds)}

Write exactly ${archetypes.length} distinct video ad scripts, one for each of these archetypes in order:
${archetypes.map((a, i) => `${i + 1}. ${a.label} — ${a.guidance}`).join('\n')}

For each script:
- Stay true to its assigned archetype so the set reads as genuinely diverse ad types, not variations on one idea.
- Ground creative choices in patterns you see in the reference ads' hooks/copy where relevant, but write original scripts.
- Keep each under 15 seconds of screen time (this maps to a short-form video generation model).
- The videoPrompt field must be a single self-contained, richly descriptive prompt (no dialogue transcript, just visual/cinematic direction) usable directly as input to a text/image-to-video AI model. Assume a product reference image will also be supplied to the model alongside this prompt, so describe how the product should appear/be used rather than describing the product's appearance from scratch.`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      `Script generation was cut off before finishing (hit the ${message.usage?.output_tokens ?? 'max'}-token limit). Try requesting fewer scripts.`
    );
  }

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse || !Array.isArray(toolUse.input?.scripts)) {
    throw new Error('Model did not return structured scripts');
  }

  return toolUse.input.scripts.map((script, i) => ({
    ...script,
    archetypeKey: archetypes[i]?.key,
  }));
}

module.exports = { generateAdScripts, AD_ARCHETYPES };
