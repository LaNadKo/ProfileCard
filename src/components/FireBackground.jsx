import React, { useEffect, useRef } from 'react';

export const FireBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Monochrome ash sparks & rising glowing embers
    const embersCount = Math.min(Math.floor(width / 15), 75);
    const embers = [];

    const emberColors = [
      'rgba(255, 255, 255, ',  // pure white spark
      'rgba(225, 225, 230, ',  // silver spark
      'rgba(180, 180, 190, ',  // ash light gray
      'rgba(130, 130, 140, ',  // muted gray
      'rgba(90, 90, 100, ',    // deep charcoal particle
    ];

    for (let i = 0; i < embersCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.4 + 0.8,
        speedY: Math.random() * 1.1 + 0.4,
        speedX: (Math.random() - 0.5) * 0.5,
        colorBase: emberColors[Math.floor(Math.random() * emberColors.length)],
        opacity: Math.random() * 0.7 + 0.15,
        opacitySpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.speedY;
        e.wobble += e.wobbleSpeed;
        e.x += e.speedX + Math.sin(e.wobble) * 0.4;

        e.opacity += e.opacitySpeed;
        if (e.opacity > 0.85) {
          e.opacity = 0.85;
          e.opacitySpeed = -Math.abs(e.opacitySpeed);
        } else if (e.opacity < 0.1) {
          e.opacity = 0.1;
          e.opacitySpeed = Math.abs(e.opacitySpeed);
        }

        if (e.y < -20 || e.x < -20 || e.x > width + 20) {
          e.y = height + Math.random() * 20;
          e.x = Math.random() * width;
          e.opacity = Math.random() * 0.5 + 0.2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `${e.colorBase}${e.opacity})`;
        ctx.shadowColor = `${e.colorBase}0.8)`;
        ctx.shadowBlur = e.size * 5;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fire-background-container" aria-hidden="true">
      <div className="fire-glow fire-bottom-glow"></div>
      <div className="fire-glow fire-core-glow"></div>
      <canvas ref={canvasRef} className="fire-canvas" />
      <div className="fire-heat-overlay"></div>
    </div>
  );
};
