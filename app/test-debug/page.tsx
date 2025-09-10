'use client';

import { useState } from 'react';

export default function TestDebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matricula: '023995',
          senha: 'teste',
          id_associado: 1,
          empregador: 1
        })
      });
      
      const data = await response.json();
      setResult(data);
      console.log('Response:', data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : String(error) });
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Debug API</h1>
      <button onClick={testAPI} disabled={loading}>
        {loading ? 'Testing...' : 'Test API'}
      </button>
      
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>Result:</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
