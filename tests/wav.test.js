'use strict';

// Verifies the WAV wrapping used for uncompressed PCM tracks (MOV/MKV/AVI).
const assert = require('assert');
const media = require('../app/media.js');

const wavFile = media._internals.wavFile;

function u32le(data, offset) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

function u16le(data, offset) {
  return data[offset] | (data[offset + 1] << 8);
}

function ascii(data, offset, length) {
  return String.fromCharCode.apply(null, Array.from(data.slice(offset, offset + length)));
}

// 16-bit stereo
{
  const pcm = new Uint8Array([1, 2, 3, 4]);
  const out = wavFile(pcm, 2, 44100, 16);
  assert.strictEqual(ascii(out, 0, 4), 'RIFF');
  assert.strictEqual(ascii(out, 8, 4), 'WAVE');
  assert.strictEqual(ascii(out, 12, 4), 'fmt ');
  assert.strictEqual(ascii(out, 36, 4), 'data');
  assert.strictEqual(u32le(out, 4), 36 + pcm.length);
  assert.strictEqual(u32le(out, 16), 16);            // fmt chunk size
  assert.strictEqual(u16le(out, 20), 1);             // PCM format tag
  assert.strictEqual(u16le(out, 22), 2);             // channels
  assert.strictEqual(u32le(out, 24), 44100);         // sample rate
  assert.strictEqual(u32le(out, 28), 44100 * 2 * 2); // byte rate
  assert.strictEqual(u16le(out, 32), 4);             // block align
  assert.strictEqual(u16le(out, 34), 16);            // bits per sample
  assert.strictEqual(u32le(out, 40), pcm.length);    // data size
  assert.strictEqual(out.length, 44 + pcm.length);
}

// 24-bit mono
{
  const pcm = new Uint8Array(6);
  const out = wavFile(pcm, 1, 48000, 24);
  assert.strictEqual(u16le(out, 34), 24);
  assert.strictEqual(u16le(out, 32), 3);             // 1 channel * 3 bytes
  assert.strictEqual(u32le(out, 40), 6);
}

// The iso/container detector used to route MOV files through MP4Box.
assert.strictEqual(media.detect({ name: 'clip.mov' }), 'iso');
assert.strictEqual(media.detect({ name: 'clip.mp4' }), 'iso');
assert.strictEqual(media.detect({ name: 'clip.mkv' }), 'mkv');
assert.strictEqual(media.detect({ name: 'clip.avi' }), 'avi');

console.log('wav tests: OK');
