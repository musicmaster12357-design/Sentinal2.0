import React, { useState, useEffect } from 'react';

const messages = [
  "Booting System...",
  "Initializing AI Core...",
  "Connecting to Services...",
  "Loading Security Framework...",
  "System Operational."
];

const countdown = ["3", "2", "1"];

export default function SystemLoading({ onComplete }) {
  const [currentText, setCurrentText] = useState("Initializing...");
  const [messageIndex, setMessageIndex] = useState(0);
  const [isCountdown, setIsCountdown] = useState(false);
  const [countdownIndex, setCountdownIndex] = useState(0);

  useEffect(() => {
    if (!isCountdown) {
      if (messageIndex < messages.length) {
        const timer = setTimeout(() => {
          setCurrentText(messages[messageIndex]);
          setMessageIndex(prev => prev + 1);
        }, 700); // Wait 700ms between messages
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setIsCountdown(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    } else {
      if (countdownIndex < countdown.length) {
        const timer = setTimeout(() => {
          setCurrentText(countdown[countdownIndex]);
          setCountdownIndex(prev => prev + 1);
        }, 1000); // 1 second for each countdown number
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          onComplete();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [messageIndex, isCountdown, countdownIndex, onComplete]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#00ff00',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '2rem',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      zIndex: 9999
    }}>
      <div style={{ minHeight: '3rem', textAlign: 'center' }}>
        {currentText}
        <span className="cursor-blink">_</span>
      </div>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
          marginLeft: 4px;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
