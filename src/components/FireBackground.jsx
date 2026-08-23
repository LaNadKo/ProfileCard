import React, { useEffect, useRef } from 'react';

// Pre-render radial gradient glow sprite to an offscreen canvas
function createGlowSprite() {
  const sprite = document.createElement('canvas');
  const size = 32;
  sprite.width = size;
  sprite.height = size;
  const sCtx = sprite.getContext('2d');
  if (!sCtx) return sprite;

  const center = size / 2;
  const grad = sCtx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.6, 'rgba(220, 220, 230, 0.3)');
  grad.addColorStop(1, 'rgba(200, 200, 210, 0)');

  sCtx.fillStyle = grad;
  sCtx.beginPath();
  sCtx.arc(center, center, center, 0, Math.PI * 2);
  sCtx.fill();

  return sprite;
}

export const FireBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glowSprite = createGlowSprite();

    let animationFrameId = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle density: reduced on mobile (<768px)
    const isMobile = width < 768;
    const baseDensity = Math.min(Math.floor(width / 18), 60);
    const embersCount = isMobile ? Math.floor(baseDensity * 0.5) : baseDensity;
    const embers = [];

    for (let i = 0; i < embersCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.8,
        speedY: Math.random() * 1.0 + 0.3,
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.6 + 0.2,
        opacitySpeed: (Math.random() * 0.01 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const drawFrame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        if (!prefersReducedMotion) {
          e.y -= e.speedY;
          e.wobble += e.wobbleSpeed;
          e.x += e.speedX + Math.sin(e.wobble) * 0.35;

          e.opacity += e.opacitySpeed;
          if (e.opacity > 0.8) {
            e.opacity = 0.8;
            e.opacitySpeed = -Math.abs(e.opacitySpeed);
          } else if (e.opacity < 0.15) {
            e.opacity = 0.15;
            e.opacitySpeed = Math.abs(e.opacitySpeed);
          }

          if (e.y < -20 || e.x < -20 || e.x > width + 20) {
            e.y = height + Math.random() * 20;
            e.x = Math.random() * width;
            e.opacity = Math.random() * 0.4 + 0.2;
          }
        }

        ctx.globalAlpha = e.opacity;
        const drawSize = e.size * 6;
        ctx.drawImage(glowSprite, e.x - drawSize / 2, e.y - drawSize / 2, drawSize, drawSize);
      }
      ctx.globalAlpha = 1.0;
    };

    if (prefersReducedMotion) {
      drawFrame();
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      drawFrame();
      animationFrameId = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else if (!animationFrameId && isRunning) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
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
