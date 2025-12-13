import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

const BOARD_SIZE = 19;
const CELL_SIZE = 0.2;
const BOARD_WIDTH = (BOARD_SIZE - 1) * CELL_SIZE;

// Predefined stone positions for a beautiful pattern (similar to the reference image)
const stonePositions: { x: number; y: number; color: 'black' | 'white' }[] = [
  // Top left cluster
  { x: 2, y: 3, color: 'white' },
  { x: 3, y: 2, color: 'black' },
  { x: 3, y: 3, color: 'black' },
  { x: 3, y: 4, color: 'white' },
  { x: 4, y: 3, color: 'white' },
  { x: 4, y: 4, color: 'black' },
  { x: 5, y: 2, color: 'white' },
  { x: 5, y: 5, color: 'black' },
  
  // Top right area
  { x: 14, y: 2, color: 'black' },
  { x: 15, y: 2, color: 'white' },
  { x: 15, y: 3, color: 'black' },
  { x: 16, y: 3, color: 'white' },
  { x: 16, y: 4, color: 'black' },
  { x: 14, y: 4, color: 'white' },
  
  // Center pattern
  { x: 9, y: 9, color: 'black' },
  { x: 10, y: 9, color: 'white' },
  { x: 9, y: 10, color: 'white' },
  { x: 10, y: 10, color: 'black' },
  { x: 8, y: 9, color: 'white' },
  { x: 11, y: 10, color: 'black' },
  
  // Bottom area
  { x: 4, y: 14, color: 'black' },
  { x: 5, y: 14, color: 'white' },
  { x: 5, y: 15, color: 'black' },
  { x: 6, y: 14, color: 'white' },
  { x: 6, y: 15, color: 'black' },
  { x: 7, y: 15, color: 'white' },
  
  // Bottom right
  { x: 13, y: 13, color: 'white' },
  { x: 14, y: 13, color: 'black' },
  { x: 14, y: 14, color: 'white' },
  { x: 15, y: 14, color: 'black' },
  { x: 15, y: 15, color: 'white' },
  { x: 13, y: 14, color: 'black' },
];

function Stone({ position, color }: { position: [number, number, number]; color: 'black' | 'white' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    if (color === 'black') {
      return new THREE.MeshStandardMaterial({
        color: '#1a1a1a',
        roughness: 0.3,
        metalness: 0.1,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: '#f5f5f5',
      roughness: 0.2,
      metalness: 0.05,
    });
  }, [color]);

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[0.08, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Board() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const boardMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d4a76a',
    roughness: 0.6,
    metalness: 0.05,
  }), []);

  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const lineWidth = 0.008;
    const lineMaterial = new THREE.MeshBasicMaterial({ color: '#2a2a2a' });

    // Horizontal lines
    for (let i = 0; i < BOARD_SIZE; i++) {
      const y = -BOARD_WIDTH / 2 + i * CELL_SIZE;
      lines.push(
        <mesh key={`h-${i}`} position={[0, 0.151, y]}>
          <boxGeometry args={[BOARD_WIDTH, 0.002, lineWidth]} />
          <primitive object={lineMaterial} attach="material" />
        </mesh>
      );
    }

    // Vertical lines
    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = -BOARD_WIDTH / 2 + i * CELL_SIZE;
      lines.push(
        <mesh key={`v-${i}`} position={[x, 0.151, 0]}>
          <boxGeometry args={[lineWidth, 0.002, BOARD_WIDTH]} />
          <primitive object={lineMaterial} attach="material" />
        </mesh>
      );
    }

    // Star points (hoshi)
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15],
    ];

    starPoints.forEach(([x, z], idx) => {
      lines.push(
        <mesh key={`star-${idx}`} position={[
          -BOARD_WIDTH / 2 + x * CELL_SIZE,
          0.152,
          -BOARD_WIDTH / 2 + z * CELL_SIZE
        ]}>
          <cylinderGeometry args={[0.02, 0.02, 0.003, 16]} />
          <primitive object={lineMaterial} attach="material" />
        </mesh>
      );
    });

    return lines;
  }, []);

  const stones = useMemo(() => {
    return stonePositions.map((stone, idx) => {
      const x = -BOARD_WIDTH / 2 + stone.x * CELL_SIZE;
      const z = -BOARD_WIDTH / 2 + stone.y * CELL_SIZE;
      return (
        <Stone
          key={idx}
          position={[x, 0.23, z]}
          color={stone.color}
        />
      );
    });
  }, []);

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        {/* Board base - thinner as requested */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[BOARD_WIDTH + 0.4, 0.15, BOARD_WIDTH + 0.4]} />
          <primitive object={boardMaterial} attach="material" />
        </mesh>
        
        {/* Board top surface */}
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[BOARD_WIDTH + 0.3, 0.15, BOARD_WIDTH + 0.3]} />
          <meshStandardMaterial color="#c9a05f" roughness={0.5} metalness={0.02} />
        </mesh>

        {gridLines}
        {stones}
      </Float>
    </group>
  );
}

export default function GoBoard3D() {
  return (
    <div className="w-full h-[500px] md:h-[600px] lg:h-[700px]">
      <Canvas
        camera={{ position: [3.5, 3.5, 3.5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#00d4ff" />
        <pointLight position={[5, 5, 5]} intensity={0.3} color="#a855f7" />
        
        <Board />
      </Canvas>
    </div>
  );
}
