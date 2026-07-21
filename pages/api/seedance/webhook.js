const { setTaskResult } = require('../../../lib/taskStore');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body || {};
  const taskId = payload.taskId || payload.task_id;

  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId in callback payload' });
  }

  setTaskResult(taskId, payload);
  console.log('Seedance webhook received for task', taskId, payload.status);

  return res.status(200).json({ received: true });
};
