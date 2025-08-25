// src/components/HashPowerBackground.tsx — 蓝白脉冲·高亮加强版 v2
import React, { useCallback } from 'react'
import Particles from 'react-tsparticles'
import type { Engine } from 'tsparticles-engine'
import { loadSlim } from 'tsparticles-slim'
import { loadEmittersPlugin } from 'tsparticles-plugin-emitters'

const HashPowerBackground: React.FC = () => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine)
    await loadEmittersPlugin(engine)
  }, [])

  // 更亮：提高粒子不透明度、尺寸、发射频率，并开启蓝色发光阴影
  const options = {
    background: { color: { value: 'transparent' } },
    fpsLimit: 60,
    pauseOnBlur: true,
    pauseOnOutsideViewport: true,

    interactivity: { events: { onHover: { enable: false }, onClick: { enable: false }, resize: true } },

    particles: {
      number: { value: 0 },
      color: { value: ['#FFFFFF', '#E0F7FF', '#A5F3FC', '#60A5FA'] },
      shape: { type: 'circle' as const },
      opacity: {
        value: { min: 0.28, max: 0.55 },
        animation: { enable: true, speed: 0.3, startValue: 'max', destroy: 'min', sync: false },
      },
      size: { value: { min: 1.2, max: 2.8 } },
      shadow: { enable: true, blur: 8, color: { value: '#7DD3FC' } }, // 发光
      links: { enable: false },
      move: {
        enable: true,
        direction: 'outside' as const,
        center: { x: 58, y: 52, mode: 'percent' as const },
        speed: { min: 0.45, max: 0.9 },
        straight: true,
        random: false,
        outModes: { default: 'destroy' as const },
      },
    },

    emitters: [
      {
        position: { x: 58, y: 52 },
        direction: 'outside',
        size: { width: 0, height: 0, mode: 'precise' },
        rate: { quantity: 6, delay: 0.06 }, // 数量↑ 亮度↑
        life: { count: 0, duration: 1.8, delay: 9, wait: true },
      },
      {
        position: { x: 58, y: 52 },
        direction: 'outside',
        size: { width: 0, height: 0, mode: 'precise' },
        rate: { quantity: 5, delay: 0.08 },
        life: { count: 0, duration: 1.8, delay: 13.5, wait: true },
      },
    ],

    detectRetina: true,
  } as const

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        // 更亮的蓝白基调：提高径向渐变的 alpha，底层纵向渐变略提亮
        background:
          'radial-gradient(60% 55% at 60% 52%, rgba(125,211,252,0.42) 0%, rgba(96,165,250,0.28) 24%, rgba(15,23,42,0) 62%),\n' +
          'linear-gradient(180deg, #07101F 0%, #0B1220 50%, #0E1629 100%)',
      }}
    >
      <Particles id="tsparticles" className="mix-blend-screen" init={particlesInit} options={options as any} />
    </div>
  )
}

export default HashPowerBackground
