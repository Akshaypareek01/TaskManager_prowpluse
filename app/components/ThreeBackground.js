"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 650;
const PROW_CYAN = 0x5ec8f2;
const PROW_BLUE = 0x3b8fd4;

/**
 * Soft circular sprite texture for round particles.
 * @returns {THREE.CanvasTexture}
 */
function createParticleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Full-screen Three.js particle field with a cursor-following glass bubble.
 */
export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.z = 55;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const sprite = createParticleTexture();

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: PROW_CYAN,
        size: 0.85,
        map: sprite,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.01,
      })
    );
    scene.add(particles);

    const accentParticles = new THREE.Points(
      particleGeo.clone(),
      new THREE.PointsMaterial({
        color: PROW_BLUE,
        size: 0.6,
        map: sprite,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.01,
      })
    );
    accentParticles.rotation.z = 0.4;
    scene.add(accentParticles);

    const bubbleGroup = new THREE.Group();
    const outerBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: PROW_CYAN,
        transparent: true,
        opacity: 0.5,
        roughness: 0.06,
        metalness: 0.08,
        transmission: 0.25,
        thickness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: PROW_CYAN,
        emissiveIntensity: 0.2,
      })
    );
    const innerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x9ec5ef,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      })
    );
    bubbleGroup.add(outerBubble, innerGlow);
    scene.add(bubbleGroup);

    const pointer = { x: 0, y: 0 };
    const bubblePos = { x: 0, y: 0 };

    /**
     * Update normalized pointer from mouse or touch.
     * @param {number} clientX
     * @param {number} clientY
     */
    function setPointer(clientX, clientY) {
      pointer.x = (clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    const onMouseMove = (e) => setPointer(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!reducedMotion) {
        particles.rotation.y = t * 0.012;
        particles.rotation.x = t * 0.006;
        accentParticles.rotation.y = -t * 0.008;
      }

      const targetX = pointer.x * 38;
      const targetY = pointer.y * 24;
      const lerp = reducedMotion ? 1 : 0.09;
      bubblePos.x += (targetX - bubblePos.x) * lerp;
      bubblePos.y += (targetY - bubblePos.y) * lerp;
      bubbleGroup.position.set(bubblePos.x, bubblePos.y, 12);

      const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 2.5) * 0.04;
      bubbleGroup.scale.setScalar(pulse);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      sprite.dispose();
      particleGeo.dispose();
      particles.material.dispose();
      accentParticles.geometry.dispose();
      accentParticles.material.dispose();
      outerBubble.geometry.dispose();
      outerBubble.material.dispose();
      innerGlow.geometry.dispose();
      innerGlow.material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
