import React, { useCallback } from 'react';
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim"; 

const HashPowerBackground: React.FC = () => {
  // This function loads the tsparticles engine
  const particlesInit = useCallback(async (engine: Engine) => {
    // You can initialize the tsParticles instance (engine) here, adding custom shapes or presets
    // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
    // starting from v2 you can add only the features you need reducing the bundle size
    await loadSlim(engine);
  }, []);

  const options = {
    background: {
      color: {
        value: 'transparent', // A pure black background for maximum contrast
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: 'grab', // Attracts particles towards the cursor
        },
        resize: true,
      },
      modes: {
        grab: {
          distance: 200, // The distance at which particles are attracted
          links: {
            opacity: 0.3,
            color: '#00d5ff' // A slightly brighter cyan for interaction
          },
        },
      },
    },
    particles: {
      color: {
        value: '#00d5ff', // The core "cyan" color for particles
      },
      links: {
        color: '#00d5ff', // "cyan" for the network connections
        distance: 150,
        enable: true,
        opacity: 0.05, // Subtle connections
        width: 1,
      },
      move: {
        direction: 'none' as const,
        enable: true,
        outModes: {
          default: 'bounce' as const,
        },
        random: true,
        speed: 0.2, // A slow, cosmic drift
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 800,
        },
        value: 80, // A balanced number of particles
      },
      opacity: {
        value: { min: 0.1, max: 0.6 },
        animation: {
          enable: true,
          speed: 1,
          minimumValue: 0.1,
          sync: false
        }
      },
      shape: {
        type: 'circle' as const,
      },
      size: {
        value: { min: 1, max: 2.5 }, // Small, star-like particles
        animation: {
          enable: true,
          speed: 2,
          minimumValue: 0.5,
          sync: false
        }
      },
    },
    detectRetina: true,
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={options as any}
      />
    </div>
  );
};

export default HashPowerBackground;
