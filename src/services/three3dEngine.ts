import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import type { Coordinates } from '../types';

export interface ThreeDObjectDef {
  id: string;
  coordinates: Coordinates;
  altitude?: number;
  scale?: number;
  mesh?: THREE.Object3D;
  animate?: (mesh: THREE.Object3D, delta: number) => void;
}

export class ThreeMapboxEngine {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer | null = null;
  private map: mapboxgl.Map | null = null;
  private objects: Map<string, { root: THREE.Group; animate?: (m: THREE.Object3D, delta: number) => void }> = new Map();
  private dirLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private lastTime = 0;
  private projectionMatrix = new THREE.Matrix4();
  private isPaused = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
  }

  public getLayer(): mapboxgl.CustomLayerInterface {
    return {
      id: 'custom-three-3d-engine',
      type: 'custom',
      renderingMode: '3d',
      onAdd: (map: mapboxgl.Map, gl: WebGLRenderingContext) => {
        this.map = map;
        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: false,
        });
        this.renderer.autoClear = false;

        this.setupLighting();

        const handleVisibility = () => {
          this.isPaused = document.hidden;
        };
        document.addEventListener('visibilitychange', handleVisibility);
        (this as { _visibilityHandler?: () => void })._visibilityHandler = handleVisibility;
      },
      render: (_gl: WebGLRenderingContext, matrix: number[]) => {
        if (!this.renderer || !this.map || this.isPaused) return;

        const mapMoving = this.map.isMoving();
        const now = performance.now();
        const delta = this.lastTime ? (now - this.lastTime) / 1000 : 0.016;
        this.lastTime = now;

        // Skip animation updates while panning — still render last pose for zero pop-in
        if (!mapMoving) {
          this.objects.forEach(({ root, animate }) => {
            if (animate) animate(root, delta);
          });
        }

        this.projectionMatrix.fromArray(matrix);
        this.camera.projectionMatrix = this.projectionMatrix;

        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
      },
    };
  }

  private setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(this.ambientLight);

    // Hemisphere light for ground reflection
    const hemiLight = new THREE.HemisphereLight(0xf0fdf4, 0x1e293b, 1.0);
    this.scene.add(hemiLight);

    // Directional sunlight with warm tone
    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    this.dirLight.position.set(200, 350, 400);
    this.scene.add(this.dirLight);
  }

  /**
   * Set lighting preset (e.g. Day, Sunset, Night)
   */
  public setLightingPreset(preset: 'day' | 'sunset' | 'night') {
    if (!this.dirLight || !this.ambientLight) return;

    if (preset === 'day') {
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 2.5;
      this.ambientLight.intensity = 1.2;
    } else if (preset === 'sunset') {
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 3.2;
      this.dirLight.position.set(400, 100, 200);
      this.ambientLight.intensity = 0.8;
    } else if (preset === 'night') {
      this.dirLight.color.setHex(0x60a5fa);
      this.dirLight.intensity = 0.9;
      this.ambientLight.intensity = 0.4;
    }
  }

  /**
   * Adds an object or procedural 3D mesh at specific geo coordinates
   */
  public addObject(def: ThreeDObjectDef) {
    const mercator = mapboxgl.MercatorCoordinate.fromLngLat(
      [def.coordinates.lng, def.coordinates.lat],
      def.altitude || 0
    );

    const scale = mercator.meterInMercatorCoordinateUnits() * (def.scale || 1);

    const root = new THREE.Group();
    root.position.set(mercator.x, mercator.y, mercator.z);
    root.scale.set(scale, -scale, scale);

    if (def.mesh) {
      root.add(def.mesh);
    }

    this.scene.add(root);
    this.objects.set(def.id, { root, animate: def.animate });
  }

  /**
   * Spawns a floating, rotating glowing 3D crystal beacon
   */
  /**
   * Spawns a 3D Suzanne-style test monkey sitting on Minsk Railway Station with legs dangling over the edge
   */
  public spawnStationMonkey(id: string, coords: Coordinates, altitude = 24.5) {
    const monkeyGroup = new THREE.Group();

    // 1. Materials
    const furMat = new THREE.MeshStandardMaterial({
      color: 0x8a5229,
      roughness: 0.72,
      metalness: 0.08,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffd1a4,
      roughness: 0.65,
      metalness: 0.05,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1,
    });
    const eyePupilMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const darkFeatureMat = new THREE.MeshStandardMaterial({
      color: 0x3e2312,
      roughness: 0.8,
    });

    // 2. Torso (Sitting upright)
    const bodyGeom = new THREE.SphereGeometry(2.3, 16, 14);
    const bodyMesh = new THREE.Mesh(bodyGeom, furMat);
    bodyMesh.scale.set(1.0, 0.88, 1.25);
    bodyMesh.position.set(0, 0, 3.8);
    monkeyGroup.add(bodyMesh);

    // Warm peach belly patch
    const bellyGeom = new THREE.SphereGeometry(1.6, 14, 12);
    const bellyMesh = new THREE.Mesh(bellyGeom, skinMat);
    bellyMesh.scale.set(0.85, 0.5, 1.15);
    bellyMesh.position.set(0, 0.9, 3.6);
    monkeyGroup.add(bellyMesh);

    // 3. Head & Suzanne Features
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.2, 6.8);

    // Cranium
    const skullGeom = new THREE.SphereGeometry(1.9, 18, 16);
    const skullMesh = new THREE.Mesh(skullGeom, furMat);
    skullMesh.scale.set(1.18, 1.0, 1.05);
    headGroup.add(skullMesh);

    // Brow ridge (Suzanne signature)
    const browGeom = new THREE.CylinderGeometry(0.42, 0.42, 2.5, 12);
    const browMesh = new THREE.Mesh(browGeom, furMat);
    browMesh.rotation.z = Math.PI / 2;
    browMesh.position.set(0, 1.25, 0.65);
    headGroup.add(browMesh);

    // Face plate
    const facePlateGeom = new THREE.SphereGeometry(1.35, 16, 14);
    const facePlate = new THREE.Mesh(facePlateGeom, skinMat);
    facePlate.scale.set(1.05, 0.45, 0.95);
    facePlate.position.set(0, 1.0, 0.05);
    headGroup.add(facePlate);

    // Snout / Muzzle
    const muzzleGeom = new THREE.SphereGeometry(1.15, 16, 12);
    const muzzle = new THREE.Mesh(muzzleGeom, skinMat);
    muzzle.scale.set(1.12, 0.92, 0.72);
    muzzle.position.set(0, 1.45, -0.55);
    headGroup.add(muzzle);

    // Nostrils
    const nostrilGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const leftNostril = new THREE.Mesh(nostrilGeom, darkFeatureMat);
    leftNostril.position.set(0.24, 2.15, -0.55);
    const rightNostril = new THREE.Mesh(nostrilGeom, darkFeatureMat);
    rightNostril.position.set(-0.24, 2.15, -0.55);
    headGroup.add(leftNostril);
    headGroup.add(rightNostril);

    // Smile
    const smileGeom = new THREE.TorusGeometry(0.55, 0.08, 6, 12, Math.PI);
    const smile = new THREE.Mesh(smileGeom, darkFeatureMat);
    smile.rotation.x = Math.PI / 2 + 0.3;
    smile.rotation.z = Math.PI;
    smile.position.set(0, 1.95, -0.85);
    headGroup.add(smile);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.38, 12, 12);
    const pupilGeom = new THREE.SphereGeometry(0.2, 10, 10);

    const leftEye = new THREE.Mesh(eyeGeom, eyeWhiteMat);
    leftEye.position.set(0.65, 1.32, 0.45);
    const leftPupil = new THREE.Mesh(pupilGeom, eyePupilMat);
    leftPupil.position.set(0.65, 1.62, 0.45);
    headGroup.add(leftEye);
    headGroup.add(leftPupil);

    const rightEye = new THREE.Mesh(eyeGeom, eyeWhiteMat);
    rightEye.position.set(-0.65, 1.32, 0.45);
    const rightPupil = new THREE.Mesh(pupilGeom, eyePupilMat);
    rightPupil.position.set(-0.65, 1.62, 0.45);
    headGroup.add(rightEye);
    headGroup.add(rightPupil);

    // Big Monkey Ears
    const earOuterGeom = new THREE.TorusGeometry(0.85, 0.28, 8, 16);
    const earInnerGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 14);

    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(2.1, -0.1, 0.2);
    leftEarGroup.rotation.y = 0.35;
    leftEarGroup.rotation.x = 0.2;
    const leftEarOuter = new THREE.Mesh(earOuterGeom, furMat);
    const leftEarInner = new THREE.Mesh(earInnerGeom, skinMat);
    leftEarInner.rotation.x = Math.PI / 2;
    leftEarGroup.add(leftEarOuter);
    leftEarGroup.add(leftEarInner);
    headGroup.add(leftEarGroup);

    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(-2.1, -0.1, 0.2);
    rightEarGroup.rotation.y = -0.35;
    rightEarGroup.rotation.x = 0.2;
    const rightEarOuter = new THREE.Mesh(earOuterGeom, furMat);
    const rightEarInner = new THREE.Mesh(earInnerGeom, skinMat);
    rightEarInner.rotation.x = Math.PI / 2;
    rightEarGroup.add(rightEarOuter);
    rightEarGroup.add(rightEarInner);
    headGroup.add(rightEarGroup);

    monkeyGroup.add(headGroup);

    // 4. Arms & Hands resting on the ledge
    const armGeom = new THREE.CylinderGeometry(0.48, 0.4, 3.2, 10);
    const handGeom = new THREE.SphereGeometry(0.55, 10, 10);

    // Left arm
    const leftArm = new THREE.Mesh(armGeom, furMat);
    leftArm.position.set(1.9, 0.8, 4.2);
    leftArm.rotation.x = 0.6;
    leftArm.rotation.z = -0.35;
    const leftHand = new THREE.Mesh(handGeom, skinMat);
    leftHand.position.set(1.5, 2.3, 2.3);
    monkeyGroup.add(leftArm);
    monkeyGroup.add(leftHand);

    // Right arm
    const rightArm = new THREE.Mesh(armGeom, furMat);
    rightArm.position.set(-1.9, 0.8, 4.2);
    rightArm.rotation.x = 0.6;
    rightArm.rotation.z = 0.35;
    const rightHand = new THREE.Mesh(handGeom, skinMat);
    rightHand.position.set(-1.5, 2.3, 2.3);
    monkeyGroup.add(rightArm);
    monkeyGroup.add(rightHand);

    // 5. Dangling Legs over the edge ("свесив ноги")
    const thighGeom = new THREE.CylinderGeometry(0.68, 0.58, 2.4, 12);
    const shinGeom = new THREE.CylinderGeometry(0.52, 0.44, 2.8, 12);
    const footGeom = new THREE.SphereGeometry(0.6, 12, 10);

    // Left Leg
    const leftThigh = new THREE.Mesh(thighGeom, furMat);
    leftThigh.position.set(1.15, 1.2, 2.2);
    leftThigh.rotation.x = Math.PI / 2; // Horizontal resting on roof
    monkeyGroup.add(leftThigh);

    const leftKneeGroup = new THREE.Group();
    leftKneeGroup.position.set(1.15, 2.35, 2.2); // Knee at edge of building!
    const leftShin = new THREE.Mesh(shinGeom, furMat);
    leftShin.position.set(0, 0, -1.4); // Hanging straight DOWN over the ledge!
    const leftFoot = new THREE.Mesh(footGeom, skinMat);
    leftFoot.scale.set(0.85, 1.35, 0.65);
    leftFoot.position.set(0, 0.35, -2.7);
    leftKneeGroup.add(leftShin);
    leftKneeGroup.add(leftFoot);
    monkeyGroup.add(leftKneeGroup);

    // Right Leg
    const rightThigh = new THREE.Mesh(thighGeom, furMat);
    rightThigh.position.set(-1.15, 1.2, 2.2);
    rightThigh.rotation.x = Math.PI / 2; // Horizontal resting on roof
    monkeyGroup.add(rightThigh);

    const rightKneeGroup = new THREE.Group();
    rightKneeGroup.position.set(-1.15, 2.35, 2.2); // Knee at edge of building!
    const rightShin = new THREE.Mesh(shinGeom, furMat);
    rightShin.position.set(0, 0, -1.4); // Hanging straight DOWN over the ledge!
    const rightFoot = new THREE.Mesh(footGeom, skinMat);
    rightFoot.scale.set(0.85, 1.35, 0.65);
    rightFoot.position.set(0, 0.35, -2.7);
    rightKneeGroup.add(rightShin);
    rightKneeGroup.add(rightFoot);
    monkeyGroup.add(rightKneeGroup);

    // Rotate monkey to face South-East towards Privokzalnaya Square and gates of Minsk
    monkeyGroup.rotation.z = -Math.PI / 2 + 0.35;

    let time = 0;
    this.addObject({
      id,
      coordinates: coords,
      altitude,
      scale: 1.4, // Prominent, whimsical landmark sitting on station roof!
      mesh: monkeyGroup,
      animate: (_obj, delta) => {
        time += delta;
        // Happy swinging dangling legs!
        leftKneeGroup.rotation.x = Math.sin(time * 2.2) * 0.28;
        rightKneeGroup.rotation.x = Math.cos(time * 2.2) * 0.28;
        // Curious head tilts
        headGroup.rotation.y = Math.sin(time * 0.8) * 0.22;
        headGroup.rotation.z = Math.sin(time * 0.5) * 0.08;
      },
    });
  }

  /**
   * Custom 3D trees removed per user request
   */
  public spawnParkTrees() {
    // Custom trees disabled
  }

  public removeObject(id: string) {
    const item = this.objects.get(id);
    if (item) {
      this.scene.remove(item.root);
      this.objects.delete(id);
    }
  }

  public clearAll() {
    this.objects.forEach(({ root }) => {
      this.scene.remove(root);
    });
    this.objects.clear();
  }

  public destroy() {
    const visibilityHandler = (this as { _visibilityHandler?: () => void })._visibilityHandler;
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
    this.clearAll();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
