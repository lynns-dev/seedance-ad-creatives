const { getTaskStatus } = require('../../../../lib/seedance');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const result = await getTaskStatus(id);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Seedance status error:', err);
    return res.status(500).json({ error: err.message });
  }
};
