import type { Viewport } from './types';

const NARROW_BREAKPOINT_PX = 900;

/** Measures the canvas and the copy block it surrounds, in physical pixels. */
export function measureViewport(
	canvas: HTMLCanvasElement,
	copy: HTMLElement,
	width: number,
	height: number,
): Viewport {
	const canvasRect = canvas.getBoundingClientRect();
	const copyRect = copy.getBoundingClientRect();
	const dpr = width / Math.max(1, canvasRect.width);
	return {
		width,
		height,
		dpr,
		narrow: canvasRect.width < NARROW_BREAKPOINT_PX,
		copy: {
			left: (copyRect.left - canvasRect.left) * dpr,
			top: (copyRect.top - canvasRect.top) * dpr,
			right: (copyRect.right - canvasRect.left) * dpr,
			bottom: (copyRect.bottom - canvasRect.top) * dpr,
		},
	};
}
