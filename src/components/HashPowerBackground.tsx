// src/components/HashPowerBackground.tsx
import React, { useCallback } from 'react';
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

const HashPowerBackground: React.FC = () => {
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine);
    }, []);

    const options = {
        background: {
            color: {
                value: '#000000',
            },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    // **效果更新**: 鼠标悬停效果改为“排斥”，更具科技感
                    mode: 'repulse',
                },
                resize: true,
            },
            modes: {
                repulse: {
                    distance: 150,
                    duration: 0.4,
                },
                grab: {
                    distance: 180,
                    links: {
                        opacity: 0.3,
                    },
                },
            },
        },
        particles: {
            color: {
                value: '#00d5ff', // 使用更明亮的青色
            },
            links: {
                color: '#00d5ff',
                distance: 150,
                enable: true,
                // **亮度提升**: 显著提高连接线的不透明度
                opacity: 0.4,
                width: 1,
            },
            move: {
                direction: 'none' as const,
                enable: true,
                outModes: {
                    default: 'bounce' as const,
                },
                random: true,
                // **动感提升**: 加快粒子移动速度
                speed: 1.2,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                    area: 800,
                },
                // **亮度提升**: 增加粒子数量
                value: 120,
            },
            opacity: {
                // **亮度提升**: 提高粒子的基础不透明度
                value: { min: 0.3, max: 0.8 },
                animation: {
                    enable: true,
                    speed: 1,
                    minimumValue: 0.2,
                    sync: false
                }
            },
            shape: {
                type: 'circle' as const,
            },
            size: {
                value: { min: 1, max: 2.5 },
                animation: {
                    enable: true,
                    speed: 2,
                    minimumValue: 0.5,
                    sync: false
                }
            },
            // **效果更新**: 新增闪烁效果，让粒子随机发光
            twinkle: {
                particles: {
                    enable: true,
                    frequency: 0.05,
                    opacity: 1
                }
            }
        },
        detectRetina: true,
    };

    return (
        <div className="fixed inset-0 z-0">
            <Particles
                id="tsparticles"
                init={particlesInit}
                options={options as any}
            />
        </div>
    );
};

export default HashPowerBackground;