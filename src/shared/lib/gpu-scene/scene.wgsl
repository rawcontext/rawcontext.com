// Shared vocabulary for the particle scenes: the uniform block every scene
// binds, the palette, and the point-sprite helpers. This is a pure module;
// the entry shader declares the binding.

export struct SceneParams {
	resolution: vec2f,
	center: vec2f,
	pointer: vec2f,
	exclusion_min: vec2f,
	exclusion_max: vec2f,
	time: f32,
	dpr: f32,
	radius: f32,
	gather: f32,
	orrery: f32,
	pointer_on: f32,
	scroll: f32,
	size: f32,
	alpha: f32,
}

// Brand colours.
export fn ink() -> vec3f {
	return vec3f(0.078, 0.071, 0.059);
}

export fn paper() -> vec3f {
	return vec3f(0.949, 0.933, 0.902);
}

// Eight muted hues.
export fn hue(index: u32) -> vec3f {
	var hues = array<vec3f, 8>(
		vec3f(0.62, 0.36, 0.22),
		vec3f(0.30, 0.45, 0.58),
		vec3f(0.36, 0.52, 0.36),
		vec3f(0.56, 0.40, 0.56),
		vec3f(0.66, 0.50, 0.24),
		vec3f(0.24, 0.50, 0.50),
		vec3f(0.60, 0.32, 0.36),
		vec3f(0.40, 0.42, 0.62)
	);
	return hues[index % 8u];
}

// One corner of an equilateral point sprite, per vertex.
export fn spriteCorner(vertex: u32) -> vec2f {
	var corners = array<vec2f, 3>(vec2f(-1.732, -1.0), vec2f(1.732, -1.0), vec2f(0.0, 2.0));
	return corners[vertex];
}

// Physical pixels (y down) to clip space.
export fn toClip(pixel: vec2f, resolution: vec2f) -> vec4f {
	return vec4f(pixel.x / resolution.x * 2.0 - 1.0, 1.0 - pixel.y / resolution.y * 2.0, 0.0, 1.0);
}

// Soft round coverage from the sprite's corner-space coordinate.
export fn discCoverage(local: vec2f) -> f32 {
	return 1.0 - smoothstep(0.55, 1.0, length(local));
}

// 1 outside the copy's box, `inside` within it, feathered across the edge.
export fn exclusionFade(pos: vec2f, lo: vec2f, hi: vec2f, inside: f32, featherIn: f32, featherOut: f32) -> f32 {
	let dx = max(lo.x - pos.x, pos.x - hi.x);
	let dy = max(lo.y - pos.y, pos.y - hi.y);
	return mix(inside, 1.0, smoothstep(-featherIn, featherOut, max(dx, dy)));
}

// Nudges a position away from the pointer.
export fn pointerPush(pos: vec2f, pointer: vec2f, strength: f32) -> vec2f {
	let away = pos - pointer;
	let dist = length(away) + 0.0001;
	return pos + away / dist * (1.0 - smoothstep(0.0, 0.16, dist)) * 0.028 * strength;
}
