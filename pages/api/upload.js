const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { formidable } = require('formidable');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const form = formidable({
    uploadDir: UPLOAD_DIR,
    maxFileSize: MAX_SIZE_BYTES,
    filter: ({ mimetype }) => ALLOWED_TYPES.has(mimetype),
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: 'Upload failed: ' + err.message });
    }

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided (field name: image), or file type not allowed' });
    }

    const ext = path.extname(file.originalFilename || '') || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    const destPath = path.join(UPLOAD_DIR, filename);
    fs.renameSync(file.filepath, destPath);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const url = siteUrl
      ? `${siteUrl}/uploads/${filename}`
      : `/uploads/${filename}`;

    return res.status(200).json({ url });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
