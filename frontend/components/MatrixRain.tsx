import { useEffect, useRef } from 'react';

// Enhanced Matrix rain effect with more authentic visuals
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    
    // Dynamic sizing
    const updateCanvasSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      return { w, h };
    };
    
    let { w, h } = updateCanvasSize();
    
    // Matrix characters - focus on authentic katakana/symbols
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГҐДЕЄЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    
    // Enhanced settings
    const fontSize = 32;
    const columns = Math.floor(w / fontSize);
    
    // Each column has multiple properties
    const drops: Array<{
      y: number;
      speed: number;
      chars: string[];
      brightness: number[];
      lastUpdate: number;
    }> = [];
    
    // Initialize columns with random properties
    for (let i = 0; i < columns; i++) {
      const length = Math.floor(Math.random() * 20) + 10; // Trail length
      drops[i] = {
        y: Math.random() * h,
        speed: Math.random() * 2 + 0.5, // Variable speed
        chars: Array(length).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]),
        brightness: Array(length).fill(0).map((_, idx) => Math.max(0, 1 - idx * 0.1)), // Fade effect
        lastUpdate: Date.now()
      };
    }

    function draw() {
      if (!ctx) return;
      
      // Darker background for better contrast
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, w, h);
      
      ctx.font = `${fontSize}px "Courier New", monospace`;
      
      const currentTime = Date.now();
      
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        
        // Update position based on speed
        if (currentTime - drop.lastUpdate > 100 / drop.speed) {
          drop.y += fontSize;
          drop.lastUpdate = currentTime;
          
          // Occasionally mutate characters in the trail
          if (Math.random() > 0.95) {
            const mutateIndex = Math.floor(Math.random() * drop.chars.length);
            drop.chars[mutateIndex] = chars[Math.floor(Math.random() * chars.length)];
          }
          
          // Reset when reaching bottom
          if (drop.y > h + drop.chars.length * fontSize) {
            drop.y = -drop.chars.length * fontSize;
            drop.speed = Math.random() * 2 + 0.5;
            
            // Randomly restart with new trail
            if (Math.random() > 0.975) {
              const length = Math.floor(Math.random() * 20) + 10;
              drop.chars = Array(length).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]);
              drop.brightness = Array(length).fill(0).map((_, idx) => Math.max(0, 1 - idx * 0.1));
            }
          }
        }
        
        // Draw the trail
        for (let j = 0; j < drop.chars.length; j++) {
          const charY = drop.y - j * fontSize;
          
          if (charY > -fontSize && charY < h + fontSize) {
            // Calculate brightness based on position in trail
            let brightness = drop.brightness[j];
            
            // Leading character is brightest (white)
            if (j === 0) {
              ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            } else {
              // Trail characters are green with decreasing brightness
              const greenIntensity = Math.floor(255 * brightness);
              ctx.fillStyle = `rgba(0, ${greenIntensity}, 65, ${brightness})`;
            }
            
            // Add slight random brightness variation
            if (Math.random() > 0.98) {
              ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
            }
            
            ctx.fillText(drop.chars[j], i * fontSize, charY);
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(draw);
    }
    
    // Handle window resize
    const handleResize = () => {
      const newSize = updateCanvasSize();
      w = newSize.w;
      h = newSize.h;
      
      // Recalculate columns
      const newColumns = Math.floor(w / fontSize);
      
      if (newColumns !== columns) {
        // Adjust drops array
        while (drops.length < newColumns) {
          const length = Math.floor(Math.random() * 20) + 10;
          drops.push({
            y: Math.random() * h,
            speed: Math.random() * 2 + 0.5,
            chars: Array(length).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]),
            brightness: Array(length).fill(0).map((_, idx) => Math.max(0, 1 - idx * 0.1)),
            lastUpdate: Date.now()
          });
        }
        
        if (drops.length > newColumns) {
          drops.splice(newColumns);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ 
        width: '100vw', 
        height: '100vh', 
        opacity: 0.15,
        background: 'transparent'
      }}
    />
  );
}
