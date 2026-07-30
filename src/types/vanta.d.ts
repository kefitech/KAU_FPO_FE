declare module "vanta/dist/vanta.birds.min" {
  import * as THREE from "three";

  interface VantaBirdsOptions {
    el: HTMLElement;
    THREE?: typeof THREE;
    backgroundColor?: number;
    backgroundAlpha?: number;
    color1?: number;
    color2?: number;
    colorMode?: string;
    quantity?: number;
    birdSize?: number;
    wingSpan?: number;
    speedLimit?: number;
    separation?: number;
    alignment?: number;
    cohesion?: number;
    [key: string]: unknown;
  }

  interface VantaEffect {
    destroy(): void;
  }

  function BIRDS(options: VantaBirdsOptions): VantaEffect;
  export default BIRDS;
}
