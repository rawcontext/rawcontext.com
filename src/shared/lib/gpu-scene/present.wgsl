// Copies the accumulated trail onto the canvas.
@group(0) @binding(0) var trail: texture_2d<f32>;
@group(0) @binding(1) var trailSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
	return textureSampleLevel(trail, trailSampler, uv, 0.0);
}
