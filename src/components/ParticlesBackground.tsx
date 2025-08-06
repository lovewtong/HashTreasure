import React, { useRef, useEffect } from 'react';

const ParticlesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: Particle[];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: (canvas.height / 120) * (canvas.width / 120),
    };

    window.addEventListener('mousemove', (event) => {
      mouse.x = event.x;
      mouse.y = event.y;
    });

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx!.fillStyle = '#00aaff';
        ctx!.fill();
      }

      update() {
        if (this.x > canvas.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        let dx = (mouse.x ?? -1000) - this.x;
        let dy = (mouse.y ?? -1000) - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius + this.size) {
          if (mouse.x! < this.x && this.x < canvas.width - this.size * 10) {
            this.x += 5;
          }
          if (mouse.x! > this.x && this.x > this.size * 10) {
            this.x -= 5;
          }
          if (mouse.y! < this.y && this.y < canvas.height - this.size * 10) {
            this.y += 5;
          }
          if (mouse.y! > this.y && this.y > this.size * 10) {
            this.y -= 5;
          }
        }
        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (canvas.height * canvas.width) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 2) + 1;
        let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * 0.4) - 0.2;
        let directionY = (Math.random() * 0.4) - 0.2;
        let color = '#00aaff';
        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
      }
    }

    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                             + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                if (distance < (canvas.width/7) * (canvas.height/7)) {
                    opacityValue = 1 - (distance/20000);
                    ctx!.strokeStyle = `rgba(0, 170, 255, ${opacityValue})`;
                    ctx!.lineWidth = 1;
                    ctx!.beginPath();
                    ctx!.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx!.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx!.stroke();
                }
            }
        }
    }

    function animate() {
      requestAnimationFrame(animate);
      ctx!.clearRect(0, 0, innerWidth, innerHeight);

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
      }
      connect();
    }
    
    window.addEventListener('resize', () => {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        mouse.radius = (canvas.height / 120) * (canvas.width / 120);
        init();
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    init();
    animate();

    return () => {
        window.removeEventListener('mousemove', () => {});
        window.removeEventListener('resize', () => {});
        window.removeEventListener('mouseout', () => {});
    }
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10"></canvas>;
};

export default ParticlesBackground;
