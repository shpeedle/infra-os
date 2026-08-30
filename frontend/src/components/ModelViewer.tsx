import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { THEME_COLORS, type Theme } from "../theme";

const DEFAULT_ISOMETRIC_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
const DEFAULT_VIEW_PADDING = 1.2;

interface ModelViewerProps {
  url: string | null;
  theme: Theme;
}

export function ModelViewer({ url, theme }: ModelViewerProps) {
  const [fitRequest, setFitRequest] = useState(0);
  const [resetRequest, setResetRequest] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const markLoaded = useCallback(() => {
    if (url) setLoadedUrl(url);
  }, [url]);
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
              camera={{ position: [20, 20, 20], fov: 45, near: 0.1, far: 1_000_000 }}
              dpr={[1, 2]}
              onCreated={({ camera }) => camera.up.set(0, 1, 0)}
            >
              <color attach="background" args={[colors.viewerBackground]} />
              <ambientLight intensity={1.5} />
              <directionalLight position={[8, 16, 8]} intensity={2.2} />
              <Suspense fallback={null}>
                <ModelScene
                  url={url}
                  theme={theme}
                  fitRequest={fitRequest}
                  resetRequest={resetRequest}
                  onReady={markLoaded}
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
      fitCamera(gltf.scene, camera, controls.current);
    }
  }, [camera, gltf.scene, resetRequest]);

  return (
    <>
      <primitive object={gltf.scene} />
      <gridHelper
        args={[40, 40, THEME_COLORS[theme].viewerGridMajor, THEME_COLORS[theme].viewerGridMinor]}
      />
      <axesHelper args={[3]} />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  );
}

function fitCamera(
  object: THREE.Object3D,
  camera: THREE.Camera,
  controls: OrbitControlsImpl | null,
) {
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return;

  const center = bounds.getCenter(new THREE.Vector3());
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const distance = getFitDistance(Math.max(sphere.radius, 1), camera);

  // CadQuery exports GLB with the standard glTF Y-up scene transform. Keep the
  // camera and helpers in that coordinate system so the floor stays horizontal.
  camera.up.set(0, 1, 0);
  camera.position.copy(center).addScaledVector(DEFAULT_ISOMETRIC_DIRECTION, distance);
  camera.lookAt(center);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.near = Math.max(distance / 1000, 0.1);
    camera.far = Math.max(1000, distance * 10);
    camera.updateProjectionMatrix();
  }
  controls?.target.copy(center);
  controls?.update();
}

function getFitDistance(radius: number, camera: THREE.Camera): number {
  if (!(camera instanceof THREE.PerspectiveCamera)) return radius * 3 * DEFAULT_VIEW_PADDING;

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(camera.aspect, 0.01);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingHalfFov = Math.min(verticalFov, horizontalFov) / 2;

  return (radius / Math.sin(limitingHalfFov)) * DEFAULT_VIEW_PADDING;
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
