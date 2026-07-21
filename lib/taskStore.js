// In-memory store for task callback results. On serverless platforms each
// instance has its own memory, so this only works reliably on a single
// long-running process (e.g. `next start`) or as a placeholder until a real
// datastore (KV, Postgres, etc.) is wired in.
const tasks = new Map();

function setTaskResult(taskId, payload) {
  tasks.set(taskId, { ...payload, receivedAt: Date.now() });
}

function getTaskResult(taskId) {
  return tasks.get(taskId) || null;
}

module.exports = { setTaskResult, getTaskResult };
