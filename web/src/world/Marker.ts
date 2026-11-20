import * as THREE from 'three';

/** Glowing objective beam + bobbing chevron, visible from far away. */
export class Marker {
  readonly root = new THREE.Group();
  private chevron: THREE.Mesh;
  private t = 0;

  constructor(scene: THREE.Scene) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 30, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: '#f5c518', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    );
    beam.position.y = 15;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.0, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#f5c518', transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.position.y = 0.2;
    this.chevron = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.6, 4).rotateX(Math.PI),
      new THREE.MeshBasicMaterial({ color: '#ffd84d' }),
    );
    this.root.add(beam, ring, this.chevron);
    this.root.visible = false;
    scene.add(this.root);
  }

  show(x: number, z: number, y = 0.15) {
    this.root.position.set(x, y, z);
    this.root.visible = true;
  }

  hide() {
    this.root.visible = false;
  }

  get position(): { x: number; z: number } | null {
    return this.root.visible ? { x: this.root.position.x, z: this.root.position.z } : null;
  }

  update(dt: number) {
    this.t += dt;
    this.chevron.position.y = 2.4 + Math.sin(this.t * 3) * 0.2;
    this.chevron.rotation.y = this.t * 1.5;
  }
}
