import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  progressRatio: number;
  accent: string;
};

export function ProgressScene({ progressRatio, accent }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const particles = new THREE.BufferGeometry();
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 1.1 + Math.random() * 1.4;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(accent),
      size: 0.035,
      transparent: true,
      opacity: 0.65
    });
    const points = new THREE.Points(particles, material);
    scene.add(points);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.035, 16, 120),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.35 })
    );
    scene.add(ring);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42 + progressRatio * 0.3, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff"), wireframe: true, transparent: true, opacity: 0.55 })
    );
    scene.add(core);

    const handleResize = () => {
      if (!mount) {
        return;
      }
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    let frame = 0;
    let animationId = 0;
    const animate = () => {
      frame += 0.01;
      points.rotation.z += 0.0015 + progressRatio * 0.003;
      points.rotation.x = Math.sin(frame) * 0.12;
      ring.rotation.z -= 0.003;
      core.rotation.x += 0.006;
      core.rotation.y += 0.008;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      particles.dispose();
      material.dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accent, progressRatio]);

  return <div className="progress-scene" ref={mountRef} aria-hidden="true" />;
}
