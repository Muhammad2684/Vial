import React from 'react';

export default function FBRStatus({ connected }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
      connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
      FBR {connected ? 'Connected' : 'Offline'}
    </div>
  );
}
