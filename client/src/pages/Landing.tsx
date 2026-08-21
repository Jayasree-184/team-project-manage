import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Link, useLocation } from "wouter";
import { useSession } from "../auth/useSession";

const scenes = [
  { id: "01", label: "COMMAND CENTER", title: "A system built for visible work.", text: "Projects, people, and deadlines aligned inside one controlled operating layer." },
  { id: "02", label: "PROJECTS", title: "Shape the whole field.", text: "Turn a brief into a structured project with clear ownership, dates, and momentum." },
  { id: "03", label: "TASKS", title: "Make the next move obvious.", text: "Priorities, status, and assignment stay legible from the first handoff to the final close." },
  { id: "04", label: "TEAM", title: "Give every operator a scope.", text: "Role-based access keeps the command center powerful without making it noisy." },
  { id: "05", label: "PROGRESS", title: "Read movement, not theater.", text: "Derived progress and activity signals reveal where work is moving and where it is blocked." },
  { id: "06", label: "DEADLINE HISTORY", title: "Keep the record intact.", text: "Every changed deadline retains its previous state, reason, actor, and timestamp." },
  { id: "07", label: "DASHBOARD", title: "Enter the control room.", text: "A focused interface for the people making the work happen." },
];

const concretePalette = ["#d8d0c3", "#b6aea2", "#8f887d", "#c6bfb3"];
const dataPalette = ["#c56b42", "#171512", "#e2d4bd", "#756f67"];

type MorphBlockProps = { index: number; progress: number; handoff: number; count: number };
function MorphBlock({ index, progress, handoff, count }: MorphBlockProps) {
  const ref = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => ({
    x: ((index * 7) % 11) - 5.5,
    y: (index % 4) * 0.72 - 0.15,
    z: -((index * 3) % 7) - 1,
    sx: index % 5 === 0 ? 2.4 : 1.05 + (index % 3) * 0.35,
    sy: index % 4 === 0 ? 2.5 : 0.65 + (index % 3) * 0.3,
    sz: index % 6 === 0 ? 0.8 : 1.15,
    lane: index % 4,
  }), [index]);

  useFrame(() => {
    if (!ref.current) return;
    const morph = THREE.MathUtils.smoothstep(Math.min(1, Math.max(0, progress * 1.55 - 0.12)), 0, 1);
    const laneX = (seed.lane - 1.5) * 2.15;
    const dataY = 0.15 + (index % 3) * 0.62;
    const dataZ = -1.2 - (index % 5) * 0.48;
    const targetX = THREE.MathUtils.lerp(seed.x, laneX, morph);
    const targetY = THREE.MathUtils.lerp(seed.y, dataY, morph) + handoff * 0.38;
    const targetZ = THREE.MathUtils.lerp(seed.z, dataZ, morph) - handoff * 1.2;
    ref.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.075);
    ref.current.scale.lerp(new THREE.Vector3(
      THREE.MathUtils.lerp(seed.sx, 1.35 + (index % 3) * .38, morph) * (1 + handoff * .24),
      THREE.MathUtils.lerp(seed.sy, .18 + (index % 4) * .08, morph) * (1 + handoff * .12),
      THREE.MathUtils.lerp(seed.sz, .12, morph),
    ), 0.075);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, morph * (index % 2 ? .08 : -.08), .06);
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, morph * (index - count / 2) * .018, .06);
  });

  return <mesh ref={ref} position={[seed.x, seed.y, seed.z]}>
    <boxGeometry args={[seed.sx, seed.sy, seed.sz]} />
    <meshStandardMaterial color={concretePalette[index % concretePalette.length]} roughness={.9} metalness={.04} emissive={dataPalette[index % dataPalette.length]} emissiveIntensity={0} />
  </mesh>;
}

function MorphArchitecture({ progress, handoff }: { progress: number; handoff: number }) {
  const group = useRef<THREE.Group>(null);
  const blocks = useMemo(() => Array.from({ length: 28 }, (_, index) => index), []);
  const dataBars = useMemo(() => Array.from({ length: 12 }, (_, index) => index), []);
  useFrame(() => {
    if (!group.current) return;
    const stage = progress * 6;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -.08 + progress * .44 + handoff * .3, .035);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, Math.sin(stage * .3) * .18 + handoff * .8, .04);
    group.current.scale.lerp(new THREE.Vector3(1 + handoff * .16, 1 + handoff * .16, 1 + handoff * .16), .05);
  });

  return <group ref={group}>
    <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#c6bfb3" roughness={1} /></mesh>
    <Grid position={[0, -.97, 0]} args={[30, 30]} cellSize={1} cellThickness={.25} cellColor="#6b655e" sectionSize={5} sectionThickness={.65} sectionColor="#171512" fadeDistance={18} fadeStrength={2} infiniteGrid />
    {blocks.map(index => <MorphBlock key={index} index={index} progress={progress} handoff={handoff} count={blocks.length} />)}
    <mesh position={[0, 2.3, -5.1]}><boxGeometry args={[11.5, 6.3, .22]} /><meshStandardMaterial color="#d1c9bc" roughness={.97} /></mesh>
    {[-4.8, -2.4, 0, 2.4, 4.8].map(x => <mesh key={x} position={[x, 2.15, -4.8]}><boxGeometry args={[.22, 5.6, .22]} /><meshStandardMaterial color="#171512" roughness={.8} /></mesh>)}
    <mesh position={[0, 3.3, -4.8]}><boxGeometry args={[11, .22, .22]} /><meshStandardMaterial color="#171512" roughness={.8} /></mesh>
    <mesh position={[0, .7, -2.8]}><boxGeometry args={[8, .16, 3.4]} /><meshStandardMaterial color="#b2aa9e" roughness={.9} /></mesh>
    {dataBars.map(index => <group key={`bar-${index}`} position={[(index % 4 - 1.5) * 2.15, .18 + (index % 3) * .62, -1.1 - Math.floor(index / 4) * .55]}>
      <mesh scale={[1, 1, .08]}><boxGeometry args={[1.65, .32, 1]} /><meshStandardMaterial color={dataPalette[index % dataPalette.length]} roughness={.56} metalness={.2} /></mesh>
      <mesh position={[0, -.25, .02]}><boxGeometry args={[1.25, .035, .035]} /><meshStandardMaterial color="#c56b42" emissive="#c56b42" emissiveIntensity={.35} /></mesh>
    </group>)}
    {[-3.2, -1.1, 1.1, 3.2].map((x, index) => <group key={`node-${x}`} position={[x, 2.2 + Math.sin(index) * .25, -2.2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.28, .045, 8, 24]} /><meshStandardMaterial color="#c56b42" emissive="#c56b42" emissiveIntensity={.35} /></mesh>
      <mesh><sphereGeometry args={[.07, 10, 10]} /><meshStandardMaterial color="#f0e8d9" /></mesh>
    </group>)}
    <Text position={[-4.8, 4.15, -4.55]} fontSize={.16} color="#171512" anchorX="left" letterSpacing={.08}>CONCRETE / DATA TRANSFER</Text>
    <Text position={[2.4, 3.72, -4.54]} fontSize={.13} color="#c56b42" anchorX="left" letterSpacing={.1}>LIVE REGISTER 07.26</Text>
  </group>;
}

function LandingCamera({ progress, handoff }: { progress: number; handoff: number }) {
  useFrame(({ camera }) => {
    const stage = progress * 6;
    const terminal = handoff * 2.2;
    const x = 7.3 - stage * 1.12 - terminal * 1.8 + Math.sin(stage * .4) * .42;
    const y = 2.35 + Math.sin(stage * .55) * .82 + stage * .2 + terminal * .52;
    const z = 10.2 - stage * .52 - terminal * 3.4;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, x, .045);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, y, .045);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, z, .045);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, Math.sin(stage * .35) * .035, .035);
    camera.lookAt(.3 + terminal * .18, .66 + stage * .1 + terminal * .15, -1.25 - terminal * .35);
  });
  return null;
}

function LandingCanvas({ progress, reduced, handoff }: { progress: number; reduced: boolean; handoff: number }) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (reduced) { setWebglAvailable(false); return; }
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2") ?? probe.getContext("webgl") ?? probe.getContext("experimental-webgl");
      setWebglAvailable(Boolean(context));
      if (context && "getExtension" in context) (context as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setWebglAvailable(false); }
  }, [reduced]);
  if (reduced || webglAvailable !== true) return <div className="landing-scene-fallback" aria-hidden="true" />;
  return <Canvas camera={{ position: [7.3, 2.35, 10.2], fov: 34 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true }} fallback={<div className="landing-scene-fallback" aria-hidden="true" />}>
    <ambientLight intensity={1.18} /><hemisphereLight args={["#f5ecdd", "#665d53", 1.2]} /><directionalLight position={[4, 8, 5]} intensity={2.1} color="#fff2dc" /><directionalLight position={[-5, 3, -3]} intensity={.62} color="#d68152" />
    <MorphArchitecture progress={progress} handoff={handoff} /><LandingCamera progress={progress} handoff={handoff} /><OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
  </Canvas>;
}

export default function Landing() {
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [handoff, setHandoff] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useSession();
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReduced = () => setReduced(media.matches);
    const updateScroll = () => { const next = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight); setProgress(next); setActiveScene(Math.min(scenes.length - 1, Math.round(next * (scenes.length - 1)))); };
    updateReduced(); updateScroll(); media.addEventListener("change", updateReduced); window.addEventListener("scroll", updateScroll, { passive: true });
    return () => { media.removeEventListener("change", updateReduced); window.removeEventListener("scroll", updateScroll); };
  }, []);
  const scrollToSystem = () => document.getElementById("landing-system")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  const enterDashboard = () => {
    if (navigating) return;
    if (reduced) { navigate(user ? "/app" : "/login"); return; }
    setNavigating(true); const started = performance.now();
    const animateHandoff = (now: number) => { const t = Math.min(1, (now - started) / 900); setHandoff(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(animateHandoff); else window.setTimeout(() => navigate(user ? "/app" : "/login"), 120); };
    requestAnimationFrame(animateHandoff);
  };
  return <main className="landing-page" id="landing-system">
    <div className={`landing-canvas ${navigating ? "landing-canvas-handoff" : ""}`} aria-hidden="true"><LandingCanvas progress={progress} reduced={reduced} handoff={handoff} /></div>
    <header className="landing-nav"><div><span className="landing-mark" /> <span>TPM / 01</span><strong>ATLAS OFFICE</strong></div><div className="landing-nav-status"><span className="status-dot" /> SYSTEM STATUS: ONLINE</div><Link href="/login" className="landing-nav-link">OPERATOR LOGIN ↗</Link></header>
    <section className="landing-hero landing-section"><div className="landing-hero-copy"><p className="eyebrow">PROJECT CONTROL SYSTEM / 2026</p><h1>PROJECT<br /><em>CONTROL</em><br />SYSTEM</h1><p className="landing-subtitle">PLAN. ASSIGN. EXECUTE.</p><p className="landing-intro">A concrete operating layer for teams moving complex work from brief to delivery.</p><div className="landing-actions"><button className="landing-cta" onClick={enterDashboard} disabled={navigating}>ENTER DASHBOARD <span>→</span></button><button className="landing-secondary" onClick={scrollToSystem}>VIEW SYSTEM <span>↓</span></button></div></div><div className="landing-hero-index"><span>SCENE</span><strong>01</strong><small>COMMAND CENTER</small></div></section>
    <section className="landing-readout" aria-label="System status"><div><span>SYSTEM STATUS</span><strong>{progress > .92 ? "READY" : "ONLINE"}</strong></div><div><span>PROJECTS</span><strong>ACTIVE</strong></div><div><span>TASKS</span><strong>TRACKED</strong></div><div><span>API</span><strong>CONNECTED</strong></div><div className="landing-live-readout"><span>SCENE PROGRESS</span><strong>{String(activeScene + 1).padStart(2, "0")} / 07</strong></div></section>
    <div className="landing-scenes">{scenes.slice(1).map((scene, index) => { const sceneIndex = index + 1; const distance = Math.abs(sceneIndex - activeScene); const reveal = reduced ? 1 : Math.max(.38, 1 - distance * .18); return <section className="landing-section landing-scene-section" data-active={sceneIndex === activeScene} key={scene.id} style={{ opacity: reveal, transform: `translateY(${reduced ? 0 : distance * 10}px)` }}><div className="landing-scene-number"><span>SCENE</span><strong>{scene.id}</strong></div><div><p className="eyebrow">{scene.label}</p><h2>{scene.title}</h2><p className="landing-scene-text">{scene.text}</p></div><div className="landing-technical">{scene.id} / 07<br />CONTROL LAYER<br /><span>◼ LIVE REGISTER</span></div></section>; })}</div>
    <footer className="landing-footer"><div><span className="eyebrow">SCENE 07 / DASHBOARD</span><h2>Make work<br /><em>visible.</em></h2></div><button className="landing-cta" onClick={enterDashboard} disabled={navigating}>ENTER CONTROL ROOM <span>→</span></button></footer>
    {navigating && <div className="landing-terminal-transition" role="status" aria-live="polite"><span className="eyebrow">CONTROL TERMINAL / HANDOFF</span><strong>CONNECTING TO<br />LIVE DASHBOARD</strong><small>AUTH ROUTE {user ? "READY" : "REQUIRED"} · API LINK STABLE</small></div>}
    <div className="landing-progress" aria-hidden="true"><span style={{ transform: `scaleY(${Math.max(.06, progress)})` }} /></div><div className="landing-scene-label" aria-live="polite"><span>{scenes[activeScene].id}</span> {scenes[activeScene].label}</div>
  </main>;
}
