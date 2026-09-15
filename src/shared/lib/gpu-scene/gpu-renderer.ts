import type { Frame, FrameLoopHandle } from 'vgpu';
import fadeShader from './fade.wgsl';
import { measureViewport } from './measure';
import type { MotionPreference } from './motion';
import { createPointerTracker } from './pointer';
import presentShader from './present.wgsl';
import type { ParticleSceneOptions, Renderer } from './types';

const PIXEL_RATIO_RANGE = [1, 2] as const;
const TARGET_FPS = 60;
const REDUCED_MOTION_FPS = 24;
/** Frames rendered under reduced motion before the still is left as is. */
const SETTLE_FRAMES = 120;
/** Frame-health governor: this many slow frames halve the particle count. */
const SLOW_FRAME_MS = 27;
const SLOW_FRAMES_BEFORE_DROP = 40;
const MIN_QUALITY = 0.25;
const MAX_TRAIL_DECAY = 0.6;
const POINTER_DECAY_BOOST = 0.35;
const OFFSCREEN_POINTER = [-9999, -9999] as const;

/** Keeps only (1 - src alpha) of what is already in the trail. */
const DECAY_BLEND = {
	color: { src: 'zero', dst: 'one-minus-src-alpha' },
	alpha: { src: 'zero', dst: 'one-minus-src-alpha' },
} as const;

interface GpuRendererContext {
	canvas: HTMLCanvasElement;
	options: ParticleSceneOptions;
	motion: MotionPreference;
	signal: AbortSignal;
}

const abortError = () => new DOMException('The scene was disposed before it started.', 'AbortError');

/**
 * The WebGPU path. Each frame fades the trail target a little, draws the
 * particles into it (positions come from the vertex shader, there is no
 * simulation state), then presents the trail on the canvas.
 */
export async function startGpuRenderer({ canvas, options, motion, signal }: GpuRendererContext): Promise<Renderer> {
	const vgpu = await import('vgpu');
	if (signal.aborted) throw abortError();
	const gpu = await vgpu.init();

	const disposers: Array<() => void> = [() => gpu.dispose()];
	const dispose = () => {
		for (const disposer of disposers.splice(0).reverse()) {
			try {
				disposer();
			} catch {
				// Tearing down after a lost device is best effort.
			}
		}
	};

	try {
		if (signal.aborted) throw abortError();
		const { label } = options;
		const canvasSurface = vgpu.surface(gpu, canvas, {
			alphaMode: 'premultiplied',
			clearColor: [0, 0, 0, 0],
			dpr: PIXEL_RATIO_RANGE,
			label: `${label} surface`,
		});
		disposers.push(() => canvasSurface.dispose());

		const [initialWidth, initialHeight] = canvasSurface.size;
		const trail = vgpu.target(gpu, {
			size: [initialWidth, initialHeight],
			format: 'rgba16float',
			clearColor: [0, 0, 0, 0],
			label: `${label} trail`,
		});
		const fade = vgpu.effect(gpu, fadeShader, {
			label: `${label} fade`,
			blend: DECAY_BLEND,
			set: { fade: { strength: options.trailDecay } },
		});
		const present = vgpu.effect(gpu, presentShader, {
			label: `${label} present`,
			set: { trail, trailSampler: vgpu.sampler(gpu, { minFilter: 'linear', magFilter: 'linear' }) },
		});
		const particles = vgpu.draw(gpu, {
			shader: options.shader,
			instances: options.instances,
			blend: 'premultiplied',
			label: `${label} particles`,
			set: {
				P: {
					resolution: [initialWidth, initialHeight],
					center: [0, 0],
					pointer: OFFSCREEN_POINTER,
					exclusion_min: [0, 0],
					exclusion_max: [0, 0],
					time: 0,
					dpr: canvasSurface.dpr,
					radius: 1,
					gather: 0,
					orrery: 0,
					pointer_on: 0,
					scroll: 0,
					size: options.size,
					alpha: options.alpha,
				},
			},
		});

		let dpr = canvasSurface.dpr;
		const applyLayout = () => {
			const [width, height] = canvasSurface.size;
			const viewport = measureViewport(canvas, options.copy, width, height);
			const layout = options.layout(viewport);
			dpr = viewport.dpr;
			particles.set({
				P: {
					resolution: [width, height],
					dpr: viewport.dpr,
					center: layout.center,
					radius: layout.radius,
					exclusion_min: layout.exclusion.min,
					exclusion_max: layout.exclusion.max,
				},
			});
		};

		// Layout follows the canvas, the copy block, and the web fonts settling.
		disposers.push(
			canvasSurface.onResize(({ width, height }) => {
				trail.resize([width, height]);
				applyLayout();
				if (motion.reduced) restart();
			}),
		);
		const copyObserver = new ResizeObserver(() => applyLayout());
		copyObserver.observe(options.copy);
		disposers.push(() => copyObserver.disconnect());
		void document.fonts?.ready.then(() => {
			if (!signal.aborted) applyLayout();
		});

		// Pre-warm every pipeline before the first visible frame. A surface can
		// only be drawn inside a frame, so the present effect compiles against
		// the surface's signature instead of the surface itself. Wait for all
		// three to settle so a failure never tears down mid-compile.
		const compiled = await Promise.allSettled([
			fade.compile(trail),
			particles.compile(trail),
			present.compile({ colors: [canvasSurface.format], sampleCount: canvasSurface.sampleCount }),
		]);
		const failure = compiled.find((result) => result.status === 'rejected');
		if (failure) throw failure.reason;
		if (signal.aborted) throw abortError();

		const pointer = createPointerTracker(canvas, canvas.parentElement ?? canvas);
		disposers.push(() => pointer.dispose());

		let visible = true;
		const visibility = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? true;
		});
		visibility.observe(canvas);
		disposers.push(() => visibility.disconnect());

		const time = vgpu.clock(gpu);
		let quality = 1;
		let slowFrames = 0;
		let lastFrameAt = performance.now();
		let framesThisRun = 0;
		let currentDecay = options.trailDecay;
		let loop: FrameLoopHandle | undefined;

		const render = (frame: Frame) => {
			const now = performance.now();
			const elapsed = now - lastFrameAt;
			lastFrameAt = now;
			if (!visible) return;
			framesThisRun += 1;

			if (elapsed > SLOW_FRAME_MS && elapsed < 250) slowFrames += 1;
			else slowFrames = Math.max(0, slowFrames - 1);
			if (slowFrames > SLOW_FRAMES_BEFORE_DROP && quality > MIN_QUALITY) {
				quality /= 2;
				slowFrames = 0;
			}

			const reduced = motion.reduced;
			const cursor = pointer.sample(reduced);
			const decay = Math.min(
				MAX_TRAIL_DECAY,
				options.trailDecay + cursor.velocity * cursor.strength * POINTER_DECAY_BOOST,
			);
			if (decay !== currentDecay) {
				currentDecay = decay;
				fade.set({ fade: { strength: decay } });
			}

			const timeline = options.timeline(time.time, reduced);
			particles.set({
				P: {
					time: timeline.time,
					gather: timeline.gather,
					orrery: timeline.orrery,
					pointer: cursor.position,
					pointer_on: cursor.strength,
					scroll: options.parallax * window.scrollY * dpr,
				},
			});

			frame.pass({ target: trail, clear: false }, (pass) => {
				pass.draw(fade);
				pass.draw(particles, { instances: Math.round(options.instances * quality) });
			});
			frame.pass(canvasSurface, present);

			// Under reduced motion the scene settles into a still and stops.
			if (reduced && framesThisRun > SETTLE_FRAMES) stop();
		};

		const stop = () => {
			loop?.stop();
			loop = undefined;
		};
		const start = () => {
			if (loop) return;
			framesThisRun = 0;
			lastFrameAt = performance.now();
			loop = vgpu.frameLoop(gpu, render, { fps: motion.reduced ? REDUCED_MOTION_FPS : TARGET_FPS });
		};
		const restart = () => {
			stop();
			start();
		};

		disposers.push(stop);
		disposers.push(motion.subscribe(restart));
		start();
		canvas.classList.add('is-ready');

		return { dispose };
	} catch (error) {
		dispose();
		throw error;
	}
}
