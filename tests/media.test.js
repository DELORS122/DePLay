'use strict';

const assert = require('assert');
const media = require('../app/media.js');

function bytes(values) {
  return new Uint8Array(values);
}

function ascii(text) {
  return new Uint8Array(Array.from(text, (ch) => ch.charCodeAt(0)));
}

function concat(chunks) {
  let total = 0;
  chunks.forEach((chunk) => { total += chunk.length; });
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { out.set(chunk, offset); offset += chunk.length; });
  return out;
}

function idBytes(value) {
  const out = [];
  let rest = value;
  while (rest > 0) {
    out.unshift(rest & 0xff);
    rest = Math.floor(rest / 256);
  }
  return bytes(out);
}

function sizeBytes(value) {
  // Eight-byte EBML size, enough for fixtures.
  const out = new Uint8Array(8);
  out[0] = 0x01;
  let rest = value;
  for (let i = 7; i >= 1; i -= 1) {
    out[i] = rest & 0xff;
    rest = Math.floor(rest / 256);
  }
  return out;
}

function element(id, payload) {
  return concat([idBytes(id), sizeBytes(payload.length), payload]);
}

function uintBytes(value) {
  if (value === 0) return bytes([0]);
  const out = [];
  let rest = value;
  while (rest > 0) { out.unshift(rest & 0xff); rest = Math.floor(rest / 256); }
  return bytes(out);
}

function floatBytes(value) {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, value, false);
  return new Uint8Array(buffer);
}

function stringBytes(value) {
  return ascii(value);
}

function mkvFixture() {
  const audio = concat([
    element(0xb5, floatBytes(48000)),
    element(0x9f, uintBytes(2)),
  ]);
  const aacEntry = concat([
    element(0xd7, uintBytes(1)),
    element(0x83, uintBytes(2)),
    element(0x86, stringBytes('A_AAC')),
    element(0x63a2, bytes([0x11, 0x90])),
    element(0x22b59c, stringBytes('eng')),
    element(0xe1, audio),
  ]);
  const opusEntry = concat([
    element(0xd7, uintBytes(2)),
    element(0x83, uintBytes(2)),
    element(0x86, stringBytes('A_OPUS')),
    element(0x63a2, bytes([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 1, 2, 0x38, 1, 0x80, 0xbb, 0, 0, 0, 0, 0])),
    element(0xe1, audio),
  ]);
  const tracks = element(0x1654ae6b, concat([element(0xae, aacEntry), element(0xae, opusEntry)]));
  const info = element(0x1549a966, element(0x2ad7b1, uintBytes(1000000)));

  const blockPayload = concat([
    bytes([0x81]),       // track 1
    bytes([0x00, 0x00]), // relative timecode
    bytes([0x80]),       // flags: keyframe
    bytes([0x01, 0x02, 0x03, 0x04]),
  ]);
  const secondBlock = concat([
    bytes([0x82]),
    bytes([0x00, 0x00]),
    bytes([0x80]),
    bytes([0x05, 0x06, 0x07]),
  ]);
  const cluster = element(0x1f43b675, concat([
    element(0xe7, uintBytes(0)),
    element(0xa3, blockPayload),
    element(0xa3, secondBlock),
  ]));
  return element(0x18538067, concat([info, tracks, cluster]));
}

function aviChunk(id, payload) {
  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, payload.length, true);
  const pad = payload.length & 1 ? new Uint8Array(1) : new Uint8Array(0);
  return concat([ascii(id), size, payload, pad]);
}

function listChunk(kind, payload) {
  return aviChunk('LIST', concat([ascii(kind), payload]));
}

function aviFixture() {
  const strh = new Uint8Array(56);
  strh.set(ascii('auds'), 0);
  strh.set(ascii('MP3 '), 4);
  const view = new DataView(strh.buffer);
  view.setUint32(20, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(32, 16000, true);
  view.setUint32(36, 1, true);

  const strf = new Uint8Array(18);
  const wave = new DataView(strf.buffer);
  wave.setUint16(0, 0x0055, true);
  wave.setUint16(2, 2, true);
  wave.setUint32(4, 44100, true);
  wave.setUint32(8, 16000, true);
  wave.setUint16(12, 1, true);
  wave.setUint16(14, 0, true);

  const strl = listChunk('strl', concat([
    aviChunk('strh', strh),
    aviChunk('strf', strf),
    aviChunk('strn', ascii('Commentary\0')),
  ]));
  const hdrl = listChunk('hdrl', strl);
  const movi = listChunk('movi', concat([
    aviChunk('00wb', bytes([0xff, 0xfb, 0x90, 0x00])),
    aviChunk('00wb', bytes([0xff, 0xfb, 0x90, 0x00])),
  ]));
  const body = concat([ascii('AVI '), hdrl, movi]);
  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, body.length, true);
  return concat([ascii('RIFF'), size, body]);
}

function source(data, name) {
  return {
    name,
    size: data.length,
    type: '',
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

(async () => {
  const mkv = source(mkvFixture(), 'fixture.mkv');
  const mkvTracks = await media.probeAudio(mkv);
  assert.strictEqual(mkvTracks.length, 2);
  assert.strictEqual(mkvTracks[0].format, 'aac');
  assert.strictEqual(mkvTracks[0].supported, true);
  assert.strictEqual(mkvTracks[0].channels, 2);
  assert.strictEqual(mkvTracks[1].format, 'opus');

  const aac = await media.extractAudio(mkv, mkvTracks[0]);
  assert.strictEqual(aac.mime, 'audio/aac');
  assert.strictEqual(aac.data[0], 0xff);
  assert.strictEqual(aac.data[1], 0xf1);
  assert.strictEqual(aac.data.length, 4 + 7);

  const opus = await media.extractAudio(mkv, mkvTracks[1]);
  assert.strictEqual(opus.mime, 'audio/ogg');
  assert.strictEqual(String.fromCharCode.apply(null, opus.data.slice(0, 4)), 'OggS');

  const avi = source(aviFixture(), 'fixture.avi');
  const aviTracks = await media.probeAudio(avi);
  assert.strictEqual(aviTracks.length, 1);
  assert.strictEqual(aviTracks[0].format, 'mp3');
  assert.strictEqual(aviTracks[0].channels, 2);
  assert.strictEqual(aviTracks[0].name, 'Commentary');

  const mp3 = await media.extractAudio(avi, aviTracks[0]);
  assert.strictEqual(mp3.mime, 'audio/mpeg');
  assert.strictEqual(mp3.data.length, 8);
  assert.strictEqual(mp3.data[0], 0xff);

  console.log('media tests: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
