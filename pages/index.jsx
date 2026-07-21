import { useState } from 'react';

function ScriptCard({ script, imageUrl }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);
  const [status, setStatus] = useState(null);

  async function generateVideo() {
    setLoading(true);
    setError(null);
    setTask(null);
    setStatus(null);
    try {
      const res = await fetch('/api/seedance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: script.videoPrompt,
          generationType: imageUrl ? 'image-to-video' : 'text-to-video',
          imageUrls: imageUrl ? [imageUrl] : undefined,
          aspectRatio: '9:16',
          duration: 5,
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
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>{script.title}</strong>
        <span style={{ fontSize: 12, color: '#888' }}>{script.archetype}</span>
      </div>
      <p style={{ fontStyle: 'italic', margin: '8px 0' }}>Hook: {script.hook}</p>
      <details>
        <summary>Full script</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{script.script}</pre>
      </details>
      <details>
        <summary>Video prompt (sent to Seedance)</summary>
        <p style={{ whiteSpace: 'pre-wrap', color: '#555' }}>{script.videoPrompt}</p>
      </details>

      <div style={{ marginTop: 12 }}>
        <button onClick={generateVideo} disabled={loading}>
          {loading ? 'Generating...' : 'Generate video'}
        </button>
        {task && (
          <button onClick={checkStatus} style={{ marginLeft: 8 }}>
            Check status
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {task && (
        <p style={{ fontSize: 12, color: '#888' }}>
          Task <code>{task.taskId}</code> ({task.credits} credits)
        </p>
      )}
      {status && (
        <pre style={{ background: '#f5f5f5', padding: 8, overflowX: 'auto', fontSize: 12 }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function Home() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [productDescription, setProductDescription] = useState('');
  const [searchTerms, setSearchTerms] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [referenceAds, setReferenceAds] = useState([]);
  const [scanWarning, setScanWarning] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null);
  }

  async function uploadImage() {
    if (!imageFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function generateScripts(e) {
    e.preventDefault();
    setScanning(true);
    setError(null);
    setScripts([]);
    setReferenceAds([]);
    setScanWarning(null);
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription, searchTerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setScripts(data.scripts);
      setReferenceAds(data.referenceAds || []);
      setScanWarning(data.scanWarning);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Seedance Ad Creative Generator</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>1. Product reference image</h2>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
        {imagePreview && (
          <div style={{ marginTop: 8 }}>
            <img src={imagePreview} alt="preview" style={{ maxWidth: 200, borderRadius: 8 }} />
            <div>
              <button onClick={uploadImage} disabled={uploading || !!imageUrl}>
                {uploading ? 'Uploading...' : imageUrl ? 'Uploaded' : 'Upload'}
              </button>
              {imageUrl && <span style={{ marginLeft: 8, fontSize: 12, color: 'green' }}>{imageUrl}</span>}
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>2. Scan top ads &amp; generate diverse scripts</h2>
        <form onSubmit={generateScripts}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Product description
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              required
              rows={3}
              style={{ width: '100%' }}
              placeholder="What is the product, who is it for, key selling points"
            />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Meta Ad Library search terms (your brand, category, or a competitor)
            <input
              type="text"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              required
              style={{ width: '100%' }}
              placeholder="e.g. scented candle"
            />
          </label>
          <button type="submit" disabled={scanning || !imageUrl}>
            {scanning ? 'Scanning & writing scripts...' : 'Scan & generate scripts'}
          </button>
          {!imageUrl && <p style={{ fontSize: 12, color: '#888' }}>Upload a reference image first.</p>}
        </form>
      </section>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {scanWarning && (
        <p style={{ color: '#a60' }}>
          Ad Library scan unavailable ({scanWarning}) — scripts were generated from general ad conventions instead.
        </p>
      )}

      {referenceAds.length > 0 && (
        <details style={{ marginBottom: 24 }}>
          <summary>{referenceAds.length} reference ads scanned</summary>
          <ul>
            {referenceAds.map((ad) => (
              <li key={ad.id} style={{ fontSize: 12 }}>
                {ad.pageName} — running {Math.round(ad.daysRunning)}d — {(ad.bodies[0] || '').slice(0, 120)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {scripts.length > 0 && (
        <section>
          <h2>3. Generated scripts ({scripts.length} distinct ad types)</h2>
          {scripts.map((script, i) => (
            <ScriptCard key={i} script={script} imageUrl={imageUrl} />
          ))}
        </section>
      )}
    </main>
  );
}
