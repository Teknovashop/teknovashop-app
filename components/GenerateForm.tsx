'use client';

import { useState } from 'react';
import STLViewer from './STLViewer';

export default function GenerateForm() {
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_STL_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: 'test-order-123',
        model_slug: 'vesa-adapter',
        params: { width: 180, height: 180, thickness: 6, pattern: '100x100' },
        license: 'personal',
      }),
    });
    const data = await res.json();
    setStlUrl(data.stl_url);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <button type="submit">Generar STL</button>
      </form>
      {stlUrl && <STLViewer url={stlUrl} />}
    </div>
  );
}
