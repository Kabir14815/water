import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Pixel-faithful “3D” of image.png: two crossed planes with the reference texture.
 * Orthographic front view matches the PNG exactly (same aspect, no procedural reshaping).
 */

const host = document.getElementById("shop-bottle-viewer");
if (!host) {
  /* not on shop page */
} else {
  const texPath = new URL("./image.png", import.meta.url).href;

  function showFallback() {
    host.classList.add("shop-3d--fallback");
    host.innerHTML =
      '<img src="image.png" alt="aqvyn bottle" class="shop-3d-fallback-img" width="400" height="600" />';
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    if (!renderer.getContext()) {
      renderer.dispose();
      renderer = null;
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x000000, 0);
    }
  } catch {
    renderer = null;
  }

  if (!renderer) {
    showFallback();
  } else {
    const scene = new THREE.Scene();
    scene.background = null;

    let cam;
    let controls;
    let planeHalfW = 1;
    let planeHalfH = 1;

    renderer.domElement.classList.add("shop-3d-canvas");
    host.appendChild(renderer.domElement);

    function resize() {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const viewAspect = width / height;

      const fitPadding = 1.14;
      let frustumHalfH = planeHalfH * fitPadding;
      let frustumHalfW = frustumHalfH * viewAspect;

      const minHalfW = planeHalfW * fitPadding;
      if (frustumHalfW < minHalfW) {
        frustumHalfW = minHalfW;
        frustumHalfH = frustumHalfW / viewAspect;
      }

      if (!cam) {
        cam = new THREE.OrthographicCamera(
          -frustumHalfW,
          frustumHalfW,
          frustumHalfH,
          -frustumHalfH,
          0.05,
          80
        );
        cam.position.set(0, 0, 10);
        cam.lookAt(0, 0, 0);

        controls = new OrbitControls(cam, renderer.domElement);
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableZoom = true;
        controls.target.set(0, 0, 0);
        controls.minZoom = 0.7;
        controls.maxZoom = 2.5;
      } else {
        cam.left = -frustumHalfW;
        cam.right = frustumHalfW;
        cam.top = frustumHalfH;
        cam.bottom = -frustumHalfH;
        cam.updateProjectionMatrix();
      }

      controls.update();
      renderer.setSize(width, height, false);
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      texPath,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(
          16,
          renderer.capabilities.getMaxAnisotropy()
        );
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;

        const img = tex.image;
        const aspect = img.width / Math.max(1, img.height);
        const h = 2.35;
        const w = h * aspect;
        planeHalfW = w / 2;
        planeHalfH = h / 2;

        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.04,
          depthWrite: true,
        });

        const cross = new THREE.Group();
        const front = new THREE.Mesh(geo, mat);
        const side = new THREE.Mesh(geo, mat);
        side.rotation.y = Math.PI / 2;
        cross.add(front, side);
        scene.add(cross);

        const ro = new ResizeObserver(resize);
        ro.observe(host);
        resize();

        function tick() {
          requestAnimationFrame(tick);
          controls.update();
          renderer.render(scene, cam);
        }
        tick();
      },
      undefined,
      () => {
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
        renderer.dispose();
        showFallback();
      }
    );
  }
}
