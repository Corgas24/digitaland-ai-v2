import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, Center, Float, Stars, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════
   Cosmic Nebula Particles — swirling color clouds
   ═══════════════════════════════════════════════ */
function NebulaClouds({ count = 200 }) {
  const meshRef = useRef();
  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const palette = [
      new THREE.Color('#6366f1'), // indigo
      new THREE.Color('#8b5cf6'), // violet
      new THREE.Color('#a78bfa'), // purple
      new THREE.Color('#06b6d4'), // cyan
      new THREE.Color('#ec4899'), // pink
      new THREE.Color('#3b82f6'), // blue
    ];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sz[i] = 0.02 + Math.random() * 0.06;
    }
    return [pos, col, sz];
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

/* ═══════════════════════════════════════════════
   Orbital Ring — glowing ring around the text
   ═══════════════════════════════════════════════ */
function OrbitalRing({ radius = 4.5, color = '#6366f1' }) {
  const ringRef = useRef();
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.getElapsedTime() * 0.3) * 0.15;
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.08;
    }
  });
  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.015, 16, 100]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.5} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════
   Floating 3D Text — "DigitalandAI"
   ═══════════════════════════════════════════════ */
function CosmicText() {
  const groupRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.2;
      groupRef.current.rotation.x = Math.cos(t * 0.07) * 0.04;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.15;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef} scale={1}>
        <Center>
          <Text3D
            font="https://unpkg.com/three@0.149.0/examples/fonts/helvetiker_bold.typeface.json"
            size={1.0}
            height={0.3}
            curveSegments={32}
            bevelEnabled
            bevelThickness={0.06}
            bevelSize={0.04}
            bevelSegments={8}
          >
            DigitalandAI
            <meshStandardMaterial
              color="#a78bfa"
              metalness={0.7}
              roughness={0.05}
              emissive="#6366f1"
              emissiveIntensity={0.25}
            />
          </Text3D>
        </Center>
      </group>
    </Float>
  );
}

/* ═══════════════════════════════════════════════
   Main Orb — Cosmic Universe Scene
   ═══════════════════════════════════════════════ */
export default function Orb() {
  return (
    <div style={{
      height: '380px',
      width: '100%',
      position: 'relative',
      zIndex: 10,
      borderRadius: '24px',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, #0c0a1a 0%, #050412 60%, #000000 100%)',
    }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 42 }} dpr={[1, 2]}>
        {/* Deep space background */}
        <color attach="background" args={['#020010']} />
        <fog attach="fog" args={['#020010', 12, 30]} />

        {/* Lighting — dramatic space lighting */}
        <ambientLight intensity={0.15} />
        <spotLight position={[8, 8, 8]} angle={0.2} penumbra={1} intensity={1.5} color="#a78bfa" />
        <spotLight position={[-8, -4, 6]} angle={0.3} penumbra={1} intensity={0.8} color="#06b6d4" />
        <pointLight position={[0, 0, 6]} intensity={0.5} color="#6366f1" />
        <pointLight position={[-6, 3, -4]} intensity={0.3} color="#ec4899" />

        <Suspense fallback={null}>
          {/* Star field — deep space */}
          <Stars radius={25} depth={60} count={2500} factor={3} saturation={0.8} fade speed={0.5} />

          {/* Nebula particles */}
          <NebulaClouds count={300} />

          {/* Orbital rings */}
          <OrbitalRing radius={4.2} color="#6366f1" />
          <OrbitalRing radius={5.0} color="#8b5cf6" />

          {/* Main 3D Text */}
          <CosmicText />

          {/* Sparkle dust near the text */}
          <Sparkles count={80} scale={10} size={2} speed={0.3} opacity={0.5} color="#a78bfa" />
          <Sparkles count={40} scale={8} size={3} speed={0.2} opacity={0.3} color="#06b6d4" />

          {/* Ground shadow */}
          <ContactShadows position={[0, -2.5, 0]} opacity={0.15} scale={20} blur={3} far={6} color="#6366f1" />
        </Suspense>
      </Canvas>
    </div>
  );
}
