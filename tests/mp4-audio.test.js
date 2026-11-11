'use strict';

/*
 * Regression test for MOV/MP4 multi-track audio discovery.
 *
 * MP4Box classifies QuickTime uncompressed PCM tracks (sowt/twos/lpcm/...)
 * as "metadata", so a simple `info.tracks.filter(t => t.audio)` hides them.
 * app/media.js recovers the real audio parameters from the sample entry;
 * this test checks that against real FFmpeg-generated fixtures.
 *
 * The fixtures are not committed (see .gitignore). Generate them with
 *   python tests/fixtures/generate-media.py
 * The test is skipped when they are missing.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const media = require('../app/media.js');

let MP4Box;
try {
  MP4Box = require('../vendor/mp4box.all.min.js');
} catch (error) {
  console.log('mp4box not available, skipping: ' + error.message);
  process.exit(0);
}
// Parsing a QuickTime PCM sample entry produces expected "unknown child box"
// warnings; hide them so the test output stays readable.
if (MP4Box.Log && MP4Box.Log.setLogLevel) MP4Box.Log.setLogLevel(MP4Box.Log.error);

const fixtures = path.join(__dirname, 'fixtures', 'generated');
const required = [
  'sample_video.mov',
  'multi_audio_4x_aac.mov',
  'multi_audio_4x_pcm.mov',
  'multi_audio_4x_mp4.mp4',
];

const missing = required.filter((name) => !fs.existsSync(path.join(fixtures, name)));
if (missing.length) {
  console.log('fixtures not generated, skipping: ' + missing.join(', '));
  console.log('run: python tests/fixtures/generate-media.py');
  process.exit(0);
}

function fileLike(buffer) {
  return {
    name: 'fixture',
    size: buffer.length,
    slice(start, end) {
      return {
        arrayBuffer: async () => {
          const from = buffer.byteOffset + start;
          const to = buffer.byteOffset + Math.min(end, buffer.length);
          return buffer.buffer.slice(from, to);
        },
      };
    },
  };
}

function parse(buffer) {
  return new Promise((resolve, reject) => {
    const mp4 = MP4Box.createFile(false);
    mp4.onReady = (info) => resolve({ mp4, info });
    mp4.onError = (error) => reject(error instanceof Error ? error : new Error(String(error)));
    const copy = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    copy.fileStart = 0;
    mp4.appendBuffer(copy);
    mp4.flush();
  });
}

async function tracksOf(name) {
  const buffer = fs.readFileSync(path.join(fixtures, name));
  const file = fileLike(buffer);
  const { mp4, info } = await parse(buffer);
  const tracks = await media.mp4AudioTracks(mp4, file, info);
  return { mp4, info, tracks };
}

(async () => {
  // A single-track MOV still yields exactly one audio track.
  {
    const { tracks } = await tracksOf('sample_video.mov');
    assert.strictEqual(tracks.length, 1, 'sample_video.mov should have one audio track');
    assert.ok(tracks[0].audio, 'sample_video.mov track should carry audio parameters');
  }

  // AAC in MOV: four tracks, all classified as audio by MP4Box.
  {
    const { tracks } = await tracksOf('multi_audio_4x_aac.mov');
    assert.strictEqual(tracks.length, 4, 'multi_audio_4x_aac.mov should have four audio tracks');
    tracks.forEach((track) => {
      assert.ok(/^mp4a/.test(track.codec), 'unexpected AAC codec: ' + track.codec);
      assert.ok(track.audio && track.audio.sample_rate > 0, 'AAC track is missing sample rate');
    });
  }

  // Uncompressed PCM in MOV: the regression this test exists for.
  {
    const { tracks } = await tracksOf('multi_audio_4x_pcm.mov');
    assert.strictEqual(
      tracks.length,
      4,
      'multi_audio_4x_pcm.mov should expose four PCM audio tracks (MP4Box reports them as metadata)'
    );
    tracks.forEach((track) => {
      assert.strictEqual(track.codec, 'sowt', 'unexpected PCM codec: ' + track.codec);
      assert.ok(track.audio, 'PCM track is missing audio parameters');
      assert.strictEqual(track.audio.channel_count, 1, 'fixture PCM tracks are mono');
      assert.strictEqual(track.audio.sample_rate, 44100, 'fixture PCM tracks are 44.1 kHz');
      assert.strictEqual(track.audio.sample_size, 16, 'fixture PCM tracks are 16-bit');
    });
  }

  // MP4 (already working before the fix) must keep working.
  {
    const { tracks } = await tracksOf('multi_audio_4x_mp4.mp4');
    assert.strictEqual(tracks.length, 4, 'multi_audio_4x_mp4.mp4 should have four audio tracks');
    tracks.forEach((track) => {
      assert.ok(/^mp4a/.test(track.codec), 'unexpected AAC codec: ' + track.codec);
    });
  }

  // Without raw file access the header defaults are used, but the tracks must
  // still be discovered (handler-based classification does not need bytes).
  {
    const { mp4, info } = await tracksOf('multi_audio_4x_pcm.mov');
    const tracks = await media.mp4AudioTracks(mp4, null, info);
    assert.strictEqual(tracks.length, 4, 'PCM tracks should still be discovered without raw bytes');
    tracks.forEach((track) => {
      assert.strictEqual(track.audio.sample_rate, 44100, 'mdhd timescale should be used as fallback');
    });
  }

  console.log('mp4/mov audio tests: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
