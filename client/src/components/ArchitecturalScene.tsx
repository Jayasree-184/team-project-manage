import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function Structure({ progress = 0 }: { progress?: number }) {
  const group = useRef<THREE.Group>(null);
  const blocks = useMemo(() => Array.from({ length: 7 }, (_, index) => ({ x: (index - 3) * 1.65, y: (index % 3) * .65 + .35, z: (index % 2) * -1.2, scale: .55 + (index % 3) * .18 })), []);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * .045;
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, progress * .16, .04);
  });
  return <group ref={group}>
    <mesh position={[0, -.45, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#cbc4b7" roughness={1} /></mesh>
    {blocks.map((block, index) => <mesh key={index} position={[block.x, block.y, block.z]} scale={[block.scale, block.scale * 1.8, block.scale]}>
      <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={index % 3 === 0 ? "#b8b0a3" : "#d5cec1"} roughness={.88} metalness={.06} />
    </mesh>)}
    <mesh position={[0, 1.7, -1.8]} rotation={[0, 0, 0]}><boxGeometry args={[8, .12, .12]} /><meshStandardMaterial color="#171512" /></mesh>
    <Grid position={[0, -.43, 0]} args={[20, 20]} cellSize={1} cellThickness={.35} cellColor="#6d675f" sectionSize={5} sectionThickness={.8} sectionColor="#171512" fadeDistance={16} fadeStrength={2} infiniteGrid />
  </group>;
}

function CameraRig({ progress }: { progress: number }) {
  useFrame(({ camera }) => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 5.6 - progress * 3.4, .035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.2 + progress * 1.8, .035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 8.2 - progress * 1.3, .035);
    camera.lookAt(0, .5, 0);
  });
  return null;
}

export function ArchitecturalScene({ progress }: { progress?: number }) {
  const [reduced, setReduced] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(progress ?? 0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (progress !== undefined) return;
    const updateScroll = () => setScrollProgress(window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, [progress]);
  const sceneProgress = progress ?? scrollProgress;
  if (reduced) return <div aria-hidden className="absolute inset-0 concrete opacity-20" />;
  return <Canvas camera={{ position: [5.6, 2.2, 8.2], fov: 33 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
    <ambientLight intensity={1.4} />
    <hemisphereLight args={["#f4eadb", "#746b5e", 1.15]} />
    <directionalLight position={[4, 8, 5]} intensity={2.4} color="#fff4df" />
    <directionalLight position={[-4, 2, -4]} intensity={.7} color="#d68152" />
    <Structure progress={sceneProgress} />
    <CameraRig progress={sceneProgress} />
    <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
  </Canvas>;
}
