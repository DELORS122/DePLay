'use strict';
const fs = require('fs');
const media = require('../app/media.js');

(async () => {
  for (const path of process.argv.slice(2)) {
    const buffer = fs.readFileSync(path);
    const file = {
      name: path,
      size: buffer.length,
      type: '',
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    };
    const tracks = await media.probeAudio(file);
    console.log(path, '=>', tracks.length,
      tracks.map((track) => `${track.codecLabel}:${track.channels}ch/${track.sampleRate}`).join(', '));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
