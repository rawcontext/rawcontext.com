import {
	type ParticleSceneHandle,
	type SceneLayout,
	type SceneTimeline,
	type Viewport,
	mountParticleScene,
} from '@/shared/lib/gpu-scene';
import shader from './orrery.wgsl';

const PARTICLES = 65_536;
const TRAIL_DECAY = 0.15;
const SPRITE_SIZE = 1.25;
const SPRITE_ALPHA = 0.75;
const SCROLL_PARALLAX = 0.35;

/** One pass through flow → mark → flow → orrery → flow, in seconds. */
const CYCLE_SECONDS = 30;
/** Phase boundaries as fractions of the cycle. */
const MARK_PHASE = { in: [0.17, 0.23], out: [0.47, 0.52] } as const;
const ORRERY_PHASE = { in: [0.62, 0.68], out: [0.9, 0.95] } as const;
/** Under reduced motion the mark is shown formed, with time slowed right down. */
const REDUCED_MOTION_TIME_OFFSET = 6.5;
const REDUCED_MOTION_TIME_SCALE = 0.12;

function ramp(u: number, [from, to]: readonly [number, number]): number {
	const x = Math.min(1, Math.max(0, (u - from) / (to - from)));
	return x * x * (3 - 2 * x);
}

export function heroTimeline(time: number, reducedMotion: boolean): SceneTimeline {
	if (reducedMotion) {
		return { time: REDUCED_MOTION_TIME_OFFSET + time * REDUCED_MOTION_TIME_SCALE, gather: 1, orrery: 0 };
	}
	const u = (time / CYCLE_SECONDS + 0.1) % 1;
	return {
		time,
		gather: ramp(u, MARK_PHASE.in) * (1 - ramp(u, MARK_PHASE.out)),
		orrery: ramp(u, ORRERY_PHASE.in) * (1 - ramp(u, ORRERY_PHASE.out)),
	};
}

/** Wide: the mark sits to the right of the copy. Narrow: below it. */
export function heroLayout({ width, height, dpr, narrow, copy }: Viewport): SceneLayout {
	const margin = (narrow ? 30 : 40) * dpr;
	const exclusion = {
		min: [copy.left - margin, copy.top - margin] as const,
		max: [copy.right + margin, copy.bottom + margin] as const,
	};
	if (narrow) {
		const free = height - copy.bottom;
		return {
			center: [width * 0.5, (copy.bottom + height) / 2],
			radius: Math.max(40 * dpr, Math.min(width * 0.27, free * 0.3)),
			exclusion,
		};
	}
	return {
		center: [width * 0.69, height * 0.5],
		radius: Math.min(width * 0.16, height * 0.29),
		exclusion,
	};
}

export function mountHeroScene(canvas: HTMLCanvasElement, copy: HTMLElement): ParticleSceneHandle {
	return mountParticleScene(canvas, {
		label: 'hero',
		shader,
		copy,
		instances: PARTICLES,
		trailDecay: TRAIL_DECAY,
		size: SPRITE_SIZE,
		alpha: SPRITE_ALPHA,
		parallax: SCROLL_PARALLAX,
		layout: heroLayout,
		timeline: heroTimeline,
	});
}
