import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { THEME_COLORS, type Theme } from "../theme";

interface ModelViewerProps {
  url: string | null;
  theme: Theme;
}

export function ModelViewer({ url, theme }: ModelViewerProps) {
  const [fitRequest, setFitRequest] = useState(0);
  const [resetRequest, setResetRequest] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const colors = THEME_COLORS[theme];
  const loadState: "empty" | "loading" | "ready" | "error" = !url
    ? "empty"
    : failedUrl === url
      ? "error"
      : loadedUrl === url
        ? "ready"
        : "loading";

  return (
    <section className="viewer-panel" aria-label="Generated CAD preview">
      <div className="viewer-heading">
        <div>
          <span className="eyebrow">Browser preview</span>
          <h2>Generated GLB</h2>
        </div>
        <div className="viewer-actions">
          <button
            className="button button--quiet"
            type="button"
            onClick={() => setFitRequest((request) => request + 1)}
            disabled={loadState !== "ready"}
          >
            Fit view
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => setResetRequest((request) => request + 1)}
            disabled={loadState !== "ready"}
          >
            Reset view
          </button>
        </div>
      </div>
      <div className="viewer-stage">
        {!url ? (
          <div className="viewer-message">
            <div className="wireframe wireframe--cube" aria-hidden="true" />
            <strong>No generated model yet</strong>
            <span>Generate CAD to replace this preview with the current scene.</span>
          </div>
        ) : (
          <ViewerErrorBoundary
            key={url}
            onError={() => setFailedUrl(url)}
            fallback={
              <div className="viewer-message viewer-message--error">
                <strong>GLB preview unavailable</strong>
                <span>
                  The artifact could not be loaded. The 2D scene is still intact; retry generation.
                </span>
              </div>
            }
          >
            <Canvas
              camera={{ position: [14, -18, 14], fov: 45, near: 0.1, far: 1000 }}
              dpr={[1, 2]}
              onCreated={({ camera }) => camera.up.set(0, 0, 1)}
            >
              <color attach="background" args={[colors.viewerBackground]} />
              <ambientLight intensity={1.5} />
              <directionalLight position={[8, -8, 16]} intensity={2.2} />
              <Suspense fallback={null}>
                <ModelScene
                  url={url}
                  theme={theme}
                  fitRequest={fitRequest}
                  resetRequest={resetRequest}
                  onReady={() => setLoadedUrl(url)}
                />
              </Suspense>
            </Canvas>
          </ViewerErrorBoundary>
        )}
        {loadState === "loading" && url && (
          <div className="viewer-overlay" role="status">
            Loading GLB preview…
          </div>
        )}
        {loadState === "error" && url && (
          <div className="viewer-overlay viewer-overlay--error">Preview failed</div>
        )}
      </div>
    </section>
  );
}

interface ModelSceneProps {
  url: string;
  theme: Theme;
  fitRequest: number;
  resetRequest: number;
  onReady: () => void;
}

function ModelScene({ url, theme, fitRequest, resetRequest, onReady }: ModelSceneProps) {
  const gltf = useGLTF(url);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    onReady();
    fitCamera(gltf.scene, camera, controls.current);
  }, [camera, gltf.scene, onReady]);

  useEffect(() => {
    if (fitRequest > 0) fitCamera(gltf.scene, camera, controls.current);
  }, [camera, fitRequest, gltf.scene]);

  useEffect(() => {
    if (resetRequest > 0) {
      camera.position.set(14, -18, 14);
      camera.lookAt(0, 0, 0);
      controls.current?.target.set(0, 0, 0);
      controls.current?.update();
    }
  }, [camera, resetRequest]);

  return (
    <>
      <primitive object={gltf.scene} />
      <gridHelper
        args={[40, 40, THEME_COLORS[theme].viewerGridMajor, THEME_COLORS[theme].viewerGridMinor]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <axesHelper args={[3]} />
      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} />
    </>
  );
}

function fitCamera(
  object: THREE.Object3D,
  camera: THREE.Camera,
  controls: OrbitControlsImpl | null,
) {
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 1);
  camera.position.set(center.x + radius * 1.35, center.y - radius * 1.35, center.z + radius * 1.1);
  camera.lookAt(center);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.far = Math.max(1000, radius * 20);
    camera.updateProjectionMatrix();
  }
  controls?.target.copy(center);
  controls?.update();
}

interface ViewerErrorBoundaryProps {
  fallback: ReactNode;
  onError: () => void;
  children: ReactNode;
}

interface ViewerErrorBoundaryState {
  hasError: boolean;
}

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  state: ViewerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ViewerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
