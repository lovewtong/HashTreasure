// src/components/HashPowerBackground.tsx
// 轻/深主题各一套：浅色偏“明亮科技蓝”，深色偏“霓虹赛博蓝”
// 通过监听 <html class="dark"> 动态切换，无需重载
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Particles from 'react-tsparticles';
import type { Engine } from 'tsparticles-engine';
import { loadSlim } from 'tsparticles-slim';
import { loadEmittersPlugin } from 'tsparticles-plugin-emitters';

const useIsDark = () => {
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();

    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
};

const HashPowerBackground: React.FC = () => {
  const isDark = useIsDark();

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
    await loadEmittersPlugin(engine);
  }, []);

  const options = useMemo(() => {
    // 文本建议：浅色模式粒子更柔和，深色模式稍微提升发光度与不透明度
    return {
      fpsLimit: 60,
      interactivity: { events: { onHover: { enable: false }, onClick: { enable: false }, resize: true } },
      particles: {
        number: { value: 0 },
        color: { value: isDark ? ['#BAE6FD', '#7DD3FC', '#60A5FA', '#00A4EF'] : ['#FFFFFF', '#BAE6FD', '#7DD3FC', '#60A5FA'] },
        shape: { type: 'circle' as const },
        opacity: {
          value: { min: isDark ? 0.22 : 0.18, max: isDark ? 0.40 : 0.32 },
          animation: { enable: true, speed: 0.25, startValue: 'max', destroy: 'min' }
        },
        size: { value: { min: 1.1, max: 2.4 } },
        links: { enable: false },
        move: {
          enable: true,
          direction: 'outside' as const,
          center: { x: 62, y: 50, mode: 'percent' as const },
          speed: { min: 0.4, max: 0.8 },
          straight: true, random: false,
          outModes: { default: 'destroy' as const },
        },
      },
      emitters: [
        { position: { x: 62, y: 50 }, direction: 'outside', size: { width: 0, height: 0, mode: 'precise' },
          rate: { quantity: 4, delay: 0.07 }, life: { count: 0, duration: 1.6, delay: 9, wait: true } },
        { position: { x: 62, y: 50 }, direction: 'outside', size: { width: 0, height: 0, mode: 'precise' },
          rate: { quantity: 3, delay: 0.09 }, life: { count: 0, duration: 1.6, delay: 13.5, wait: true } },
      ],
      detectRetina: true,
    } as const;
  }, [isDark]);

  const layerStyle = useMemo<React.CSSProperties>(() => {
    // 轻：蓝白网格 + 柔和径向蓝；深：近黑底 + 霓虹蓝/青发光
    return isDark
      ? {
          background: [
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px)',
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 48px)',
            'radial-gradient(60% 55% at 62% 48%, rgba(0,164,239,0.32) 0%, rgba(2,191,231,0.20) 30%, rgba(13,78,137,0) 70%)',
            'linear-gradient(180deg, #0D0F11 0%, #121212 45%, #17191B 100%)'
          ].join(',')
        }
      : {
          background: [
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.035) 0px, rgba(0,0,0,0.035) 1px, transparent 1px, transparent 48px)',
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 48px)',
            'radial-gradient(60% 55% at 62% 48%, rgba(186,230,253,0.36) 0%, rgba(125,211,252,0.26) 26%, rgba(16,75,129,0) 64%)',
            'linear-gradient(180deg, #EAF5FF 0%, #F7FBFF 55%, #FFFFFF 100%)'
          ].join(',')
        };
  }, [isDark]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={layerStyle}>
      <Particles id="tsparticles" className="mix-blend-screen" init={particlesInit} options={options as any} />
    </div>
  );
};

export default HashPowerBackground;
