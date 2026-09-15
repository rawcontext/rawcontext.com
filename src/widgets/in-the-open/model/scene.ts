import {
	type ParticleSceneHandle,
	type SceneLayout,
	type SceneTimeline,
	type Viewport,
	mountParticleScene,
} from '@/shared/lib/gpu-scene';
import shader from './river.wgsl';

const PARTICLES = 32_768;
const TRAIL_DECAY = 0.15;
const SPRITE_SIZE = 1;
const SPRITE_ALPHA = 0.3;

/** The river runs continuously; there is no gather cycle. */
export function riverTimeline(time: number): SceneTimeline {
	return { time, gather: 0, orrery: 1 };
}

/** Wide: the river crosses behind the copy. Narrow: it runs below it. */
export function riverLayout({ width, height, dpr, narrow, copy }: Viewport): SceneLayout {
	const margin = 30 * dpr;
	const exclusion = {
		min: [copy.left - margin, copy.top - margin] as const,
		max: [copy.right + margin, copy.bottom + margin] as const,
	};
	if (narrow) {
		const free = height - copy.bottom;
		return {
			center: [width * 0.5, (copy.bottom + height) / 2],
			radius: Math.min(width * 0.3, free * 0.4),
			exclusion,
		};
	}
	return {
		center: [width * 0.5, height * 0.5],
		radius: Math.min(width * 0.2, height * 0.4),
		exclusion,
	};
}

export function mountRiverScene(canvas: HTMLCanvasElement, copy: HTMLElement): ParticleSceneHandle {
	return mountParticleScene(canvas, {
		label: 'in-the-open',
		shader,
		copy,
		instances: PARTICLES,
		trailDecay: TRAIL_DECAY,
		size: SPRITE_SIZE,
		alpha: SPRITE_ALPHA,
		parallax: 0,
		layout: riverLayout,
		timeline: riverTimeline,
	});
}
