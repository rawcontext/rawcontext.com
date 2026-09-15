// Closing scene: a braided river. Eight coloured strands run across the
// section, parting from and rejoining a slow trunk line, with ringed nodes
// riding the strands. Like the hero, every particle is a function of its
// index and the time; nothing is simulated between frames.
import { hashU32, unitFloat } from "@vgpu/wgsl-std/hash";
import {
	SceneParams,
	discCoverage,
	exclusionFade,
	hue,
	paper,
	pointerPush,
	spriteCorner,
	toClip
} from "../../../shared/lib/gpu-scene/scene.wgsl";

@group(0) @binding(0) var<uniform> P: SceneParams;

const STRANDS = 8.0;
const NODE_COUNT = 216u;
const TRUNK_INDEX = 3.5;
const TRUNK_COLOR = vec3f(0.36, 0.33, 0.30);

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) local: vec2f,
	@location(1) color: vec4f,
	@location(2) kind: f32,
}

fn seed(particle: u32, slot: u32) -> f32 {
	return unitFloat(hashU32(particle * 16u + slot + 1u));
}

// The slow trunk line every strand returns to.
fn trunk(x: f32, t: f32) -> f32 {
	return 0.16 * sin(x * 1.25 + t * 0.05) + 0.09 * sin(x * 2.9 - t * 0.037 + 1.3);
}

fn period(k: f32) -> f32 {
	return 1.4 + 0.27 * k;
}

fn phase(k: f32) -> f32 {
	return k * 1.37 + 0.4;
}

// How far a strand has parted from the trunk at this point of its period.
fn envelope(s: f32) -> f32 {
	return smoothstep(0.10, 0.30, s) * (1.0 - smoothstep(0.70, 0.90, s));
}

fn separation(k: f32) -> f32 {
	return (k - TRUNK_INDEX) * 0.23;
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> VertexOut {
	let res = P.resolution;
	let H = res.y;
	let aspect = res.x / H;
	let r0 = seed(i, 0u);
	let r1 = seed(i, 1u);
	let r2 = seed(i, 2u);
	let r3 = seed(i, 3u);
	let r4 = seed(i, 4u);
	let focus = P.center / H;
	let R = P.radius / H;
	let t = P.time;
	let drift = t * 0.02;

	var pos: vec2f;
	var kind = 0.0;
	var alpha = 0.0;
	var size = 0.0;
	var strand = TRUNK_INDEX;

	if (i < NODE_COUNT) {
		// Nodes: three per strand per period, riding the strand.
		kind = 1.0;
		let k = f32(i % 8u);
		let n = f32((i / 8u) % 9u) - 3.0;
		let slot = (i / 72u) % 3u;
		var s0 = 0.10;
		if (slot == 1u) {
			s0 = 0.50;
		} else if (slot == 2u) {
			s0 = 0.90;
		}
		let x = ((n + s0) * period(k) - phase(k) - drift) / 0.85;
		let s = fract(((x * 0.85) + phase(k) + drift) / period(k));
		pos = vec2f(x, focus.y + R * (trunk(x, t) + separation(k) * envelope(s)));
		alpha = 0.7;
		size = P.dpr * 9.5;
		strand = k;
	} else {
		// Grains: 28 % on the trunk, the rest spread over the strands.
		var k = -1.0;
		var sep = 0.0;
		if (r0 >= 0.28) {
			k = floor((r0 - 0.28) / 0.72 * STRANDS);
			sep = separation(clamp(k, 0.0, STRANDS - 1.0));
			strand = k;
		}
		let kk = select(TRUNK_INDEX, k, k >= 0.0);
		let kf = fract(kk * 0.618 + 0.21);
		let kg = fract(kk * 0.383 + 0.57);
		let kh = fract(kk * 0.211 + 0.09);
		let span = aspect + 0.3;
		let vel = mix(0.08, 0.24, kf) * (0.85 + 0.3 * r4);
		let x = fract(r1 + t * vel / span) * span - 0.15;
		var e = 0.0;
		if (k >= 0.0) {
			e = envelope(fract((x * 0.85 + phase(k) + drift) / period(k)));
		}
		let width = mix(0.002, 0.011, kg) * (1.0 + 0.5 * e);
		let grain = select(r2 - 0.5, sign(r2 - 0.5) * pow(abs(r2 - 0.5) * 2.0, 0.4) * 0.5, kh > 0.5);
		let wobble = sin(x * mix(3.0, 9.0, kh) + t * mix(0.3, 0.9, kf) + kk * 2.0) * mix(0.0, 0.012, kg) * e;
		let ripple = sin((x - t * vel) * 90.0 * (0.5 + kh) + r1 * 6.28) * 0.0012 * kh;
		let y = focus.y + R * (trunk(x, t) + sep * e + wobble) + grain * width + ripple;
		pos = pointerPush(vec2f(x, y), P.pointer / H, P.pointer_on);
		let dash = mix(1.0, 0.55 + 0.45 * smoothstep(0.35, 0.65, fract(x * mix(6.0, 14.0, kg) + r1 * 3.0)), step(0.6, kh));
		alpha = P.alpha * (0.4 + 0.6 * r3) * mix(0.6, 1.25, kf) * dash;
		size = P.size * P.dpr * (0.7 + 0.6 * r0) * mix(0.75, 1.5, kg);
	}

	// Fade out at the section's edges and behind the copy.
	alpha *= smoothstep(-0.15, 0.2, pos.x) * (1.0 - smoothstep(aspect - 0.2, aspect + 0.15, pos.x));
	alpha *= exclusionFade(pos, P.exclusion_min / H, P.exclusion_max / H, 0.05, 0.14, 0.12);

	var color = TRUNK_COLOR;
	if (abs(strand - TRUNK_INDEX) > 0.1) {
		color = hue(u32(clamp(strand, 0.0, STRANDS - 1.0)));
	}

	var out: VertexOut;
	out.position = toClip(pos * H + spriteCorner(v) * size, res);
	out.local = spriteCorner(v);
	out.color = vec4f(color, alpha);
	out.kind = kind;
	return out;
}

@fragment fn fs_main(@location(0) local: vec2f, @location(1) color: vec4f, @location(2) kind: f32) -> @location(0) vec4f {
	let d = length(local);
	var a = color.a * discCoverage(local);
	if (kind > 0.5) {
		// A node: a paper disc with an inked ring and core.
		let ring = 1.0 - smoothstep(0.0, 0.13, abs(d - 0.58));
		let core = 1.0 - smoothstep(0.12, 0.24, d);
		let disc = smoothstep(0.12, 0.26, d) * (1.0 - smoothstep(0.42, 0.62, d));
		a = color.a * max(ring, core);
		return vec4f(mix(color.rgb * a, paper(), disc * (1.0 - a)), max(a, disc));
	}
	return vec4f(color.rgb * a, a);
}
