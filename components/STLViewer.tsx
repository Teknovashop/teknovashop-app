'use client';

import dynamic from 'next/dynamic';

type StlViewerProps = {
  url: string;
  width?: number;
  height?: number;
  backgroundColor?: string | number;
  // puedes añadir más props de react-stl-viewer si las necesitas
};

// Import dinámico: devolvemos directamente el componente StlViewer
const ReactSTLViewer = dynamic<StlViewerProps>(
  () =>
    import('react-stl-viewer').then(
      (mod) => mod.StlViewer as unknown as React.ComponentType<StlViewerProps>
    ),
  { ssr: false }
);

type Props = {
  url?: string;
  height?: number;
};

export default function STLViewer({ url, height = 320 }: Props) {
  if (!url) {
    return (
      <div
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: 8,
          color: '#666',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
        }}
      >
        Genera o selecciona un STL para previsualizarlo
      </div>
    );
  }

  return <ReactSTLViewer url={url} height={height} />;
}
