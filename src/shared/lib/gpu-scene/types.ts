import type { ShaderSource } from '@vgpu/wgsl';

/** The canvas and the copy block it surrounds, in physical pixels. */
export interface Viewport {
	width: number;
	height: number;
	dpr: number;
	/** True when the section is laid out as a single column. */
	narrow: boolean;
	/** The copy's bounds relative to the canvas. */
	copy: { left: number; top: number; right: number; bottom: number };
}

/** Where a scene puts its focal point and what it keeps clear of. */
export interface SceneLayout {
	center: readonly [number, number];
	radius: number;
	exclusion: { min: readonly [number, number]; max: readonly [number, number] };
}

/** Per-frame animation state fed to the shader. */
export interface SceneTimeline {
	time: number;
	gather: number;
	orrery: number;
}

export interface ParticleSceneOptions {
	/** Human-readable name used in labels and warnings. */
	label: string;
	/** The particle draw shader. It must bind `P: SceneParams` from scene.wgsl. */
	shader: ShaderSource;
	/** The text block particles keep clear of. Its size drives relayout. */
	copy: HTMLElement;
	/** Particle count at full quality. */
	instances: number;
	/** Fraction of the trail that fades each frame, 0 to 1. */
	trailDecay: number;
	/** Base sprite size, CSS pixels. */
	size: number;
	/** Base sprite alpha. */
	alpha: number;
	/** How much the focal point follows the scroll position, 0 to 1. */
	parallax: number;
	layout(viewport: Viewport): SceneLayout;
	timeline(time: number, reducedMotion: boolean): SceneTimeline;
}

export interface Renderer {
	dispose(): void;
}

export interface ParticleSceneHandle {
	dispose(): void;
}
