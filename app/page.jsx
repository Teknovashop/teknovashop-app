'use client'
import { useState } from 'react'

export default function Page() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const apiBase = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_FORGE_API ||
    process.env.NEXT_PUBLIC_STL_API ||
    process.env.NEXT_PUBLIC_STL_SERVICE_URL ||
    ''
  )

  const handleGenerate = async () => {
    if (!apiBase) {
      setResult({ status: 'error', message: 'Falta NEXT_PUBLIC_BACKEND_URL' })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: 'test-order-123',
          model_slug: 'vesa-adapter',
          params: { width: 180, height: 180, thickness: 6, pattern: '100x100' },
          license: 'personal'
        })
      })
      const json = await res.json()
      setResult(json)
    } catch (err) {
      setResult({ status: 'error', message: err?.message || 'Failed to fetch' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Teknovashop Forge</h1>
      <button onClick={handleGenerate} disabled={loading} style={{ padding: '10px 16px', borderRadius: 8 }}>
        {loading ? 'Generando…' : 'Generar STL'}
      </button>
      <pre style={{ marginTop: 24, background: '#f7f7f7', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
      {result?.stl_url && (
        <p><a href={result.stl_url} target="_blank" rel="noreferrer">Descargar STL</a></p>
      )}
    </main>
  )
}
