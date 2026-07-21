import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTask(null);
    setStatus(null);

    try {
      const res = await fetch('/api/seedance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          generationType: 'text-to-video',
          aspectRatio,
          duration: Number(duration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setTask(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!task?.taskId) return;
    setError(null);
    try {
      const res = await fetch(`/api/seedance/status/${task.taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Seedance Ad Creative Generator</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={4}
            style={{ width: '100%' }}
            placeholder="e.g. a 9:16 vertical ad for a scented candle brand, cinematic lighting, product hero shot"
          />
        </label>
        <label style={{ display: 'inline-block', marginRight: 16 }}>
          Aspect ratio
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
            <option value="9:16">9:16 (Reels/Stories)</option>
            <option value="1:1">1:1 (Feed)</option>
            <option value="16:9">16:9 (Landscape)</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="21:9">21:9</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </label>
        <label style={{ display: 'inline-block' }}>
          Duration (s)
          <input
            type="number"
            min={4}
            max={15}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={loading || !prompt}>
            {loading ? 'Generating...' : 'Generate video'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {task && (
        <div style={{ marginTop: 24 }}>
          <p>Task created: <code>{task.taskId}</code> ({task.credits} credits reserved)</p>
          <button onClick={checkStatus}>Check status</button>
        </div>
      )}

      {status && (
        <pre style={{ marginTop: 16, background: '#f5f5f5', padding: 12, overflowX: 'auto' }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </main>
  );
}
