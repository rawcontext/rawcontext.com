// Hero scene. Every particle is a stateless function of its index and the
// time: it drifts through a flow field for its lifetime, and while the field
// gathers it is drawn onto its seat in the mark (ring, core, node) or in the
// orrery (sun, planets, orbit rings). Positions are in "height units" (0 at
// the top edge, 1 at the bottom) until the final pixel mapping.
import { hashU32, unitFloat } from "@vgpu/wgsl-std/hash";
import {
	SceneParams,
	discCoverage,
	exclusionFade,
	hue,
	ink,
	pointerPush,
	spriteCorner,
	toClip
} from "../../../shared/lib/gpu-scene/scene.wgsl";

@group(0) @binding(0) var<uniform> P: SceneParams;

const TAU = 6.2831853;
const PI = 3.14159265;
const PLANET_COUNT = 5.0;
const ORRERY_TILT = -0.35;
// The mark's node sits up and to the right of the core, on the ring.
const NODE_DIRECTION = vec2f(0.7071, -0.7071);

struct VertexOut {
	@builtin(position) position: vec4f,
	@location(0) local: vec2f,
	@location(1) color: vec4f,
}

fn seed(particle: u32, slot: u32) -> f32 {
	return unitFloat(hashU32(particle * 16u + slot + 1u));
}

fn smoothRamp(x: f32) -> f32 {
	let t = clamp(x, 0.0, 1.0);
	return t * t * (3.0 - 2.0 * t);
}

// Curl of five drifting plane waves (divergence-free, so nothing piles up),
// a slow swirl around the focal point, and a faint constant drift.
fn flow(q: vec2f, t: f32, focus: vec2f) -> vec2f {
	var gx = 0.0;
	var gy = 0.0;
	let k1 = vec2f(2.1, 1.3);
	let c1 = cos(dot(q, k1) + 0.21 * t) * 0.22;
	gx += c1 * k1.x;
	gy += c1 * k1.y;
	let k2 = vec2f(-1.7, 2.6);
	let c2 = cos(dot(q, k2) - 0.17 * t + 1.7) * 0.16;
	gx += c2 * k2.x;
	gy += c2 * k2.y;
	let k3 = vec2f(3.9, -2.2);
	let c3 = cos(dot(q, k3) + 0.29 * t + 3.1) * 0.08;
	gx += c3 * k3.x;
	gy += c3 * k3.y;
	let k4 = vec2f(0.9, -4.1);
	let c4 = cos(dot(q, k4) - 0.11 * t + 0.6) * 0.07;
	gx += c4 * k4.x;
	gy += c4 * k4.y;
	let k5 = vec2f(6.3, 4.7);
	let c5 = cos(dot(q, k5) + 0.37 * t + 2.2) * 0.03;
	gx += c5 * k5.x;
	gy += c5 * k5.y;
	var v = vec2f(gy, -gx);
	let d = q - focus;
	v += vec2f(-d.y, d.x) * (0.22 / (length(d) + 0.35));
	v += vec2f(0.05, -0.02);
	return v * 0.28;
}

// --- Orbital mechanics for the orrery -------------------------------------

fn orbitEccentricity(k: f32) -> f32 {
	return 0.14 + 0.16 * fract(k * 0.618 + 0.21);
}

fn orbitArgument(k: f32) -> f32 {
	return k * 2.4 + 0.7;
}

fn planetSemiMajor(k: f32, R: f32) -> f32 {
	return R * (0.42 + 0.30 * k);
}

fn planetAngularSpeed(semiMajor: f32, R: f32) -> f32 {
	return 0.9 / pow(semiMajor / R, 1.5);
}

// Kepler's equation, four Newton steps.
fn eccentricAnomaly(meanAnomaly: f32, e: f32) -> f32 {
	var E = meanAnomaly + e * sin(meanAnomaly);
	for (var n = 0u; n < 4u; n++) {
		E = E - (E - e * sin(E) - meanAnomaly) / (1.0 - e * cos(E));
	}
	return E;
}

// A point on planet k's tilted ellipse. xy: screen position; z: perspective
// scale; w: depth sign, negative behind the sun.
fn orbitPoint(k: f32, E: f32, semiMajor: f32, focus: vec2f, R: f32, tilt: mat2x2f) -> vec4f {
	let e = orbitEccentricity(k);
	let semiMinor = semiMajor * sqrt(1.0 - e * e);
	let px = semiMajor * (cos(E) - e);
	let py = semiMinor * sin(E);
	let ca = cos(orbitArgument(k));
	let sa = sin(orbitArgument(k));
	let ox = ca * px - sa * py;
	let oy = sa * px + ca * py;
	let p3 = vec3f(ox, oy * 0.42, oy * 0.907);
	let perspective = 3.2 / (3.2 - p3.z / R);
	return vec4f(focus + tilt * (p3.xy * perspective), perspective, oy / max(semiMajor, 0.0001));
}

// xy: planet position; z: planet radius; w: depth sign.
fn planet(k: f32, focus: vec2f, R: f32, t: f32, tilt: mat2x2f) -> vec4f {
	let semiMajor = planetSemiMajor(k, R);
	let E = eccentricAnomaly(k * 1.7 + planetAngularSpeed(semiMajor, R) * t, orbitEccentricity(k));
	let p = orbitPoint(k, E, semiMajor, focus, R, tilt);
	return vec4f(p.xy, R * (0.05 + 0.018 * k) * p.z, p.w);
}

// Particles between 12 % and 30 % ride a planet; the rest trace its orbit.
fn planetIndex(r6: f32) -> f32 {
	var k = 0.0;
	if (r6 < 0.30) {
		k = floor((r6 - 0.12) / 0.18 * PLANET_COUNT);
	} else {
		k = floor((r6 - 0.30) / 0.70 * PLANET_COUNT);
	}
	return clamp(k, 0.0, PLANET_COUNT - 1.0);
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
	let r5 = seed(i, 5u);
	let r6 = seed(i, 6u);
	let r7 = seed(i, 7u);
	let focus = (P.center - vec2f(0.0, P.scroll)) / H;
	let R = P.radius / H;

	// 1. Adrift: integrate the flow from birth to now.
	let lifetime = 9.0 + r4 * 7.0;
	let age = fract(P.time / lifetime + r5) * lifetime;
	let born = P.time - age;
	var drift = vec2f(r0 * (aspect + 0.4) - 0.2, r1 * 1.4 - 0.2);
	let dt = 0.25;
	for (var k = 0u; k < 64u; k++) {
		let elapsed = f32(k) * dt;
		if (elapsed >= age) {
			break;
		}
		drift += flow(drift, born + elapsed, focus) * min(dt, age - elapsed);
	}

	// 2. Its seat in the mark: ring (62 %), core (28 %), node (10 %).
	let node = focus + R * NODE_DIRECTION;
	let spin = P.time * 0.22;
	var seat: vec2f;
	if (r6 < 0.62) {
		let th = r7 * TAU + spin;
		let rr = R * (1.0 + (r2 - 0.5) * 0.105);
		seat = focus + rr * vec2f(cos(th), sin(th));
		// The ring breaks where the node sits; those particles join the node.
		if (distance(seat, node) < R * 0.23) {
			let a2 = r3 * TAU + spin;
			seat = node + R * 0.21 * (1.0 + (r2 - 0.5) * 0.5) * vec2f(cos(a2), sin(a2));
		}
	} else if (r6 < 0.90) {
		let th = r7 * TAU - spin * 0.6;
		let rr = R * 0.342 * sqrt(r2);
		seat = focus + rr * vec2f(cos(th), sin(th));
	} else {
		let th = r7 * TAU + spin * 1.5;
		let rr = R * 0.21 * (1.0 + (r2 - 0.5) * 0.5);
		seat = node + rr * vec2f(cos(th), sin(th));
	}
	seat += vec2f(sin(P.time * 1.3 + r3 * 40.0), cos(P.time * 1.1 + r0 * 40.0)) * R * 0.006;

	// 3. Its seat in the orrery.
	let ca = cos(ORRERY_TILT);
	let sa = sin(ORRERY_TILT);
	let tilt = mat2x2f(ca, sa, -sa, ca);
	var orb: vec2f;
	var shade = 1.0;
	var occlusion = 0.0;
	var depth = 0.5;
	if (r6 < 0.12) {
		// The sun: a lit sphere, shadowed where a planet passes in front.
		let lat = (r7 - 0.5) * PI;
		let lon = r3 * TAU + P.time * 0.35 * (1.0 - 0.35 * abs(sin(lat)));
		let sx = cos(lat) * sin(lon);
		let sy = sin(lat) * 0.92 + cos(lat) * cos(lon) * 0.38;
		orb = focus + R * 0.30 * vec2f(sx, sy) * (0.55 + 0.45 * sqrt(r2));
		let fromLight = (orb - focus) / (R * 0.30) - vec2f(-0.28, -0.28);
		shade = mix(0.42, 1.0, smoothstep(0.05, 1.05, length(fromLight)));
		for (var k = 0u; k < 5u; k++) {
			let pl = planet(f32(k), focus, R, P.time, tilt);
			if (pl.w > 0.0) {
				shade *= smoothstep(pl.z * 1.05, pl.z * 1.45, distance(orb, pl.xy));
			}
		}
	} else {
		let k = planetIndex(r6);
		let semiMajor = planetSemiMajor(k, R);
		var depthSign = 0.0;
		if (r6 < 0.30) {
			// On a planet's surface, lit from the sun.
			let pl = planet(k, focus, R, P.time, tilt);
			depthSign = pl.w;
			let lat = (r7 - 0.5) * PI;
			let lon = r3 * TAU + P.time * (0.9 + 0.5 * k) * select(1.0, -1.0, k == 2.0);
			let offset = vec2f(cos(lat) * sin(lon), sin(lat) * 0.94 + cos(lat) * cos(lon) * 0.34);
			let rad = length(offset);
			orb = pl.xy + pl.z * offset;
			let toSun = normalize(focus - pl.xy);
			let lit = dot(offset / max(rad, 0.001), toSun) * (0.55 + 0.45 * rad);
			shade = mix(1.0, 0.3, smoothstep(-0.25, 0.7, lit));
		} else {
			// Along the orbit ring itself.
			let E = r7 * TAU + planetAngularSpeed(semiMajor, R) * P.time;
			let p = orbitPoint(k, E, semiMajor * (1.0 + (r2 - 0.5) * 0.04), focus, R, tilt);
			orb = p.xy;
			depthSign = p.w;
		}
		depth = clamp(0.5 + 0.5 * depthSign, 0.0, 1.0);
		let behind = 1.0 - smoothstep(-0.12, 0.12, depthSign);
		occlusion = behind * (1.0 - smoothstep(0.30, 0.345, distance(orb, focus) / R));
	}

	// 4. Blend the three positions by the timeline; each particle arrives a
	//    little late, on a small arc.
	let gatherIn = smoothRamp(P.gather * 1.6 - r5 * 0.6);
	let orreryIn = smoothRamp(P.orrery * 1.6 - r1 * 0.6);
	var pos = drift;
	let toSeat = seat - drift;
	pos = mix(pos, seat + vec2f(-toSeat.y, toSeat.x) * (r3 - 0.5) * 0.35 * sin(gatherIn * PI), gatherIn);
	let toOrb = orb - drift;
	pos = mix(pos, orb + vec2f(-toOrb.y, toOrb.x) * (r2 - 0.5) * 0.35 * sin(orreryIn * PI), orreryIn);
	pos = pointerPush(pos, P.pointer / H, P.pointer_on);
	let formed = max(gatherIn, orreryIn);

	// 5. Alpha, size, colour.
	var alpha = P.alpha * (0.55 + 0.45 * r3) * smoothstep(0.0, 1.0, age) * (1.0 - smoothstep(lifetime - 1.5, lifetime, age));
	alpha = mix(alpha, P.alpha * (0.6 + 0.4 * r3), formed);
	alpha *= mix(1.0, shade * (1.0 - occlusion) * mix(0.55, 1.0, depth), orreryIn);
	alpha *= exclusionFade(pos, P.exclusion_min / H, P.exclusion_max / H, 0.12, 0.09, 0.09);
	let size = P.size * P.dpr * (0.8 + 0.7 * r0) * (1.0 + 0.35 * formed) * mix(1.0, mix(0.7, 1.3, depth), orreryIn);

	let driftColor = hue(u32(floor(r6 * 8.0)));
	var seatColor = hue(1u);
	if (r6 >= 0.62 && r6 < 0.90) {
		seatColor = ink();
	} else if (r6 >= 0.90) {
		seatColor = hue(0u);
	}
	var orbColor = hue(4u);
	if (r6 >= 0.12) {
		orbColor = hue(u32(planetIndex(r6)) * 3u + 1u);
	}
	var color = mix(driftColor, seatColor, gatherIn);
	color = mix(color, orbColor, orreryIn);
	// Most particles stay ink; about a quarter carry a tint.
	let tinted = step(0.72, r4);

	var out: VertexOut;
	out.position = toClip(pos * H + spriteCorner(v) * size, res);
	out.local = spriteCorner(v);
	out.color = vec4f(mix(ink(), color, 0.42 * tinted), alpha);
	return out;
}

@fragment fn fs_main(@location(0) local: vec2f, @location(1) color: vec4f) -> @location(0) vec4f {
	let a = color.a * discCoverage(local);
	return vec4f(color.rgb * a, a);
}
