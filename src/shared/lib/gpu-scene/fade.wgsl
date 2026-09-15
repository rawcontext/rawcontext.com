// Multiplies the trail by (1 - strength) each frame. Paired with a
// "zero / one-minus-src-alpha" blend, the colour written here is irrelevant;
// only the alpha drives the decay.
struct Fade {
	strength: f32,
}

@group(0) @binding(0) var<uniform> fade: Fade;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
	return vec4f(0.0, 0.0, 0.0, fade.strength);
}
