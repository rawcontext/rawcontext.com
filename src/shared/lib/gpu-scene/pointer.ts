export interface PointerSample {
	/** Smoothed position in physical canvas pixels. */
	position: readonly [number, number];
	/** 0 when the pointer is away, easing to 1 while it is over the host. */
	strength: number;
	/** Recent movement, 0 to 1. */
	velocity: number;
}

export interface PointerTracker {
	sample(disabled: boolean): PointerSample;
	dispose(): void;
}

const OFFSCREEN = -9999;
const PRESENCE_EASING = 0.08;
const POSITION_EASING = 0.22;
const VELOCITY_DECAY = 0.9;
const VELOCITY_SCALE_PX = 40;

/** Tracks the pointer over `host` in canvas pixels, with per-frame easing. */
export function createPointerTracker(canvas: HTMLCanvasElement, host: HTMLElement): PointerTracker {
	let raw: [number, number] = [OFFSCREEN, OFFSCREEN];
	const smooth: [number, number] = [OFFSCREEN, OFFSCREEN];
	let present = 0;
	let strength = 0;
	let velocity = 0;

	const onMove = (event: PointerEvent) => {
		const rect = canvas.getBoundingClientRect();
		const scale = canvas.width / Math.max(1, rect.width);
		const x = (event.clientX - rect.left) * scale;
		const y = (event.clientY - rect.top) * scale;
		if (present === 0) {
			smooth[0] = x;
			smooth[1] = y;
		}
		velocity = Math.min(1, velocity + Math.hypot(x - raw[0], y - raw[1]) / (VELOCITY_SCALE_PX * scale));
		raw = [x, y];
		present = 1;
	};
	const onLeave = () => {
		present = 0;
	};

	host.addEventListener('pointermove', onMove, { passive: true });
	host.addEventListener('pointerleave', onLeave);

	return {
		sample(disabled) {
			strength += ((disabled ? 0 : present) - strength) * PRESENCE_EASING;
			smooth[0] += (raw[0] - smooth[0]) * POSITION_EASING;
			smooth[1] += (raw[1] - smooth[1]) * POSITION_EASING;
			velocity *= VELOCITY_DECAY;
			return { position: [smooth[0], smooth[1]], strength, velocity };
		},
		dispose() {
			host.removeEventListener('pointermove', onMove);
			host.removeEventListener('pointerleave', onLeave);
		},
	};
}
