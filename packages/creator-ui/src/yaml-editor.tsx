'use client';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-[500px] animate-pulse rounded-lg bg-muted" aria-label="Loading YAML editor" />,
});

export function YamlEditor({ value, onChange, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <MonacoEditor
        height="500px"
        language="yaml"
        theme="vs-dark"
        value={value}
        onChange={(next) => onChange(next ?? '')}
        options={{
          minimap: { enabled: false }, wordWrap: 'on', fontSize: 14,
          lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true,
          tabSize: 2, readOnly: disabled,
        }}
      />
    </div>
  );
}
