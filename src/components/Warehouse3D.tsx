import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FabricItem, WarehouseConfig } from '../types';
import { Box, Layers, Truck, Eye, ZoomIn, ZoomOut, RotateCcw, Sparkles, MousePointer } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface Warehouse3DProps {
  config: WarehouseConfig;
  fabrics: FabricItem[];
  selectedLocationId?: string | null;
  onSelectLocation?: (locationId: string | null, locationType?: 'ke' | 'pallet' | 'xe', locationName?: string) => void;
  onOpenOperations?: (locationId?: string) => void;
}

export const Warehouse3D: React.FC<Warehouse3DProps> = ({
  config,
  fabrics,
  selectedLocationId,
  onSelectLocation,
  onOpenOperations
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);
  const highlightedMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number>(0);

  const [showLegend, setShowLegend] = useState(false);

  const [hoveredInfo, setHoveredInfo] = useState<{
    id: string;
    name: string;
    type: 'ke' | 'pallet' | 'xe';
    fabrics: FabricItem[];
    screenX: number;
    screenY: number;
  } | null>(null);

  const [activeInspect, setActiveInspect] = useState<{
    id: string;
    name: string;
    type: 'ke' | 'pallet' | 'xe';
    fabrics: FabricItem[];
  } | null>(null);

  // Focus location camera animation
  const targetCamPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);

  // Sync latest props into refs for event listeners
  const selectedLocationIdRef = useRef(selectedLocationId);
  useEffect(() => {
    selectedLocationIdRef.current = selectedLocationId;
    if (!selectedLocationId) {
      setActiveInspect(null);
    }
  }, [selectedLocationId]);

  const fabricsRef = useRef(fabrics);
  useEffect(() => {
    fabricsRef.current = fabrics;
  }, [fabrics]);

  const onSelectLocationRef = useRef(onSelectLocation);
  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    camera.position.set(24, 20, 30);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below floor
    controls.minDistance = 4;
    controls.maxDistance = 110;
    controls.target.set(0, 2, 0);
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controls.enablePan = true;
    controlsRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -35;
    dirLight.shadow.camera.right = 35;
    dirLight.shadow.camera.top = 35;
    dirLight.shadow.camera.bottom = -35;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.45);
    fillLight.position.set(-25, 20, -25);
    scene.add(fillLight);

    // 6. Floor & Environment (Bố cục mặt bằng 30x24)
    const floorGeo = new THREE.PlaneGeometry(72, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.7,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid lines on floor (24 subdivisions aligned to 30x24 layout)
    const grid = new THREE.GridHelper(72, 24, 0x94a3b8, 0xcbd5e1);
    grid.position.y = 0.01;
    scene.add(grid);

    // Yellow warehouse safety walkway lines
    const createWalkway = (x: number, z: number, w: number, d: number) => {
      const lineGeo = new THREE.PlaneGeometry(w, d);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(x, 0.02, z);
      scene.add(lineMesh);
    };

    createWalkway(-15, 0, 0.4, 45);
    createWalkway(2, 0, 0.4, 45);
    createWalkway(18, 0, 0.4, 45);
    createWalkway(0, -20, 60, 0.4);
    createWalkway(0, 20, 60, 0.4);

    // 7. Warehouse structural pillars & boundary markers
    const pillarGeo = new THREE.BoxGeometry(0.8, 12, 0.8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    const pillarPositions = [
      [-30, -22], [-30, 22], [30, -22], [30, 22],
      [-15, -22], [-15, 22], [2, -22], [2, 22], [18, -22], [18, 22]
    ];
    pillarPositions.forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(px, 6, pz);
      p.castShadow = true;
      p.receiveShadow = true;
      scene.add(p);
    });

    // Raycasting event handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let topObj: THREE.Object3D | null = intersects[0].object;
        while (topObj && !topObj.userData?.locationId && topObj.parent) {
          topObj = topObj.parent;
        }

        if (topObj && topObj.userData?.locationId) {
          container.style.cursor = 'pointer';
          const locId = topObj.userData.locationId;
          const locName = topObj.userData.locationName || locId;
          const locType = topObj.userData.locationType || 'ke';
          const itemsHere = fabrics.filter((f) => f.viTriId === locId);

          setHoveredInfo({
            id: locId,
            name: locName,
            type: locType,
            fabrics: itemsHere,
            screenX: e.clientX,
            screenY: e.clientY
          });
          return;
        }
      }

      container.style.cursor = 'default';
      setHoveredInfo(null);
    };

    let pointerDownPos = { x: 0, y: 0 };
    let lastClickTime = 0;
    let lastClickLocId: string | null = null;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
      pointerDownPos = { x: clientX, y: clientY };
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'changedTouches' in e && e.changedTouches.length > 0 ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;

      // If user dragged more than 8 pixels, treat as orbit rotation/pan, not a click/tap
      const dist = Math.hypot(clientX - pointerDownPos.x, clientY - pointerDownPos.y);
      if (dist > 8) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);
      const now = Date.now();

      if (intersects.length > 0) {
        let topObj: THREE.Object3D | null = intersects[0].object;
        while (topObj && !topObj.userData?.locationId && topObj.parent) {
          topObj = topObj.parent;
        }

        if (topObj && topObj.userData?.locationId) {
          const locId = topObj.userData.locationId;
          const locName = topObj.userData.locationName || locId;
          const locType = topObj.userData.locationType || 'ke';
          const itemsHere = fabricsRef.current.filter((f) => f.viTriId === locId);

          const isCurrentSelected = selectedLocationIdRef.current === locId;
          const isQuickDoubleTap = now - lastClickTime < 400 && lastClickLocId === locId;

          if (isCurrentSelected || isQuickDoubleTap) {
            // Nhấp chuột lần 2 (hoặc nhấp đúp) -> BỎ CHỌN
            setActiveInspect(null);
            selectedLocationIdRef.current = null;
            lastClickLocId = null;
            lastClickTime = 0;
            if (onSelectLocationRef.current) {
              onSelectLocationRef.current(null);
            }
          } else {
            // Nhấp chuột 1 lần -> CHỌN
            selectedLocationIdRef.current = locId;
            lastClickLocId = locId;
            lastClickTime = now;

            setActiveInspect({
              id: locId,
              name: locName,
              type: locType,
              fabrics: itemsHere
            });

            if (onSelectLocationRef.current) {
              onSelectLocationRef.current(locId, locType, locName);
            }
          }
          return;
        }
      }

      // Nhấp chuột ra ngoài khoảng trống / sàn -> BỎ CHỌN
      setActiveInspect(null);
      selectedLocationIdRef.current = null;
      lastClickLocId = null;
      lastClickTime = 0;
      if (onSelectLocationRef.current) {
        onSelectLocationRef.current(null);
      }
    };

    const handleDoubleClick = () => {
      // Nhấp đúp chuột (2 lần liên tiếp) -> BỎ CHỌN
      setActiveInspect(null);
      selectedLocationIdRef.current = null;
      lastClickLocId = null;
      lastClickTime = 0;
      if (onSelectLocationRef.current) {
        onSelectLocationRef.current(null);
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('mousedown', handlePointerDown);
    renderer.domElement.addEventListener('touchstart', handlePointerDown, { passive: true });
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);
    renderer.domElement.addEventListener('touchend', handleClick as any);

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Smooth camera gliding when focus target is set
      if (targetCamPos.current && targetLookAt.current && camera && controls) {
        camera.position.lerp(targetCamPos.current, 0.06);
        controls.target.lerp(targetLookAt.current, 0.06);
        if (camera.position.distanceTo(targetCamPos.current) < 0.1) {
          targetCamPos.current = null;
          targetLookAt.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('mousedown', handlePointerDown);
      renderer.domElement.removeEventListener('touchstart', handlePointerDown);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      renderer.domElement.removeEventListener('touchend', handleClick as any);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Re-build 3D Warehouse items when config or fabrics change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up previous warehouse objects
    const toRemove: THREE.Object3D[] = [];
    scene.children.forEach((child) => {
      if (child.userData?.isWarehouseEntity) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((child) => scene.remove(child));
    interactiveObjectsRef.current = [];

    // Fabric roll cylinder geometry cache
    const rollGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.88, 16);
    rollGeo.rotateZ(Math.PI / 2); // horizontal roll
    const rollTubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 12);
    rollTubeGeo.rotateZ(Math.PI / 2);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xd4a373 }); // cardboard core

    // ==========================================
    // ==========================================
    // 1. RACKS (7 DÃY KỆ VẢI A, B, C, D, E, F, G: KỆ ĐÔI 4 TẦNG 80 Ô)
    // Mặt trước: Ô 01 - Ô 40 (Tầng 1..4)
    // Mặt sau: Ô 41 - Ô 80 (Tầng 1..4)
    // ==========================================
    const soKe = config.soKe || 7;
    const keWidth = 14; // Chiều dài dãy kệ (dọc trục Z)
    const keHeight = 4.8; // Chiều cao kệ 4 tầng
    const singleDepth = 1.32; // Độ sâu 1 kệ đơn (chứa cuộn vải dài ~1.2m)
    const gapBetweenRacks = 0.08; // Khe kỹ thuật giữa 2 lưng kệ khi ghép đôi
    const doubleDepth = singleDepth * 2 + gapBetweenRacks; // ~2.72m
    const rackSpacingX = 5.2; // Khoảng cách giữa các dãy kệ (lối đi ~2.48m)
    const startX = -((soKe - 1) * rackSpacingX) / 2 - 5.5;

    const colsCount = 10;
    const colStep = keWidth / colsCount;
    const numTiers = 4; // Kệ 4 tầng
    const tierStep = (keHeight - 0.4) / numTiers; // ~1.1m mỗi tầng

    for (let k = 1; k <= soKe; k++) {
      const rackLetter = String.fromCharCode(64 + k); // Dãy A, B, C, D, E, F, G...
      const rackGroup = new THREE.Group();
      rackGroup.userData = { isWarehouseEntity: true };
      const rackPosX = startX + (k - 1) * rackSpacingX;
      const rackPosZ = -2;
      rackGroup.position.set(rackPosX, 0, rackPosZ);

      // Steel upright materials
      const steelMat = new THREE.MeshStandardMaterial({
        color: 0xd97706, // Amber công nghiệp
        metalness: 0.6,
        roughness: 0.4
      });
      const beamMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.4,
        roughness: 0.4
      });
      const joinerMat = new THREE.MeshStandardMaterial({
        color: 0x475569, // Bát giằng thép nối ghép 2 kệ
        metalness: 0.7,
        roughness: 0.3
      });

      // Khung cột thép chịu lực cho 2 kệ ghép đôi
      // Mỗi vị trí bước cột gồm 4 trụ: Cột trước Kệ A, Cột lưng Kệ A, Cột lưng Kệ B, Cột sau Kệ B
      const xFrontOuter = -doubleDepth / 2;
      const xFrontSpine = -gapBetweenRacks / 2;
      const xBackSpine = gapBetweenRacks / 2;
      const xBackOuter = doubleDepth / 2;

      for (let c = 0; c <= colsCount; c++) {
        const colZ = -keWidth / 2 + c * colStep;

        // Trụ ngoài Kệ Trước (Mặt A)
        const uFront = new THREE.Mesh(new THREE.BoxGeometry(0.1, keHeight, 0.1), steelMat);
        uFront.position.set(xFrontOuter, keHeight / 2, colZ);
        uFront.castShadow = true;
        rackGroup.add(uFront);

        // Trụ lưng Kệ Trước
        const uFrontSpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, keHeight, 0.08), steelMat);
        uFrontSpine.position.set(xFrontSpine, keHeight / 2, colZ);
        rackGroup.add(uFrontSpine);

        // Trụ lưng Kệ Sau
        const uBackSpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, keHeight, 0.08), steelMat);
        uBackSpine.position.set(xBackSpine, keHeight / 2, colZ);
        rackGroup.add(uBackSpine);

        // Trụ ngoài Kệ Sau (Mặt B)
        const uBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, keHeight, 0.1), steelMat);
        uBack.position.set(xBackOuter, keHeight / 2, colZ);
        uBack.castShadow = true;
        rackGroup.add(uBack);

        // Bát bu-lông ghép đôi 2 lưng kệ (Double-rack joining plates ở 3 độ cao)
        [1.0, 2.5, 4.0].forEach((h) => {
          const joinPlate = new THREE.Mesh(
            new THREE.BoxGeometry(gapBetweenRacks + 0.12, 0.08, 0.14),
            joinerMat
          );
          joinPlate.position.set(0, h, colZ);
          rackGroup.add(joinPlate);
        });

        // Thanh giằng ngang hông kệ trước & kệ sau
        [0.4, 2.4, 4.4].forEach((h) => {
          const braceFront = new THREE.Mesh(
            new THREE.BoxGeometry(singleDepth, 0.04, 0.04),
            steelMat
          );
          braceFront.position.set(-singleDepth / 2 - gapBetweenRacks / 2, h, colZ);
          rackGroup.add(braceFront);

          const braceBack = new THREE.Mesh(
            new THREE.BoxGeometry(singleDepth, 0.04, 0.04),
            steelMat
          );
          braceBack.position.set(singleDepth / 2 + gapBetweenRacks / 2, h, colZ);
          rackGroup.add(braceBack);
        });
      }

      // 4 Tầng đỡ hàng cho cả 2 kệ ghép đôi (Mặt Trước và Mặt Sau)
      for (let r = 0; r < numTiers; r++) {
        const tierY = 0.35 + r * tierStep;

        // Mâm đỡ Kệ Mặt Trước
        const shelfFront = new THREE.Mesh(
          new THREE.BoxGeometry(singleDepth, 0.06, keWidth),
          beamMat
        );
        shelfFront.position.set(-singleDepth / 2 - gapBetweenRacks / 2, tierY, 0);
        shelfFront.receiveShadow = true;
        rackGroup.add(shelfFront);

        // Mâm đỡ Kệ Mặt Sau
        const shelfBack = new THREE.Mesh(
          new THREE.BoxGeometry(singleDepth, 0.06, keWidth),
          beamMat
        );
        shelfBack.position.set(singleDepth / 2 + gapBetweenRacks / 2, tierY, 0);
        shelfBack.receiveShadow = true;
        rackGroup.add(shelfBack);

        // Thanh chặn an toàn giữa 2 lưng kệ
        const centerBarrier = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.22, keWidth),
          joinerMat
        );
        centerBarrier.position.set(0, tierY + 0.11, 0);
        rackGroup.add(centerBarrier);

        // ----------------------------------------------------
        // TẠO CÁC Ô LƯU TRỮ (40 Ô MẶT TRƯỚC + 40 Ô MẶT SAU = 80 Ô)
        // ----------------------------------------------------
        for (let c = 1; c <= colsCount; c++) {
          const colStr = c < 10 ? `0${c}` : `${c}`;
          const cellCenterZ = -keWidth / 2 + (c - 0.5) * colStep;
          const cellCenterY = tierY + tierStep / 2;

          // 1. Ô KỆ MẶT TRƯỚC (Ô 01 đến 40: Tầng 1: 1-10, Tầng 2: 11-20, Tầng 3: 21-30, Tầng 4: 31-40)
          const cellNumFront = r * 10 + c;
          const numStrFront = cellNumFront < 10 ? `0${cellNumFront}` : `${cellNumFront}`;
          const cellIdFront = `KE-${rackLetter}-${numStrFront}`;
          const cellNameFront = `Kệ ${rackLetter} (Mặt Trước - Tầng ${r + 1}) - Ô ${numStrFront}`;
          const posXFront = -singleDepth / 2 - gapBetweenRacks / 2;

          const fabricsHereFront = fabrics.filter(
            (f) => f.viTriId === cellIdFront || f.viTriId === `KE-${k}-${numStrFront}` || f.viTriId === `KE-${rackLetter}-${cellNumFront}`
          );
          const hasFabricFront = fabricsHereFront.length > 0;
          const isSelectedFront =
            selectedLocationId === cellIdFront ||
            selectedLocationId === `KE-${k}-${numStrFront}` ||
            selectedLocationId === `KE-${rackLetter}-${cellNumFront}`;

          const cellMatFront = new THREE.MeshStandardMaterial({
            color: isSelectedFront ? 0x2563eb : hasFabricFront ? 0xf59e0b : 0x94a3b8,
            transparent: true,
            opacity: isSelectedFront ? 0.65 : hasFabricFront ? 0.25 : 0.07,
            roughness: 0.3
          });
          const cellMeshFront = new THREE.Mesh(
            new THREE.BoxGeometry(singleDepth * 0.92, tierStep * 0.9, colStep * 0.9),
            cellMatFront
          );
          cellMeshFront.position.set(posXFront, cellCenterY, cellCenterZ);
          cellMeshFront.userData = {
            locationId: cellIdFront,
            locationName: cellNameFront,
            locationType: 'ke',
            isWarehouseEntity: true
          };
          rackGroup.add(cellMeshFront);
          interactiveObjectsRef.current.push(cellMeshFront);

          if (hasFabricFront) {
            const primaryFab = fabricsHereFront[0];
            const hexColor = primaryFab.mauHex || '#3b82f6';
            const rollCount = Math.min(primaryFab.soCuon, 4);
            const rollMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(hexColor),
              roughness: 0.5,
              metalness: 0.1
            });
            for (let i = 0; i < rollCount; i++) {
              const rollGroup = new THREE.Group();
              const rollBody = new THREE.Mesh(rollGeo, rollMat);
              rollBody.castShadow = true;
              const tubeMesh = new THREE.Mesh(rollTubeGeo, tubeMat);
              rollGroup.add(rollBody);
              rollGroup.add(tubeMesh);
              const xOff = (i % 2 === 0 ? -0.2 : 0.2) * (singleDepth * 0.35);
              const yOff = tierY + 0.24 + Math.floor(i / 2) * 0.32;
              rollGroup.position.set(posXFront + xOff, yOff, cellCenterZ);
              rackGroup.add(rollGroup);
            }
          }

          // 2. Ô KỆ MẶT SAU (Ô 41 đến 80: Tầng 1: 41-50, Tầng 2: 51-60, Tầng 3: 61-70, Tầng 4: 71-80)
          const cellNumBack = 40 + r * 10 + c;
          const numStrBack = `${cellNumBack}`;
          const cellIdBack = `KE-${rackLetter}-${numStrBack}`;
          const cellNameBack = `Kệ ${rackLetter} (Mặt Sau - Tầng ${r + 1}) - Ô ${numStrBack}`;
          const posXBack = singleDepth / 2 + gapBetweenRacks / 2;

          const fabricsHereBack = fabrics.filter(
            (f) => f.viTriId === cellIdBack || f.viTriId === `KE-${k}-${numStrBack}` || f.viTriId === `KE-${rackLetter}-${cellNumBack}`
          );
          const hasFabricBack = fabricsHereBack.length > 0;
          const isSelectedBack =
            selectedLocationId === cellIdBack ||
            selectedLocationId === `KE-${k}-${numStrBack}` ||
            selectedLocationId === `KE-${rackLetter}-${cellNumBack}`;

          const cellMatBack = new THREE.MeshStandardMaterial({
            color: isSelectedBack ? 0x2563eb : hasFabricBack ? 0xf59e0b : 0x94a3b8,
            transparent: true,
            opacity: isSelectedBack ? 0.65 : hasFabricBack ? 0.25 : 0.07,
            roughness: 0.3
          });
          const cellMeshBack = new THREE.Mesh(
            new THREE.BoxGeometry(singleDepth * 0.92, tierStep * 0.9, colStep * 0.9),
            cellMatBack
          );
          cellMeshBack.position.set(posXBack, cellCenterY, cellCenterZ);
          cellMeshBack.userData = {
            locationId: cellIdBack,
            locationName: cellNameBack,
            locationType: 'ke',
            isWarehouseEntity: true
          };
          rackGroup.add(cellMeshBack);
          interactiveObjectsRef.current.push(cellMeshBack);

          if (hasFabricBack) {
            const primaryFab = fabricsHereBack[0];
            const hexColor = primaryFab.mauHex || '#10b981';
            const rollCount = Math.min(primaryFab.soCuon, 4);
            const rollMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(hexColor),
              roughness: 0.5,
              metalness: 0.1
            });
            for (let i = 0; i < rollCount; i++) {
              const rollGroup = new THREE.Group();
              const rollBody = new THREE.Mesh(rollGeo, rollMat);
              rollBody.castShadow = true;
              const tubeMesh = new THREE.Mesh(rollTubeGeo, tubeMat);
              rollGroup.add(rollBody);
              rollGroup.add(tubeMesh);
              const xOff = (i % 2 === 0 ? -0.2 : 0.2) * (singleDepth * 0.35);
              const yOff = tierY + 0.24 + Math.floor(i / 2) * 0.32;
              rollGroup.position.set(posXBack + xOff, yOff, cellCenterZ);
              rackGroup.add(rollGroup);
            }
          }
        }
      }

      // Biển hiệu đầu dãy kệ 3D (Đánh dấu rõ DÃY A, B, C, D, E, F, G - 80 Ô)
      const createSignCanvas = (mainText: string, sub: string, accentColor: string) => {
        const cv = document.createElement('canvas');
        cv.width = 512;
        cv.height = 160;
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 512, 160);
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 10;
          ctx.strokeRect(6, 6, 500, 148);

          ctx.fillStyle = accentColor;
          ctx.font = 'bold 56px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(mainText, 256, 56);

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 25px Arial, sans-serif';
          ctx.fillText(sub, 256, 115);
        }
        const tex = new THREE.CanvasTexture(cv);
        return tex;
      };

      const signTexHead = createSignCanvas(`DÃY ${rackLetter}`, '4 TẦNG GHÉP ĐÔI (80 Ô)', '#f59e0b');
      const signTexFront = createSignCanvas(`DÃY ${rackLetter}`, 'MẶT TRƯỚC (Ô 01-40)', '#38bdf8');
      const signTexBack = createSignCanvas(`DÃY ${rackLetter}`, 'MẶT SAU (Ô 41-80)', '#c084fc');

      const signBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const signMesh = new THREE.Mesh(new THREE.BoxGeometry(doubleDepth + 0.1, 0.5, 1.8), signBaseMat);
      signMesh.position.set(0, keHeight + 0.3, -keWidth / 2 + 0.9);
      rackGroup.add(signMesh);

      // Biển hiệu chính ở đầu hồi (quay ra lối đi Z-)
      const headSignMat = new THREE.MeshBasicMaterial({ map: signTexHead });
      const headSign = new THREE.Mesh(new THREE.PlaneGeometry(doubleDepth, 0.45), headSignMat);
      headSign.rotation.y = Math.PI;
      headSign.position.set(0, keHeight + 0.3, -keWidth / 2 - 0.01);
      rackGroup.add(headSign);

      // Biển chỉ dẫn Mặt Trước (-X)
      const labelFrontMat = new THREE.MeshBasicMaterial({ map: signTexFront });
      const labelFront = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), labelFrontMat);
      labelFront.rotation.y = -Math.PI / 2;
      labelFront.position.set(-doubleDepth / 2 - 0.06, keHeight + 0.3, -keWidth / 2 + 0.9);
      rackGroup.add(labelFront);

      // Biển chỉ dẫn Mặt Sau (+X)
      const labelBackMat = new THREE.MeshBasicMaterial({ map: signTexBack });
      const labelBack = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), labelBackMat);
      labelBack.rotation.y = Math.PI / 2;
      labelBack.position.set(doubleDepth / 2 + 0.06, keHeight + 0.3, -keWidth / 2 + 0.9);
      rackGroup.add(labelBack);

      scene.add(rackGroup);
    }

    // ==========================================
    // 2. PALLETS (KHU VỰC PALLET - 60 VỊ TRÍ)
    // ==========================================
    const soPallet = config.soPallet || 60;
    const palletCols = 6;
    const palletStartX = 14.2;
    const palletStartZ = -12.5;
    const palletSpacingX = 2.4;
    const palletSpacingZ = 2.8;

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.85
    });

    for (let p = 1; p <= soPallet; p++) {
      const pIdx = p - 1;
      const col = pIdx % palletCols;
      const row = Math.floor(pIdx / palletCols);

      const palletId = `PALLET-${p < 10 ? '0' + p : p}`;
      const palletName = `Pallet ${p < 10 ? '0' + p : p}`;
      const posX = palletStartX + col * palletSpacingX;
      const posZ = palletStartZ + row * palletSpacingZ;

      const palletGroup = new THREE.Group();
      palletGroup.position.set(posX, 0, posZ);
      palletGroup.userData = { isWarehouseEntity: true };

      // Wooden pallet base geometry
      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 2.0), woodMat);
      baseMesh.position.y = 0.09;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      palletGroup.add(baseMesh);

      const fabricsHere = fabrics.filter((f) => f.viTriId === palletId);
      const hasFabric = fabricsHere.length > 0;
      const isSelected = selectedLocationId === palletId;

      // Hitbox for raycasting
      const palletHitMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x2563eb : hasFabric ? 0x3b82f6 : 0x94a3b8,
        transparent: true,
        opacity: isSelected ? 0.6 : hasFabric ? 0.2 : 0.05,
        roughness: 0.3
      });
      const palletHitbox = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 2.1), palletHitMat);
      palletHitbox.position.y = 1.1;
      palletHitbox.userData = {
        locationId: palletId,
        locationName: palletName,
        locationType: 'pallet',
        isWarehouseEntity: true
      };
      palletGroup.add(palletHitbox);
      interactiveObjectsRef.current.push(palletHitbox);

      // Fabric rolls stacked on pallet
      if (hasFabric) {
        const fab = fabricsHere[0];
        const hex = fab.mauHex || '#3b82f6';
        const rollMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(hex),
          roughness: 0.5
        });

        const numStack = Math.min(fab.soCuon, 6);
        for (let s = 0; s < numStack; s++) {
          const roll = new THREE.Mesh(rollGeo, rollMat);
          roll.castShadow = true;
          const tier = Math.floor(s / 2);
          const side = s % 2 === 0 ? -0.45 : 0.45;
          roll.position.set(side, 0.35 + tier * 0.45, 0);
          palletGroup.add(roll);
        }
      }

      scene.add(palletGroup);
    }

    // ==========================================
    // 3. CARTS (XE ĐẨY VẢI - 20 XE ĐẨY)
    // ==========================================
    const soXe = config.soXe || 20;
    const cartCols = 2;
    const cartStartX = -29.5;
    const cartStartZ = -12.6;
    const cartSpacingX = 3.2;
    const cartSpacingZ = 2.8;

    const metalCartMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed, // Purple mobile cart
      metalness: 0.7,
      roughness: 0.3
    });

    for (let x = 1; x <= soXe; x++) {
      const cartGroup = new THREE.Group();
      const col = (x - 1) % cartCols;
      const row = Math.floor((x - 1) / cartCols);
      const posX = cartStartX + col * cartSpacingX;
      const posZ = cartStartZ + row * cartSpacingZ;
      cartGroup.position.set(posX, 0, posZ);
      cartGroup.userData = { isWarehouseEntity: true };

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const wheelPositions = [
        [-0.8, 0.2, -1.2],
        [0.8, 0.2, -1.2],
        [-0.8, 0.2, 1.2],
        [0.8, 0.2, 1.2]
      ];
      wheelPositions.forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(wx, wy, wz);
        cartGroup.add(w);
      });

      // Cart frame uprights
      const cartHeight = 4.2;
      const uprightGeo = new THREE.BoxGeometry(0.08, cartHeight, 0.08);
      const uprightPos = [
        [-0.8, cartHeight / 2 + 0.2, -1.2],
        [0.8, cartHeight / 2 + 0.2, -1.2],
        [-0.8, cartHeight / 2 + 0.2, 1.2],
        [0.8, cartHeight / 2 + 0.2, 1.2]
      ];
      uprightPos.forEach(([ux, uy, uz]) => {
        const u = new THREE.Mesh(uprightGeo, metalCartMat);
        cartGroup.add(u);
      });

      // 6 Tiers of cart
      const tangPerXe = config.tangPerXe || 6;
      const tierDist = (cartHeight - 0.4) / tangPerXe;

      for (let t = 1; t <= tangPerXe; t++) {
        const tierY = 0.4 + (t - 1) * tierDist;
        const tierMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.05, 2.4),
          metalCartMat
        );
        tierMesh.position.set(0, tierY, 0);
        cartGroup.add(tierMesh);

        const cartLocId = `XE-${x}-T${t}`;
        const cartLocName = `Xe ${x} - Tầng ${t}`;
        const fabricsHere = fabrics.filter((f) => f.viTriId === cartLocId);
        const hasFabric = fabricsHere.length > 0;
        const isSelected = selectedLocationId === cartLocId;

        // Interactive tier box
        const tierHitMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0x2563eb : hasFabric ? 0x7c3aed : 0x94a3b8,
          transparent: true,
          opacity: isSelected ? 0.6 : hasFabric ? 0.25 : 0.08,
          roughness: 0.3
        });
        const tierHitbox = new THREE.Mesh(
          new THREE.BoxGeometry(1.55, tierDist * 0.9, 2.3),
          tierHitMat
        );
        tierHitbox.position.set(0, tierY + tierDist / 2, 0);
        tierHitbox.userData = {
          locationId: cartLocId,
          locationName: cartLocName,
          locationType: 'xe',
          isWarehouseEntity: true
        };
        cartGroup.add(tierHitbox);
        interactiveObjectsRef.current.push(tierHitbox);

        if (hasFabric) {
          const fab = fabricsHere[0];
          const hex = fab.mauHex || '#8b5cf6';
          const rollMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(hex),
            roughness: 0.5
          });

          const roll = new THREE.Mesh(rollGeo, rollMat);
          roll.castShadow = true;
          roll.position.set(0, tierY + 0.22, 0);
          cartGroup.add(roll);
        }
      }

      scene.add(cartGroup);
    }
  }, [config, fabrics, selectedLocationId]);

  // Handle focusing camera on specific location
  useEffect(() => {
    if (!selectedLocationId || !cameraRef.current || !controlsRef.current) return;

    // Find object by locationId in interactiveObjectsRef
    const targetObj = interactiveObjectsRef.current.find((obj) => {
      if (obj.userData?.locationId === selectedLocationId) return true;
      const locId = obj.userData?.locationId || '';
      const match1 = selectedLocationId.match(/^KE-([A-G]|\d+)-(\d+)$/);
      const match2 = locId.match(/^KE-([A-G]|\d+)-(\d+)$/);
      if (match1 && match2 && match1[2] === match2[2]) {
        const r1 = isNaN(Number(match1[1])) ? match1[1].charCodeAt(0) - 64 : Number(match1[1]);
        const r2 = isNaN(Number(match2[1])) ? match2[1].charCodeAt(0) - 64 : Number(match2[1]);
        return r1 === r2;
      }
      return false;
    });

    if (targetObj) {
      const worldPos = new THREE.Vector3();
      targetObj.getWorldPosition(worldPos);

      targetLookAt.current = worldPos.clone();
      const isBackSide = targetObj.userData?.locationName?.includes('Mặt Sau');
      const camOffsetX = isBackSide ? 4.8 : -4.8;
      targetCamPos.current = new THREE.Vector3(
        worldPos.x + camOffsetX,
        worldPos.y + 2.8,
        worldPos.z + 4.2
      );

      const resolvedId = targetObj.userData?.locationId || selectedLocationId;
      const items = fabrics.filter(
        (f) => f.viTriId === selectedLocationId || f.viTriId === resolvedId
      );
      setActiveInspect({
        id: resolvedId,
        name: targetObj.userData?.locationName || selectedLocationId,
        type: targetObj.userData?.locationType || 'ke',
        fabrics: items
      });
    }
  }, [selectedLocationId, fabrics]);

  // Viewpoint presets
  const setCameraView = (view: 'all' | 'racks' | 'pallets' | 'carts' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;

    switch (view) {
      case 'all':
        targetCamPos.current = new THREE.Vector3(24, 20, 30);
        targetLookAt.current = new THREE.Vector3(0, 2, 0);
        break;
      case 'racks':
        targetCamPos.current = new THREE.Vector3(-5, 14, 22);
        targetLookAt.current = new THREE.Vector3(-5, 3, -2);
        break;
      case 'pallets':
        targetCamPos.current = new THREE.Vector3(9, 10, 10);
        targetLookAt.current = new THREE.Vector3(9, 1.2, -6);
        break;
      case 'carts':
        targetCamPos.current = new THREE.Vector3(20, 8, 11);
        targetLookAt.current = new THREE.Vector3(20, 2.5, -4);
        break;
      case 'top':
        targetCamPos.current = new THREE.Vector3(0, 38, 0.1);
        targetLookAt.current = new THREE.Vector3(0, 0, 0);
        break;
    }
  };

  const { language, t } = useLanguage();

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D Canvas container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Camera Toolbar */}
      <div className="absolute top-3 right-3 left-3 sm:left-auto flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200/90 z-20 text-xs overflow-x-auto scrollbar-none">
        <span className="text-slate-500 font-semibold px-1 hidden sm:flex items-center gap-1 shrink-0">
          <Eye className="w-3.5 h-3.5 text-blue-600" /> {language === 'ko' ? '시점:' : 'Góc nhìn:'}
        </span>
        <button
          onClick={() => setCameraView('all')}
          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-semibold transition active:scale-95 whitespace-nowrap min-h-[36px] flex items-center cursor-pointer"
          title={language === 'ko' ? '전체 창고 보기' : 'Xem toàn bộ kho'}
        >
          {language === 'ko' ? '전체 조망' : 'Toàn cảnh'}
        </button>
        <button
          onClick={() => setCameraView('racks')}
          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold transition active:scale-95 whitespace-nowrap min-h-[36px] flex items-center cursor-pointer"
          title={language === 'ko' ? '원단 선반 랙 구역 보기' : 'Xem các dãy kệ chứa vải'}
        >
          {language === 'ko' ? '선반 구역' : 'Khu Kệ'}
        </button>
        <button
          onClick={() => setCameraView('pallets')}
          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 font-semibold transition active:scale-95 whitespace-nowrap min-h-[36px] flex items-center cursor-pointer"
          title={language === 'ko' ? '바닥 파렛트 구역 보기' : 'Xem khu vực các pallet vải'}
        >
          {language === 'ko' ? '파렛트 구역' : 'Khu Pallet'}
        </button>
        <button
          onClick={() => setCameraView('carts')}
          className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-900 hover:bg-purple-100 font-semibold transition active:scale-95 whitespace-nowrap min-h-[36px] flex items-center cursor-pointer"
          title={language === 'ko' ? '이동 대차 구역 보기' : 'Xem khu vực xe đẩy trung chuyển'}
        >
          {language === 'ko' ? '대차 구역' : 'Khu Xe Đẩy'}
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold transition active:scale-95 whitespace-nowrap min-h-[36px] flex items-center cursor-pointer"
          title={language === 'ko' ? '위에서 내려다보는 평면도' : 'Mặt bằng từ trên cao'}
        >
          {language === 'ko' ? '평면도' : 'Mặt bằng'}
        </button>
      </div>

      {/* Interaction Guide Badge */}
      <div className="absolute top-16 left-3 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 bg-slate-900/85 text-slate-100 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs border border-slate-700/60 shadow-lg">
        <MousePointer className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        {language === 'ko' ? (
          <span>마우스 1회 클릭: <b className="text-emerald-400">선택</b> • 2회 클릭: <b className="text-amber-400">선택 해제</b></span>
        ) : (
          <span>Nhấp chuột 1 lần: <b className="text-emerald-400">Chọn</b> • 2 lần: <b className="text-amber-400">Bỏ chọn</b></span>
        )}
      </div>

      {/* 3D Legend Bar (Collapsible on mobile) */}
      <div className="absolute bottom-16 sm:bottom-3 left-3 z-20">
        {!showLegend ? (
          <button
            onClick={() => setShowLegend(true)}
            className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'ko' ? '범례 및 조작 안내' : 'Chú thích & Hướng dẫn'}</span>
          </button>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-slate-200/90 text-xs text-slate-600 max-w-xs space-y-1.5 animate-in fade-in duration-150">
            <div className="font-bold text-slate-800 flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />{' '}
                {language === 'ko' ? '3D 창고 모델 범례' : 'Chú thích mô hình 3D'}
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-700 text-sm px-1.5 py-0.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500 border border-amber-600 inline-block shadow-xs" />
              <span>
                {language === 'ko'
                  ? '4단 복식 선반 랙 (선반당 80칸: 등맞댐 결합)'
                  : 'Kệ đôi 4 tầng (80 ô/kệ: ghép 2 kệ lưng vào nhau)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-500 border border-blue-600 inline-block shadow-xs" />
              <span>
                {language === 'ko'
                  ? `바닥 적재 파렛트 (${config.soPallet}개 위치)`
                  : `Pallet đặt sàn (${config.soPallet} vị trí)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-500 border border-purple-600 inline-block shadow-xs" />
              <span>
                {language === 'ko'
                  ? `원단 이동 대차 (${config.soXe}대 • 6단)`
                  : `Xe đẩy (${config.soXe} xe • 6 tầng/xe)`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 space-y-1">
              <div>
                {language === 'ko'
                  ? '💡 한 손가락: 3D 회전 • 두 손가락: 확대/축소 및 이동'
                  : '💡 1 ngón tay: xoay • 2 ngón tay: thu phóng / trượt'}
              </div>
              <div className="text-blue-600 font-semibold flex items-center gap-1">
                <MousePointer className="w-3 h-3 text-blue-600 shrink-0" />
                <span>
                  {language === 'ko'
                    ? '클릭 1회: 위치 선택 • 더블 클릭: 선택 해제'
                    : 'Nhấp chuột 1 lần: Chọn • Nhấp 2 lần: Bỏ chọn'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hover Tooltip HUD (Desktop only) */}
      {hoveredInfo && !activeInspect && (
        <div
          className="fixed pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/90 text-white backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl border border-slate-700/60 text-xs max-w-xs transition-opacity duration-150 hidden sm:block"
          style={{
            left: hoveredInfo.screenX,
            top: hoveredInfo.screenY - 12
          }}
        >
          <div className="font-bold text-sm flex items-center gap-1.5 text-blue-300">
            {hoveredInfo.type === 'ke' && <Box className="w-3.5 h-3.5 text-amber-400" />}
            {hoveredInfo.type === 'pallet' && <Layers className="w-3.5 h-3.5 text-blue-400" />}
            {hoveredInfo.type === 'xe' && <Truck className="w-3.5 h-3.5 text-purple-400" />}
            {hoveredInfo.name}
          </div>
          {hoveredInfo.fabrics.length > 0 ? (
            <div className="mt-1 space-y-1">
              {hoveredInfo.fabrics.map((fab) => (
                <div key={fab.id} className="border-t border-slate-700/60 pt-1 text-[11px]">
                  <div className="font-semibold text-amber-300">{fab.tenVai}</div>
                  <div className="text-slate-300 flex items-center justify-between gap-2">
                    <span>{language === 'ko' ? 'Lot' : 'Mã'}: {fab.loVai}</span>
                    <span className="font-bold text-emerald-400">
                      {fab.soCuon} {t('wh_roll_unit')} • {fab.trongLuongKg} {t('wh_weight_unit')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span
                      className="w-2 h-2 rounded-full border border-white/40"
                      style={{ backgroundColor: fab.mauHex || '#3b82f6' }}
                    />
                    <span>{language === 'ko' ? '색상' : 'Màu'}: {fab.mauSac}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-emerald-400 mt-1 flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {t('wh_empty_location')}
            </div>
          )}
        </div>
      )}

      {/* Selected Location Details Card (Floating Inspector on desktop, Bottom Sheet on mobile) */}
      {activeInspect && (
        <div className="fixed sm:absolute bottom-16 sm:bottom-auto sm:top-16 left-0 right-0 sm:left-auto sm:right-4 w-full sm:w-80 max-h-[70vh] bg-white rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl border-t sm:border border-slate-200 z-40 overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-top-2 duration-200">
          {/* Mobile drag bar */}
          <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-2 sm:hidden" />

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                  activeInspect.type === 'ke'
                    ? 'bg-amber-500'
                    : activeInspect.type === 'pallet'
                    ? 'bg-blue-500'
                    : 'bg-purple-600'
                }`}
              >
                {activeInspect.type === 'ke' && <Box className="w-5 h-5" />}
                {activeInspect.type === 'pallet' && <Layers className="w-5 h-5" />}
                {activeInspect.type === 'xe' && <Truck className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800">{activeInspect.name}</h4>
                <p className="text-[11px] text-slate-500">{language === 'ko' ? '코드' : 'Mã'}: {activeInspect.id}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveInspect(null);
                if (onSelectLocation) onSelectLocation(null);
              }}
              title={language === 'ko' ? '닫기 및 선택 해제 (또는 위치를 더블클릭)' : 'Đóng và bỏ chọn vị trí (Hoặc nhấp 2 lần vào vị trí)'}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-base transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500 font-medium">{language === 'ko' ? '보관 상태:' : 'Trạng thái:'}</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold ${
                  activeInspect.fabrics.length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {activeInspect.fabrics.length > 0
                  ? (language === 'ko'
                      ? `원단 ${activeInspect.fabrics.length}건 보관 중`
                      : `Đang chứa ${activeInspect.fabrics.length} lô vải`)
                  : (language === 'ko' ? '빈 보관 위치' : 'Vị trí trống')}
              </span>
            </div>

            {activeInspect.fabrics.length > 0 ? (
              <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                {activeInspect.fabrics.map((fab) => (
                  <div
                    key={fab.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                  >
                    <div className="font-bold text-slate-800">{fab.tenVai}</div>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-slate-600">
                      <div>
                        {language === 'ko' ? 'Lot' : 'Lô'}: <span className="font-semibold text-slate-800">{fab.loVai}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {language === 'ko' ? '색상' : 'Màu'}:
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                          style={{ backgroundColor: fab.mauHex || '#3b82f6' }}
                        />
                        <span className="font-semibold text-slate-800">{fab.mauSac}</span>
                      </div>
                      <div>
                        {language === 'ko' ? '롤 수' : 'Số cuộn'}: <span className="font-bold text-blue-600">{fab.soCuon}</span>
                      </div>
                      <div>
                        {language === 'ko' ? '중량' : 'Khối lượng'}: <span className="font-bold text-slate-800">{fab.trongLuongKg} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400 text-xs">
                <Box className="w-8 h-8 mx-auto mb-1 text-slate-300 stroke-1" />
                {t('wh_empty_location')}
              </div>
            )}

            {onOpenOperations && (
              <button
                type="button"
                onClick={() => onOpenOperations(activeInspect.id)}
                className="w-full mt-3 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                {t('wh_open_with_loc')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
