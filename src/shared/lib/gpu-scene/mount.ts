import { startGpuRenderer } from './gpu-renderer';
import { createMotionPreference } from './motion';
import type { ParticleSceneHandle, ParticleSceneOptions, Renderer } from './types';

/**
 * Mounts a particle scene on a canvas through WebGPU. Where WebGPU is
 * unavailable the canvas simply stays empty; the copy carries the section.
 * Call `dispose()` to tear the scene down.
 */
export function mountParticleScene(canvas: HTMLCanvasElement, options: ParticleSceneOptions): ParticleSceneHandle {
	const controller = new AbortController();
	const { signal } = controller;
	const motion = createMotionPreference();
	let renderer: Renderer | undefined;

	if ('gpu' in navigator) {
		startGpuRenderer({ canvas, options, motion, signal }).then(
			(started) => {
				if (signal.aborted) started.dispose();
				else renderer = started;
			},
			(error: unknown) => {
				if (!signal.aborted) console.warn(`[${options.label}] WebGPU scene did not start.`, error);
			},
		);
	}

	return {
		dispose() {
			controller.abort();
			renderer?.dispose();
			renderer = undefined;
			motion.dispose();
		},
	};
}
