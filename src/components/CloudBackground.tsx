"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { resolveSky, type ProfileSettings } from "@/lib/types";

interface Props {
  /** Either a preset id or, when useCustomSky is true, the custom colors. */
  skyThemeId: string;
  useCustomSky: boolean;
  customSky: { top: string; bottom: string; fog: string };
  cloudDensity: number;
  cloudSpeed: number;
}

/**
 * CloudBackground — 1:1 faithful port of the classic Mr.doob "clouds" demo
 * (https://github.com/mrdoob/three.js/blob/master/examples/webgl_clouds.html)
 * to modern three.js (r150+).
 *
 * Visual rules we preserve from the original:
 *  - The sky is drawn as a body background linear-gradient(topColor -> bottomColor).
 *  - N cloud sprite planes are merged into a single BufferGeometry; the plane
 *    is a 64x64 PlaneGeometry textured with cloud.png.
 *  - Two mesh copies are placed at z=0 and z=-8000 to give a continuous loop
 *    when the camera flies forward (camera.position.z = -position + 8000, where
 *    position = (now*0.03*speed) % 8000).
 *  - The ShaderMaterial applies a fog factor so clouds fade into the horizon
 *    (fogColor = bottomColor). This is what makes the sky/cloud boundary smooth.
 *  - The shader multiplies texture alpha by pow(gl_FragCoord.z, 20.0) to fade
 *    distant clouds into nothing — the key to the "ethereal" look.
 *  - Mouse parallax: camera.position.x/y drift toward mouse offset.
 *
 * Density & speed are now user-configurable; changing them triggers a full
 * scene rebuild (cheap — a few hundred ms at most).
 */
export default function CloudBackground(props: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Keep latest props in a ref so the animation loop reads fresh values
  // without restarting.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  // Sky theme hot-swap effect (no rebuild).
  useEffect(() => {
    const sky = resolveSky({
      skyThemeId: props.skyThemeId,
      useCustomSky: props.useCustomSky,
      customSky: props.customSky,
    });
    applyBodyBackground(sky.top, sky.bottom);
    // Fog color is updated by the per-frame loop below via propsRef.
  }, [props.skyThemeId, props.useCustomSky, props.customSky]);

  // Full scene build — rebuild only when density or speed changes.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const initialSky = resolveSky({
      skyThemeId: propsRef.current.skyThemeId,
      useCustomSky: propsRef.current.useCustomSky,
      customSky: propsRef.current.customSky,
    });
    applyBodyBackground(initialSky.top, initialSky.bottom);

    // ----- Renderer -----
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ----- Scene & Camera -----
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      1,
      3000
    );
    camera.position.z = 6000;

    // ----- Cloud texture -----
    const loader = new THREE.TextureLoader();
    const texture = loader.load("/cloud.png");
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    // ----- Fog (color matches horizon so clouds blend into sky) -----
    const fogColor = new THREE.Color(initialSky.fog);

    // ----- ShaderMaterial: faithful port of the original shaders -----
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        fogColor: { value: fogColor },
        fogNear: { value: -100 },
        fogFar: { value: 3000 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 fogColor;
        uniform float fogNear;
        uniform float fogFar;
        varying vec2 vUv;
        void main() {
          float depth = gl_FragCoord.z / gl_FragCoord.w;
          float fogFactor = smoothstep(fogNear, fogFar, depth);
          gl_FragColor = texture2D(map, vUv);
          gl_FragColor.w *= pow(gl_FragCoord.z, 20.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
          gl_FragColor = mix(gl_FragColor, vec4(fogColor, gl_FragColor.w), fogFactor);
        }
      `,
      depthTest: false,
      transparent: true,
    });

    // ----- Build the cloud field: N merged plane instances -----
    const planeGeo = new THREE.PlaneGeometry(64, 64);
    const count = Math.max(500, Math.min(20000, Math.round(props.cloudDensity)));
    const merged = mergePlaneInstances(planeGeo, count);

    const mesh1 = new THREE.Mesh(merged, material);
    scene.add(mesh1);
    const mesh2 = new THREE.Mesh(merged, material);
    mesh2.position.z = -8000;
    scene.add(mesh2);

    // ----- Mouse parallax -----
    let mouseX = 0;
    let mouseY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - windowHalfX) * 0.25;
      mouseY = (e.clientY - windowHalfY) * 0.15;
    };
    document.addEventListener("mousemove", onMouseMove, false);

    // ----- Resize -----
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      const sky = resolveSky({
        skyThemeId: propsRef.current.skyThemeId,
        useCustomSky: propsRef.current.useCustomSky,
        customSky: propsRef.current.customSky,
      });
      applyBodyBackground(sky.top, sky.bottom);
    };
    window.addEventListener("resize", onResize, false);

    // ----- Animation loop -----
    const start_time = Date.now();
    let rafId = 0;
    const render = () => {
      const p = propsRef.current;
      // Hot-swap fog color in case the user changed the sky theme without
      // triggering a rebuild.
      const sky = resolveSky({
        skyThemeId: p.skyThemeId,
        useCustomSky: p.useCustomSky,
        customSky: p.customSky,
      });
      (material.uniforms.fogColor.value as THREE.Color).set(sky.fog);

      const speed = Math.max(0.1, Math.min(5, p.cloudSpeed));
      const position = ((Date.now() - start_time) * 0.03 * speed) % 8000;
      camera.position.x += (mouseX - camera.position.x) * 0.01;
      camera.position.y += (-mouseY - camera.position.y) * 0.01;
      camera.position.z = -position + 8000;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      try {
        mount.removeChild(renderer.domElement);
      } catch {}
      merged.dispose();
      planeGeo.dispose();
      texture.dispose();
      material.dispose();
      renderer.dispose();
    };
    // Rebuild only when density changes; speed is read live via propsRef.
  }, [props.cloudDensity]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * Apply the sky gradient as the page body background — matches the original
 * demo, which builds a 32x(innerHeight) canvas gradient and assigns it as
 * body background. We use a CSS linear-gradient for crispness.
 */
function applyBodyBackground(top: string, bottom: string) {
  if (typeof document === "undefined") return;
  document.body.style.background = `linear-gradient(to bottom, ${top} 0%, ${bottom} 100%)`;
  document.body.style.backgroundAttachment = "fixed";
  document.body.style.minHeight = "100vh";
}

/**
 * Merge `count` copies of `planeGeo` into a single BufferGeometry, with each
 * copy independently positioned / rotated / scaled — equivalent to the
 * original `GeometryUtils.merge(geometry, plane)` loop. Returns a BufferGeometry.
 */
function mergePlaneInstances(planeGeo: THREE.PlaneGeometry, count: number): THREE.BufferGeometry {
  const srcPos = planeGeo.attributes.position.array as Float32Array;
  const srcUv = planeGeo.attributes.uv.array as Float32Array;
  const srcIndex = planeGeo.index ? (planeGeo.index.array as Uint16Array | Uint32Array) : null;

  const vertsPerPlane = srcPos.length / 3;
  const indicesPerPlane = srcIndex ? srcIndex.length : 0;

  const totalVerts = vertsPerPlane * count;
  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let indexArr: Uint32Array | null = null;
  if (srcIndex) {
    indexArr = new Uint32Array(indicesPerPlane * count);
  }

  const position = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();

  let posOffset = 0;
  let uvOffset = 0;
  let idxOffset = 0;
  let vertBase = 0;

  for (let i = 0; i < count; i++) {
    position.set(
      Math.random() * 1000 - 500,
      -Math.random() * Math.random() * 200 - 15,
      i
    );
    rotation.set(0, 0, Math.random() * Math.PI);
    const s = Math.random() * Math.random() * 1.5 + 0.5;
    scale.set(s, s, s);
    quaternion.setFromEuler(rotation);
    matrix.compose(position, quaternion, scale);

    const v = new THREE.Vector3();
    for (let k = 0; k < vertsPerPlane; k++) {
      v.fromArray(srcPos, k * 3);
      v.applyMatrix4(matrix);
      positions[posOffset++] = v.x;
      positions[posOffset++] = v.y;
      positions[posOffset++] = v.z;
    }
    uvs.set(srcUv, uvOffset);
    uvOffset += srcUv.length;

    if (indexArr && srcIndex) {
      for (let k = 0; k < srcIndex.length; k++) {
        indexArr[idxOffset++] = srcIndex[k] + vertBase;
      }
      vertBase += vertsPerPlane;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  if (indexArr) geo.setIndex(new THREE.BufferAttribute(indexArr, 1));
  return geo;
}
