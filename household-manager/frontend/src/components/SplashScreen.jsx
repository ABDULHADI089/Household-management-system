import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('enter'); // enter → hold → exit

  useEffect(() => {
    // After 1.8s start the exit animation, then call onDone
    const holdTimer = setTimeout(() => setPhase('exit'), 1800);
    const doneTimer = setTimeout(() => onDone(), 2400);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center splash-bg transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="splash-circle splash-circle-1" />
        <div className="splash-circle splash-circle-2" />
        <div className="splash-circle splash-circle-3" />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-5 splash-content">
        {/* House icon with bounce */}
        <div className="splash-icon">
          <span className="text-7xl select-none drop-shadow-xl">🏠</span>
        </div>

        {/* Title */}
        <div className="text-center splash-title">
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Household Manager
          </h1>
          <p className="text-indigo-200 mt-2 text-lg font-medium tracking-wide">
            Your home. Organized.
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2 mt-4 splash-dots">
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
        </div>
      </div>
    </div>
  );
}
