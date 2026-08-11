import React from 'react';

export default function EmailView() {
  return (
    <div className="flex flex-col h-full bg-brand-bg relative">
      <iframe 
        src="https://webmail.happyinthehome.org" 
        className="w-full h-full border-0 absolute top-0 left-0"
        title="Email"
        allow="camera; microphone; display-capture; fullscreen"
      />
    </div>
  );
}
