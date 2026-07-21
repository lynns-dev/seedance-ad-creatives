const os = require('os');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(os.tmpdir(), 'seedance-uploads');

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename } = req.query;

  // Reject anything that isn't a bare filename (no path separators / traversal).
  if (typeof filename !== 'string' || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    const data = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error('Upload read error:', err);
    return res.status(500).json({ error: 'Failed to read upload' });
  }
}
