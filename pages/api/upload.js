const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { formidable } = require('formidable');

// public/ is part of the read-only deployment bundle on serverless hosts
// (e.g. Vercel) - writes to it at runtime fail. os.tmpdir() is writable
// everywhere, but isn't served as a static file, so uploaded images are
// served back out through pages/api/uploads/[filename].js instead of a
// static /uploads/ path.
const UPLOAD_DIR = path.join(os.tmpdir(), 'seedance-uploads');
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory:', err);
    return res.status(500).json({ error: 'Server could not prepare upload storage: ' + err.message });
  }

  const form = formidable({
    uploadDir: UPLOAD_DIR,
    maxFileSize: MAX_SIZE_BYTES,
    filter: ({ mimetype }) => ALLOWED_TYPES.has(mimetype),
  });

  try {
    const [, files] = await form.parse(req);

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided (field name: image), or file type not allowed' });
    }

    const ext = path.extname(file.originalFilename || '') || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    const destPath = path.join(UPLOAD_DIR, filename);
    fs.renameSync(file.filepath, destPath);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const path_ = `/api/uploads/${filename}`;
    const url = siteUrl ? `${siteUrl}${path_}` : path_;

    return res.status(200).json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(400).json({ error: 'Upload failed: ' + err.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
