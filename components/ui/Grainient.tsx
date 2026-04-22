import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface GrainientProps {
  color1?: string;
  color2?: string;
  color3?: string;
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  className?: string;
}

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_time;
uniform float u_colorBalance;
uniform float u_warpStrength;
uniform float u_warpFrequency;
uniform float u_warpSpeed;
uniform float u_warpAmplitude;
uniform float u_blendAngle;
uniform float u_blendSoftness;
uniform float u_rotationAmount;
uniform float u_noiseScale;
uniform float u_grainAmount;
uniform float u_grainScale;
uniform bool u_grainAnimated;
uniform float u_contrast;
uniform float u_gamma;
uniform float u_saturation;
uniform vec2 u_center;
uniform float u_zoom;

varying vec2 vUv;

// Random function for grain
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Simple noise for warping
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = (vUv - 0.5) / u_zoom + 0.5 - u_center;
    
    // Rotate
    float s = sin(u_rotationAmount);
    float c = cos(u_rotationAmount);
    uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    
    // Warp
    vec2 warp = vec2(
        noise(uv * u_warpFrequency + u_time * u_warpSpeed),
        noise(uv * u_warpFrequency + vec2(100.0) + u_time * u_warpSpeed)
    );
    uv += warp * u_warpStrength * u_warpAmplitude * 0.01;
    
    // Blend angle
    float angle = u_blendAngle;
    vec2 dir = vec2(cos(angle), sin(angle));
    
    // Use u_blendSoftness to soften the gradient. Avoid dividing by a tiny number.
    float blend = dot(uv - 0.5, dir);
    blend = blend * (1.0 - u_blendSoftness) + 0.5;
    
    // Color mixing: smoothly transition from color1 -> color2 -> color3
    float mix1 = smoothstep(0.0, 0.5, blend - u_colorBalance);
    float mix2 = smoothstep(0.5, 1.0, blend + u_colorBalance);
    
    vec3 color = mix(u_color1, u_color2, mix1);
    color = mix(color, u_color3, mix2);
    
    // Noise/Grain
    float timeForGrain = u_grainAnimated ? u_time : 0.0;
    float g = random(vUv * u_grainScale + timeForGrain);
    color += (g - 0.5) * u_grainAmount;
    
    // Contrast, Gamma, Saturation
    color = (color - 0.5) * u_contrast + 0.5;
    color = pow(abs(color), vec3(1.0 / u_gamma));
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, u_saturation);
    
    gl_FragColor = vec4(color, 1.0);
}
`;

export default function Grainient({
  color1 = '#00ff08',
  color2 = '#84CC16',
  color3 = '#F97316',
  timeSpeed = 1.6,
  colorBalance = 0,
  warpStrength = 3.55,
  warpFrequency = 5,
  warpSpeed = 2,
  warpAmplitude = 50,
  blendAngle = 0,
  blendSoftness = 0.05,
  rotationAmount = 500,
  noiseScale = 2,
  grainAmount = 0.1,
  grainScale = 2,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1,
  saturation = 1,
  centerX = 0,
  centerY = 0,
  zoom = 0.9,
  className = '',
}: GrainientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_color1: { value: new THREE.Color(color1) },
        u_color2: { value: new THREE.Color(color2) },
        u_color3: { value: new THREE.Color(color3) },
        u_time: { value: 0 },
        u_colorBalance: { value: colorBalance },
        u_warpStrength: { value: warpStrength },
        u_warpFrequency: { value: warpFrequency },
        u_warpSpeed: { value: warpSpeed },
        u_warpAmplitude: { value: warpAmplitude },
        u_blendAngle: { value: blendAngle },
        u_blendSoftness: { value: blendSoftness },
        u_rotationAmount: { value: rotationAmount },
        u_noiseScale: { value: noiseScale },
        u_grainAmount: { value: grainAmount },
        u_grainScale: { value: grainScale },
        u_grainAnimated: { value: grainAnimated },
        u_contrast: { value: contrast },
        u_gamma: { value: gamma },
        u_saturation: { value: saturation },
        u_center: { value: new THREE.Vector2(centerX, centerY) },
        u_zoom: { value: zoom },
      },
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    let animationFrameId: number;
    let startTime = performance.now();
    
    const animate = (time: number) => {
      material.uniforms.u_time.value = ((time - startTime) / 1000) * timeSpeed;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate(performance.now());
    
    const handleResize = () => {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      material.dispose();
      geometry.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [color1, color2, color3, timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed, warpAmplitude, blendAngle, blendSoftness, rotationAmount, noiseScale, grainAmount, grainScale, grainAnimated, contrast, gamma, saturation, centerX, centerY, zoom]);

  return <div ref={containerRef} className={`w-full h-full absolute inset-0 -z-10 ${className}`} />;
}