const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D photo;
uniform vec2 size, imageSize, pointer;
uniform vec3 light;
uniform float brightness, active, hover, hoverAmount;
uniform vec4 bounds[4];

vec3 room(vec2 p) {
  vec2 st = p / size;
  vec2 ratio = size / imageSize;
  vec2 imageUV = (st - .5) * ratio / max(ratio.x, ratio.y) + .5;
  vec3 rgb = texture2D(photo, clamp(imageUV, .004, .996)).rgb;
  vec2 fromHorizon = (st - vec2(.23,.37)) * vec2(3.1, 2.1);
  float horizon = exp(-dot(fromHorizon, fromHorizon));
  float shore = exp(-length((st - vec2(.77,.59)) * vec2(3.8, 2.9)));
  vec3 tint = mix(vec3(.44,.46,.57), light, .64);
  vec3 lit = rgb * tint * (.20 + brightness * 1.03 + horizon * brightness * .34)
    + light * brightness * (.075 * horizon + .095 * shore);
  float shade = .19 * (1. - smoothstep(0., .24, st.y)) + .39 * smoothstep(.38, 1., st.y);
  shade += .24 * smoothstep(.3, .91, st.y) * (1. - smoothstep(.16, .68, st.x));
  return lit * (1. - shade);
}

vec3 spectrum(float angle) {
  return .56 + .44 * cos(angle + vec3(0., 4.1, 2.));
}

void main() {
  vec2 point = vec2(uv.x, 1. - uv.y) * size;
  vec3 col = room(point);
  for (int i = 0; i < 4; i++) {
    vec4 box = bounds[i];
    vec2 p = point - box.xy;
    const float radius = 14.;
    vec2 halfSize = box.zw * .5;
    vec2 q = abs(p) - halfSize + radius;
    float distance = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - radius;
    if (distance < 4.) {
      float selected = 1. - step(.1, abs(active - float(i)));
      float hovering = (1. - step(.1, abs(hover - float(i)))) * hoverAmount;
      float inside = 1. - smoothstep(-.7, .45, distance);
      vec2 corner = max(q, 0.);
      vec2 side = mix(vec2(0., 1.), vec2(1., 0.), step(q.y, q.x));
      vec2 normal = sign(p) * mix(side, corner / max(length(corner), .001), step(.001, length(corner)));
      vec2 direction = p / max(halfSize, 1.);
      float angle = atan(direction.y, direction.x);
      float depth = max(0., -distance);
      float bevel = 1. - smoothstep(1., min(13., halfSize.y * .46), depth);
      float rim = 1. - smoothstep(.15, 1.8, abs(distance));
      float tilt = clamp((pointer.x - box.x) / halfSize.x, -1., 1.);
      vec3 film = spectrum(angle * 2. + .55 + hovering * .64 * tilt);
      float glint = pow(.5 + .5 * cos(angle * 3. - .6 + tilt * hovering), 2.4);
      float filmStrength = glint * (.028 + .048 * selected + .040 * hovering);

      // Contract the sampling coordinates toward the center to magnify the image.
      vec2 delta = point - pointer;
      float lensRadius = clamp(halfSize.y * .48, 13., 23.);
      float pull = (1. - smoothstep(.31, 1., length(delta / lensRadius))) * hovering;
      vec2 bend = box.xy + p * .91 - normal * (16. * bevel) - delta * (.24 * pull);
      vec2 split = normal * (2.8 * bevel * glint);
      vec3 glass = vec3(room(bend + split).r, room(bend).g, room(bend - split).b);

      float specular = pow(max(0., dot(normal, vec2(-.42, -.91))), 5.);
      vec3 refraction = glass * (1.03 + .06 * selected + .035 * pull);
      refraction = mix(refraction, max(refraction, film * .66), bevel * filmStrength * .42);
      refraction += vec3(1., .94, .88) * pull * .013;
      col = mix(col, refraction, inside);
      col += rim * (vec3(1., .94, .88) * (.08 + .07 * selected + .19 * specular) + film * filmStrength);
      break;
    }
  }
  gl_FragColor = vec4(col, 1.);
}`;

function compile(gl, kind, source) {
  const shader = gl.createShader(kind);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

export async function createOptics(canvas, photo) {
  const gl = canvas.getContext('webgl', {alpha: false, antialias: false});
  if (!gl) return null;

  await photo.decode();

  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uniform = Object.fromEntries(
    ['size', 'imageSize', 'pointer', 'light', 'brightness', 'active', 'hover', 'hoverAmount', 'bounds[0]']
      .map(name => [name, gl.getUniformLocation(program, name)]),
  );
  function setPhoto() {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photo);
    gl.uniform2f(uniform.imageSize, photo.naturalWidth, photo.naturalHeight);
  }
  setPhoto();

  return {
    setPhoto,
    resize(room, cards) {
      const frame = room.getBoundingClientRect();
      const scale = Math.min(1.5, window.devicePixelRatio, 1800 / Math.max(frame.width, frame.height));
      canvas.width = Math.ceil(frame.width * scale);
      canvas.height = Math.ceil(frame.height * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniform.size, frame.width, frame.height);
      const boxes = cards.flatMap(card => {
        const box = card.getBoundingClientRect();
        return [box.left - frame.left + box.width / 2, box.top - frame.top + box.height / 2, box.width, box.height];
      });
      gl.uniform4fv(uniform['bounds[0]'], boxes);
    },
    draw({light, brightness, active, hover, hoverAmount, pointer}) {
      gl.uniform3fv(uniform.light, light);
      gl.uniform1f(uniform.brightness, brightness);
      gl.uniform1f(uniform.active, active);
      gl.uniform1f(uniform.hover, hover);
      gl.uniform1f(uniform.hoverAmount, hoverAmount);
      gl.uniform2fv(uniform.pointer, pointer);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
