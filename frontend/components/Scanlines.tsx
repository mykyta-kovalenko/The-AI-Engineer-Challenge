import React from 'react';

export default function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background:
          'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,255,0,0.05) 3px, transparent 4px)',
      }}
    />
  );
}
