/*
 * DePLay media helpers.
 *
 * Pure JavaScript audio extraction for Matroska/WebM and AVI containers.
 * The browser can play many of these files, but not every embedded audio
 * codec, so the player can pull the audio track out and play it in sync with
 * the video element.
 *
 * The module has no dependencies and also works in Node for tests:
 *   const media = require('./app/media.js');
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DePLayMedia = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MAX_SCAN = 512 * 1024 * 1024;
  const ADTS_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

  const CODECS = {
    'A_AAC': { format: 'aac', label: 'AAC', mime: 'audio/aac' },
    'A_AAC/MPEG4/LC': { format: 'aac', label: 'AAC', mime: 'audio/aac' },
    'A_AAC/MPEG4/LC/SBR': { format: 'aac', label: 'HE-AAC', mime: 'audio/aac' },
    'A_AAC/MPEG2/LC': { format: 'aac', label: 'AAC', mime: 'audio/aac' },
    'A_MPEG/L3': { format: 'mp3', label: 'MP3', mime: 'audio/mpeg' },
    'A_MPEG/L2': { format: 'mp2', label: 'MP2', mime: 'audio/mpeg' },
    'A_OPUS': { format: 'opus', label: 'Opus', mime: 'audio/ogg' },
    'A_FLAC': { format: 'flac', label: 'FLAC', mime: 'audio/flac' },
    'A_PCM/INT/LIT': { format: 'pcm', label: 'PCM', mime: 'audio/wav' },
    'A_PCM/INT/BIG': { format: 'pcm', label: 'PCM', mime: 'audio/wav' },
    'A_AC3': { format: 'ac3', label: 'AC-3', mime: 'audio/ac3', supported: false },
    'A_EAC3': { format: 'eac3', label: 'E-AC-3', mime: 'audio/eac3', supported: false },
    'A_DTS': { format: 'dts', label: 'DTS', mime: 'audio/vnd.dts', supported: false },
    'A_TRUEHD': { format: 'truehd', label: 'TrueHD', mime: 'audio/truehd', supported: false },
    'A_VORBIS': { format: 'vorbis', label: 'Vorbis', mime: 'audio/ogg', supported: false }
  };

  // ── Binary helpers ─────────────────────────────────────────
  function ascii(data, offset, length) {
    let text = '';
    for (let i = 0; i < length; i += 1) {
      const value = data[offset + i];
      if (value == null) return text;
      text += String.fromCharCode(value);
    }
    return text;
  }

  function u16be(data, offset) { return (data[offset] << 8) | data[offset + 1]; }
  function u16le(data, offset) { return data[offset] | (data[offset + 1] << 8); }
  function u24be(data, offset) { return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]; }
  function u32be(data, offset) { return ((data[offset] << 24) >>> 0) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3]; }
  function u32le(data, offset) { return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0; }

  function readUint(data, offset, size) {
    let value = 0;
    for (let i = 0; i < size; i += 1) value = value * 256 + data[offset + i];
    return value;
  }

  function readFloat(data, offset, size) {
    const view = new DataView(data.buffer, data.byteOffset + offset, size);
    return size === 4 ? view.getFloat32(0, false) : view.getFloat64(0, false);
  }

  function textOf(data, offset, size) {
    let end = offset + size;
    while (end > offset && data[end - 1] === 0) end -= 1;
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(data.subarray(offset, end)).trim();
    } catch {
      return ascii(data, offset, end - offset).trim();
    }
  }

  function concat(chunks) {
    let total = 0;
    for (let i = 0; i < chunks.length; i += 1) total += chunks[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < chunks.length; i += 1) {
      out.set(chunks[i], offset);
      offset += chunks[i].length;
    }
    return out;
  }

  function detect(file) {
    const name = String((file && file.name) || '').toLowerCase();
    if (/\.(mkv|mka)$/.test(name)) return 'mkv';
    if (/\.(webm|weba)$/.test(name)) return 'mkv';
    if (/\.avi$/.test(name)) return 'avi';
    if (/\.(mp4|m4v|m4a|mov)$/.test(name)) return 'iso';
    return null;
  }

  async function readAll(file) {
    if (file && file.isRemote && file.size > MAX_SCAN) return null;
    if (file && file.size > MAX_SCAN) return null;
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  // ── Matroska / WebM ────────────────────────────────────────
  const ID = {
    EBML: 0x1A45DFA3,
    SEGMENT: 0x18538067,
    INFO: 0x1549A966,
    TIMECODE_SCALE: 0x2AD7B1,
    DURATION: 0x4489,
    TRACKS: 0x1654AE6B,
    TRACK_ENTRY: 0xAE,
    TRACK_NUMBER: 0xD7,
    TRACK_TYPE: 0x83,
    CODEC_ID: 0x86,
    CODEC_PRIVATE: 0x63A2,
    NAME: 0x536E,
    LANGUAGE: 0x22B59C,
    AUDIO: 0xE1,
    SAMPLING_FREQUENCY: 0xB5,
    CHANNELS: 0x9F,
    BIT_DEPTH: 0x6264,
    CLUSTER: 0x1F43B675,
    TIMECODE: 0xE7,
    SIMPLE_BLOCK: 0xA3,
    BLOCK_GROUP: 0xA0,
    BLOCK: 0xA1
  };

  function ebmlVint(data, offset, keepMarker, limit) {
    if (offset >= limit) return null;
    const first = data[offset];
    if (!first) return null;
    let length = 1;
    let mask = 0x80;
    while (length <= 8 && !(first & mask)) {
      mask >>= 1;
      length += 1;
    }
    if (length > 8 || offset + length > limit) return null;
    let value = keepMarker ? first : (first & (mask - 1));
    for (let i = 1; i < length; i += 1) value = value * 256 + data[offset + i];
    const allOnes = Math.pow(2, 7 * length) - 1;
    return { value, length, unknown: !keepMarker && value === allOnes };
  }

  function ebmlChildren(data, start, end) {
    const list = [];
    let offset = start;
    while (offset < end) {
      const id = ebmlVint(data, offset, true, end);
      if (!id) break;
      const size = ebmlVint(data, offset + id.length, false, end);
      if (!size) break;
      const header = id.length + size.length;
      const payload = offset + header;
      let length = size.value;
      if (size.unknown || payload + length > end) length = end - payload;
      list.push({ id: id.value, start: payload, size: length, raw: offset, header });
      offset = payload + length;
    }
    return list;
  }

  function ebmlChild(data, element, id) {
    const children = ebmlChildren(data, element.start, element.start + element.size);
    for (let i = 0; i < children.length; i += 1) {
      if (children[i].id === id) return children[i];
    }
    return null;
  }

  function ebmlUint(data, element) {
    return element ? readUint(data, element.start, element.size) : 0;
  }

  function parseMkvTracks(data) {
    let segment = null;
    const top = ebmlChildren(data, 0, data.length);
    for (let i = 0; i < top.length; i += 1) {
      if (top[i].id === ID.SEGMENT) { segment = top[i]; break; }
    }
    if (!segment) return null;

    const children = ebmlChildren(data, segment.start, segment.start + segment.size);
    let scale = 1000000;
    const tracks = [];
    let tracksElement = null;

    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.id === ID.INFO) {
        const info = ebmlChildren(data, child.start, child.start + child.size);
        for (let j = 0; j < info.length; j += 1) {
          if (info[j].id === ID.TIMECODE_SCALE) scale = ebmlUint(data, info[j]) || scale;
        }
      } else if (child.id === ID.TRACKS) {
        tracksElement = child;
      }
    }
    if (!tracksElement) return null;

    const entries = ebmlChildren(data, tracksElement.start, tracksElement.start + tracksElement.size);
    for (let i = 0; i < entries.length; i += 1) {
      if (entries[i].id !== ID.TRACK_ENTRY) continue;
      const fields = ebmlChildren(data, entries[i].start, entries[i].start + entries[i].size);
      const track = { number: 0, type: 0, codec: '', codecPrivate: null, name: '', language: '' };
      for (let j = 0; j < fields.length; j += 1) {
        const field = fields[j];
        if (field.id === ID.TRACK_NUMBER) track.number = ebmlUint(data, field);
        else if (field.id === ID.TRACK_TYPE) track.type = ebmlUint(data, field);
        else if (field.id === ID.CODEC_ID) track.codec = textOf(data, field.start, field.size);
        else if (field.id === ID.CODEC_PRIVATE) track.codecPrivate = data.slice(field.start, field.start + field.size);
        else if (field.id === ID.NAME) track.name = textOf(data, field.start, field.size);
        else if (field.id === ID.LANGUAGE) track.language = textOf(data, field.start, field.size);
        else if (field.id === ID.AUDIO) {
          const audio = ebmlChildren(data, field.start, field.start + field.size);
          for (let k = 0; k < audio.length; k += 1) {
            if (audio[k].id === ID.SAMPLING_FREQUENCY && audio[k].size > 0) track.sampleRate = Math.round(readFloat(data, audio[k].start, audio[k].size));
            else if (audio[k].id === ID.CHANNELS) track.channels = ebmlUint(data, audio[k]);
            else if (audio[k].id === ID.BIT_DEPTH) track.bitDepth = ebmlUint(data, audio[k]);
          }
        }
      }
      tracks.push(track);
    }

    return { scale, tracks, segment };
  }

  function readBlockFrames(data, element) {
    let offset = element.start;
    const end = element.start + element.size;
    const trackVint = ebmlVint(data, offset, false, end);
    if (!trackVint) return null;
    offset += trackVint.length;
    if (offset + 3 > end) return null;
    const relative = (data[offset] << 8) | data[offset + 1];
    const signed = relative & 0x8000 ? relative - 0x10000 : relative;
    const flags = data[offset + 2];
    offset += 3;

    const lacing = (flags & 0x06) >> 1;
    const frames = [];
    if (lacing === 0) {
      frames.push(data.slice(offset, end));
    } else {
      let count = 0;
      const sizes = [];
      if (lacing === 1) { // Xiph
        count = data[offset] + 1;
        offset += 1;
        let total = 0;
        for (let i = 0; i < count - 1; i += 1) {
          let size = 0;
          let byte;
          do {
            byte = data[offset];
            offset += 1;
            size += byte;
          } while (byte === 255 && offset < end);
          sizes.push(size);
          total += size;
        }
        sizes.push(end - offset - total);
      } else if (lacing === 3) { // EBML lacing
        count = data[offset] + 1;
        offset += 1;
        let total = 0;
        let previous = 0;
        for (let i = 0; i < count - 1; i += 1) {
          const vint = ebmlVint(data, offset, false, end);
          if (!vint) return null;
          offset += vint.length;
          const signedSize = vint.value & (1 << (7 * vint.length - 1)) ? vint.value - Math.pow(2, 7 * vint.length) : vint.value;
          const size = i === 0 ? signedSize : previous + signedSize;
          previous = size;
          sizes.push(size);
          total += size;
        }
        sizes.push(end - offset - total);
      } else { // fixed
        count = data[offset] + 1;
        offset += 1;
        const size = Math.floor((end - offset) / count);
        for (let i = 0; i < count; i += 1) sizes.push(size);
      }
      let position = offset;
      for (let i = 0; i < sizes.length; i += 1) {
        const size = Math.max(0, sizes[i]);
        frames.push(data.slice(position, Math.min(end, position + size)));
        position += size;
      }
    }
    return { track: trackVint.value, time: signed, frames };
  }

  function collectMkvBlocks(data, info) {
    const blocks = [];
    const segment = info.segment;
    const children = ebmlChildren(data, segment.start, segment.start + segment.size);
    for (let i = 0; i < children.length; i += 1) {
      const cluster = children[i];
      if (cluster.id !== ID.CLUSTER) continue;
      let timecode = 0;
      const elements = ebmlChildren(data, cluster.start, cluster.start + cluster.size);
      for (let j = 0; j < elements.length; j += 1) {
        const element = elements[j];
        if (element.id === ID.TIMECODE) {
          timecode = ebmlUint(data, element);
        } else if (element.id === ID.SIMPLE_BLOCK) {
          const block = readBlockFrames(data, element);
          if (block) {
            block.absolute = timecode + block.time;
            blocks.push(block);
          }
        } else if (element.id === ID.BLOCK_GROUP) {
          const group = ebmlChildren(data, element.start, element.start + element.size);
          for (let k = 0; k < group.length; k += 1) {
            if (group[k].id !== ID.BLOCK) continue;
            const block = readBlockFrames(data, group[k]);
            if (block) {
              block.absolute = timecode + block.time;
              blocks.push(block);
            }
          }
        }
      }
    }
    return blocks;
  }

  function parseAudioSpecificConfig(bytes) {
    if (!bytes || bytes.length < 2) return { sampleRate: 48000, channels: 2, objectType: 2 };
    const objectType = (bytes[0] >> 3) & 0x1f;
    let frequency = ((bytes[0] & 0x07) << 1) | (bytes[1] >> 7);
    if (frequency === 15 && bytes.length >= 5) {
      frequency = ((bytes[1] & 0x7f) << 17) | (bytes[2] << 9) | (bytes[3] << 1) | (bytes[4] >> 7);
      return {
        sampleRate: frequency,
        channels: (bytes[4] >> 3) & 0x0f,
        objectType: (bytes[5] >> 3) & 0x1f
      };
    }
    return {
      sampleRate: ADTS_RATES[frequency] || 48000,
      channels: (bytes[1] >> 3) & 0x0f,
      objectType
    };
  }

  function adtsFrame(payload, objectType, frequencyIndex, channels) {
    const frameLength = payload.length + 7;
    if (frameLength > 8191) return null;
    const header = new Uint8Array(7);
    const profile = Math.max(0, Math.min(3, objectType - 1));
    header[0] = 0xff;
    header[1] = 0xf1;
    header[2] = ((profile & 3) << 6) | ((frequencyIndex & 15) << 2) | ((channels >> 2) & 1);
    header[3] = ((channels & 3) << 6) | ((frameLength >> 11) & 3);
    header[4] = (frameLength >> 3) & 0xff;
    header[5] = ((frameLength & 7) << 5) | 0x1f;
    header[6] = 0xfc;
    return { header, payload };
  }

  // ── Ogg / Opus ─────────────────────────────────────────────
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let value = i << 24;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 0x80000000) ? ((value << 1) ^ 0x04c11db7) : (value << 1);
      }
      table[i] = value >>> 0;
    }
    return table;
  })();

  function oggCrc(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i += 1) {
      crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ data[i]) & 0xff]) >>> 0;
    }
    return crc >>> 0;
  }

  function writeU64le(target, offset, value) {
    let rest = Math.max(0, Math.floor(value));
    for (let i = 0; i < 8; i += 1) {
      target[offset + i] = rest % 256;
      rest = Math.floor(rest / 256);
    }
  }

  function oggPage(packets, headerType, granule, serial, sequence) {
    const segments = [];
    let payloadLength = 0;
    for (let i = 0; i < packets.length; i += 1) {
      let left = packets[i].length;
      do {
        const take = Math.min(255, left);
        segments.push(take);
        left -= take;
      } while (left > 0 || (packets[i].length === 0));
      payloadLength += packets[i].length;
    }
    if (segments.length > 255) return null;

    const page = new Uint8Array(27 + segments.length + payloadLength);
    page.set([0x4f, 0x67, 0x67, 0x53, 0x00, headerType], 0);
    writeU64le(page, 6, granule);
    page[14] = serial & 0xff;
    page[15] = (serial >> 8) & 0xff;
    page[16] = (serial >> 16) & 0xff;
    page[17] = (serial >> 24) & 0xff;
    page[18] = sequence & 0xff;
    page[19] = (sequence >> 8) & 0xff;
    page[20] = (sequence >> 16) & 0xff;
    page[21] = (sequence >> 24) & 0xff;
    page[26] = segments.length;
    let offset = 27 + segments.length;
    for (let i = 0; i < segments.length; i += 1) page[27 + i] = segments[i];
    for (let i = 0; i < packets.length; i += 1) {
      page.set(packets[i], offset);
      offset += packets[i].length;
    }
    const crc = oggCrc(page);
    page[22] = crc & 0xff;
    page[23] = (crc >> 8) & 0xff;
    page[24] = (crc >> 16) & 0xff;
    page[25] = (crc >> 24) & 0xff;
    return page;
  }

  function opusHead(codecPrivate, channels, sampleRate) {
    const privateBytes = codecPrivate || new Uint8Array(0);
    if (privateBytes.length >= 19 && ascii(privateBytes, 0, 8) === 'OpusHead') return privateBytes;
    const head = new Uint8Array(19);
    head.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0); // OpusHead
    head[8] = 1;
    head[9] = Math.max(1, Math.min(255, channels || 2));
    // Pre-skip from CodecPrivate when it contains only the trailing fields.
    const preSkip = privateBytes.length >= 2 ? u16le(privateBytes, 0) : 0;
    head[10] = preSkip & 0xff;
    head[11] = (preSkip >> 8) & 0xff;
    const rate = sampleRate || 48000;
    head[12] = rate & 0xff;
    head[13] = (rate >> 8) & 0xff;
    head[14] = (rate >> 16) & 0xff;
    head[15] = (rate >> 24) & 0xff;
    return head;
  }

  function opusTags() {
    const vendor = new TextEncoder().encode('DePLay');
    const tag = new Uint8Array(8 + 4 + vendor.length + 4);
    tag.set([0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73], 0); // OpusTags
    tag[8] = vendor.length & 0xff;
    tag[9] = (vendor.length >> 8) & 0xff;
    tag[10] = (vendor.length >> 16) & 0xff;
    tag[11] = (vendor.length >> 24) & 0xff;
    tag.set(vendor, 12);
    return tag;
  }

  function opusPacketSamples(packet) {
    if (!packet || !packet.length) return 0;
    const toc = packet[0];
    const config = toc >> 3;
    let frameMs;
    if (config < 12) frameMs = [10, 20, 40, 60][config & 3];
    else if (config < 16) frameMs = [10, 20][config & 1];
    else frameMs = [2.5, 5, 10, 20][config & 3];
    let frames = 1;
    const code = toc & 3;
    if (code === 1 || code === 2) frames = 2;
    else if (code === 3) frames = packet.length > 1 ? (packet[1] & 0x3f) : 1;
    return Math.round(frameMs * 48 * frames);
  }

  function buildOpusOgg(track, packets) {
    const preSkip = track.codecPrivate && track.codecPrivate.length >= 19 && ascii(track.codecPrivate, 0, 8) === 'OpusHead'
      ? u16le(track.codecPrivate, 10)
      : 312;
    const pages = [];
    let sequence = 0;
    let granule = 0;
    pages.push(oggPage([opusHead(track.codecPrivate, track.channels, track.sampleRate)], 0x02, 0, 0x4f707573, sequence));
    sequence += 1;
    pages.push(oggPage([opusTags()], 0x00, 0, 0x4f707573, sequence));
    sequence += 1;
    let batch = [];
    for (let i = 0; i < packets.length; i += 1) {
      batch.push(packets[i]);
      granule += opusPacketSamples(packets[i]);
      if (batch.length >= 32) {
        pages.push(oggPage(batch, 0x00, granule + preSkip, 0x4f707573, sequence));
        sequence += 1;
        batch = [];
      }
    }
    if (batch.length) pages.push(oggPage(batch, 0x04, granule + preSkip, 0x4f707573, sequence));
    return concat(pages.filter(Boolean));
  }

  // ── WAV ────────────────────────────────────────────────────
  function wavFile(pcm, channels, sampleRate, bits) {
    const blockAlign = Math.max(1, channels * Math.max(8, bits) / 8);
    const header = new Uint8Array(44);
    header.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    const riffSize = 36 + pcm.length;
    header[4] = riffSize & 0xff;
    header[5] = (riffSize >> 8) & 0xff;
    header[6] = (riffSize >> 16) & 0xff;
    header[7] = (riffSize >> 24) & 0xff;
    header.set([0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20], 8); // WAVEfmt
    header[16] = 16;
    header[20] = 1;
    header[22] = channels & 0xff;
    header[23] = (channels >> 8) & 0xff;
    header[24] = sampleRate & 0xff;
    header[25] = (sampleRate >> 8) & 0xff;
    header[26] = (sampleRate >> 16) & 0xff;
    header[27] = (sampleRate >> 24) & 0xff;
    const byteRate = sampleRate * blockAlign;
    header[28] = byteRate & 0xff;
    header[29] = (byteRate >> 8) & 0xff;
    header[30] = (byteRate >> 16) & 0xff;
    header[31] = (byteRate >> 24) & 0xff;
    header[32] = blockAlign & 0xff;
    header[33] = (blockAlign >> 8) & 0xff;
    header[34] = bits & 0xff;
    header[35] = (bits >> 8) & 0xff;
    header.set([0x64, 0x61, 0x74, 0x61], 36); // data
    header[40] = pcm.length & 0xff;
    header[41] = (pcm.length >> 8) & 0xff;
    header[42] = (pcm.length >> 16) & 0xff;
    header[43] = (pcm.length >> 24) & 0xff;
    return concat([header, pcm]);
  }

  // ── Matroska extraction ────────────────────────────────────
  function mkvTrackInfo(trackNumber, data) {
    const parsed = parseMkvTracks(data);
    if (!parsed) return null;
    for (let i = 0; i < parsed.tracks.length; i += 1) {
      if (parsed.tracks[i].number === trackNumber) {
        parsed.track = parsed.tracks[i];
        return parsed;
      }
    }
    return null;
  }

  function probeMkv(data) {
    const parsed = parseMkvTracks(data);
    if (!parsed) return null;
    const result = [];
    let index = 0;
    for (let i = 0; i < parsed.tracks.length; i += 1) {
      const track = parsed.tracks[i];
      if (track.type !== 2) continue;
      index += 1;
      const codec = CODECS[track.codec] || null;
      const asc = track.codec === 'A_AAC' ? parseAudioSpecificConfig(track.codecPrivate) : null;
      result.push({
        id: `mkv-${track.number}`,
        kind: 'embedded',
        container: 'mkv',
        trackNumber: track.number,
        index,
        codec: track.codec,
        codecLabel: codec ? codec.label : (track.codec || 'AUDIO').replace(/^A_/, ''),
        format: codec ? codec.format : 'unknown',
        mime: codec ? codec.mime : '',
        supported: Boolean(codec && codec.supported !== false),
        reason: codec ? (codec.supported === false ? 'codec' : '') : 'codec',
        language: track.language || 'und',
        name: track.name || '',
        customName: track.name || '',
        channels: track.channels || (asc && asc.channels) || 2,
        sampleRate: track.sampleRate || (asc && asc.sampleRate) || 48000,
        bitDepth: track.bitDepth || 16,
        timecodeScale: parsed.scale
      });
    }
    return result;
  }

  function extractMkv(data, source) {
    const parsed = mkvTrackInfo(source.trackNumber, data);
    if (!parsed) throw new Error('track-not-found');
    const track = parsed.track;
    const blocks = collectMkvBlocks(data, parsed).filter((block) => block.track === track.number);
    if (!blocks.length) throw new Error('no-samples');
    const scale = parsed.scale || 1000000;
    const offset = Math.max(0, (blocks[0].absolute * scale) / 1e9);
    const packets = [];
    for (let i = 0; i < blocks.length; i += 1) {
      for (let j = 0; j < blocks[i].frames.length; j += 1) {
        if (blocks[i].frames[j].length) packets.push(blocks[i].frames[j]);
      }
    }
    if (!packets.length) throw new Error('no-samples');

    const codec = CODECS[track.codec];
    if (!codec || codec.supported === false) throw new Error('unsupported-codec');

    if (codec.format === 'aac') {
      const asc = parseAudioSpecificConfig(track.codecPrivate);
      const frequencyIndex = ADTS_RATES.indexOf(asc.sampleRate);
      const channels = Math.max(1, Math.min(7, asc.channels || source.channels || 2));
      const frames = [];
      for (let i = 0; i < packets.length; i += 1) {
        const built = adtsFrame(packets[i], asc.objectType || 2, frequencyIndex >= 0 ? frequencyIndex : 4, channels);
        if (built) frames.push(concat([built.header, built.payload]));
      }
      return { data: concat(frames), mime: 'audio/aac', offset };
    }
    if (codec.format === 'mp3' || codec.format === 'mp2') {
      return { data: concat(packets), mime: 'audio/mpeg', offset };
    }
    if (codec.format === 'opus') {
      return { data: buildOpusOgg({ codecPrivate: track.codecPrivate, channels: source.channels, sampleRate: source.sampleRate }, packets), mime: 'audio/ogg', offset };
    }
    if (codec.format === 'flac') {
      let header = track.codecPrivate || new Uint8Array(0);
      if (ascii(header, 0, 4) !== 'fLaC') {
        const streamInfo = header.length >= 34 ? header.subarray(0, 34) : new Uint8Array(0);
        const built = new Uint8Array(4 + 4 + streamInfo.length);
        built.set([0x66, 0x4c, 0x61, 0x43], 0); // fLaC
        built[4] = 0x80;
        built[5] = 0x00;
        built[6] = 0x00;
        built[7] = streamInfo.length;
        built.set(streamInfo, 8);
        header = built;
      }
      return { data: concat([header, concat(packets)]), mime: 'audio/flac', offset };
    }
    if (codec.format === 'pcm') {
      const channels = Math.max(1, source.channels || 2);
      const bits = Math.max(8, source.bitDepth || 16);
      return { data: wavFile(concat(packets), channels, source.sampleRate || 48000, bits), mime: 'audio/wav', offset };
    }
    throw new Error('unsupported-codec');
  }

  // ── AVI ────────────────────────────────────────────────────
  const WAVE_FORMATS = {
    0x0001: { format: 'pcm', label: 'PCM', mime: 'audio/wav' },
    0x0003: { format: 'pcm', label: 'PCM', mime: 'audio/wav' },
    0x0050: { format: 'mp2', label: 'MP2', mime: 'audio/mpeg' },
    0x0055: { format: 'mp3', label: 'MP3', mime: 'audio/mpeg' },
    0x2000: { format: 'ac3', label: 'AC-3', mime: 'audio/ac3', supported: false },
    0x2001: { format: 'dts', label: 'DTS', mime: 'audio/vnd.dts', supported: false },
    0x0161: { format: 'wma', label: 'WMA', mime: 'audio/x-ms-wma', supported: false },
    0x0162: { format: 'wma', label: 'WMA Pro', mime: 'audio/x-ms-wma', supported: false }
  };

  function riffChunks(data, start, end) {
    const chunks = [];
    let offset = start;
    while (offset + 8 <= end) {
      const id = ascii(data, offset, 4);
      const size = u32le(data, offset + 4);
      const payload = offset + 8;
      const next = payload + size + (size & 1);
      chunks.push({ id, start: payload, size: Math.min(size, Math.max(0, end - payload)), raw: offset });
      if (next <= offset) break;
      offset = next;
    }
    return chunks;
  }

  function parseAvi(data) {
    if (ascii(data, 0, 4) !== 'RIFF' || ascii(data, 8, 4) !== 'AVI ') return null;
    const riffEnd = Math.min(data.length, u32le(data, 4) + 8);
    const top = riffChunks(data, 12, riffEnd);
    let movi = null;
    const streams = [];

    for (let i = 0; i < top.length; i += 1) {
      if (top[i].id === 'LIST' && ascii(data, top[i].start, 4) === 'movi') movi = top[i];
      if (top[i].id !== 'LIST' || ascii(data, top[i].start, 4) !== 'hdrl') continue;
      const hdrl = riffChunks(data, top[i].start + 4, top[i].start + top[i].size);
      for (let j = 0; j < hdrl.length; j += 1) {
        if (hdrl[j].id !== 'LIST' || ascii(data, hdrl[j].start, 4) !== 'strl') continue;
        const strl = riffChunks(data, hdrl[j].start + 4, hdrl[j].start + hdrl[j].size);
        const stream = { index: streams.length, type: '', handler: '', scale: 1, rate: 1, name: '' };
        for (let k = 0; k < strl.length; k += 1) {
          const chunk = strl[k];
          if (chunk.id === 'strh' && chunk.size >= 8) {
            stream.type = ascii(data, chunk.start, 4);
            stream.handler = ascii(data, chunk.start + 4, 4);
            if (chunk.size >= 28) {
              stream.scale = u32le(data, chunk.start + 20) || 1;
              stream.rate = u32le(data, chunk.start + 24) || 1;
            }
          } else if (chunk.id === 'strf' && chunk.size >= 16) {
            stream.formatTag = u16le(data, chunk.start);
            stream.channels = u16le(data, chunk.start + 2);
            stream.sampleRate = u32le(data, chunk.start + 4);
            stream.byteRate = u32le(data, chunk.start + 8);
            stream.blockAlign = u16le(data, chunk.start + 12);
            stream.bits = u16le(data, chunk.start + 14);
          } else if (chunk.id === 'strn') {
            stream.name = textOf(data, chunk.start, chunk.size);
          }
        }
        streams.push(stream);
      }
    }
    if (!movi) return { streams, movi: null, chunks: [] };
    const moviChunks = riffChunks(data, movi.start + 4, movi.start + movi.size);
    return { streams, movi, chunks: moviChunks };
  }

  function aviAudioStreams(data) {
    const parsed = parseAvi(data);
    if (!parsed) return null;
    const result = [];
    let index = 0;
    for (let i = 0; i < parsed.streams.length; i += 1) {
      const stream = parsed.streams[i];
      if (stream.type !== 'auds') continue;
      index += 1;
      const wave = WAVE_FORMATS[stream.formatTag] || null;
      stream.audioIndex = index;
      stream.chunkId = String(i).padStart(2, '0') + 'wb';
      result.push({
        id: `avi-${i}`,
        kind: 'embedded',
        container: 'avi',
        streamIndex: i,
        chunkId: stream.chunkId,
        index,
        codec: 'WAVE_' + (stream.formatTag || 0),
        codecLabel: wave ? wave.label : 'AUDIO',
        format: wave ? wave.format : 'unknown',
        mime: wave ? wave.mime : '',
        supported: Boolean(wave && wave.supported !== false),
        reason: wave ? (wave.supported === false ? 'codec' : '') : 'codec',
        language: 'und',
        name: stream.name || '',
        customName: stream.name || '',
        channels: stream.channels || 2,
        sampleRate: stream.sampleRate || 48000,
        bitDepth: stream.bits || 16,
        blockAlign: stream.blockAlign || 0
      });
    }
    return { streams: result, all: parsed };
  }

  function probeAvi(data) {
    const parsed = aviAudioStreams(data);
    return parsed ? parsed.streams : null;
  }

  function extractAvi(data, source) {
    const parsed = aviAudioStreams(data);
    if (!parsed) throw new Error('parse');
    const chunks = [];
    for (let i = 0; i < parsed.all.chunks.length; i += 1) {
      const chunk = parsed.all.chunks[i];
      if (chunk.id !== source.chunkId || !chunk.size) continue;
      chunks.push(data.subarray(chunk.start, chunk.start + chunk.size));
    }
    if (!chunks.length) throw new Error('no-samples');
    const codec = WAVE_FORMATS[Number(String(source.codec).replace('WAVE_', ''))] || null;
    if (!codec || codec.supported === false) throw new Error('unsupported-codec');
    const joined = concat(chunks);
    if (codec.format === 'mp3' || codec.format === 'mp2') {
      return { data: joined, mime: 'audio/mpeg', offset: 0 };
    }
    if (codec.format === 'pcm') {
      return {
        data: wavFile(joined, source.channels || 2, source.sampleRate || 48000, source.bitDepth || 16),
        mime: 'audio/wav',
        offset: 0
      };
    }
    throw new Error('unsupported-codec');
  }

  // ── ISO BMFF (MP4 / MOV) audio discovery ──────────────────
  // MP4Box only tags sample entries it recognises as audio. QuickTime
  // uncompressed PCM entries (sowt/twos/lpcm/in24/in32/fl32/fl64/raw/ipcm)
  // and some AC-3 variants are parsed as generic sample entries, so they
  // arrive as "metadata" tracks and would be invisible to the player.
  // This reads the media handler plus the raw AudioSampleEntry header and
  // returns a normalised audio track list.
  async function readAudioSampleEntry(trak, file) {
    if (!trak || !trak.mdia || !trak.mdia.hdlr) return null;
    if (trak.mdia.hdlr.handler !== 'soun') return null;
    const mdia = trak.mdia;
    const stsd = mdia.minf && mdia.minf.stbl && mdia.minf.stbl.stsd;
    const entry = stsd && stsd.entries && stsd.entries[0];
    if (!entry) return null;

    const mdhdRate = mdia.mdhd && mdia.mdhd.timescale ? mdia.mdhd.timescale : 0;
    const audio = {
      sample_rate: Number(entry.samplerate) || Number(entry.sample_rate) || mdhdRate || 48000,
      channel_count: Number(entry.channel_count) || 0,
      sample_size: Number(entry.samplesize) || Number(entry.sample_size) || 0
    };

    if ((!audio.channel_count || !audio.sample_size) && file && typeof file.slice === 'function' &&
        Number.isFinite(entry.start) && Number.isFinite(entry.size)) {
      // hdr_size covers the 8-byte box header and the 8-byte sample entry
      // header (6 reserved bytes + data_reference_index).
      const header = Number(entry.hdr_size) || 16;
      const length = Math.min(entry.size - header, 56);
      if (length >= 20) {
        try {
          const buffer = await file.slice(entry.start + header, entry.start + header + length).arrayBuffer();
          const view = new DataView(buffer);
          const version = view.getUint16(0);
          if (version === 2 && length >= 44) {
            audio.sample_rate = view.getFloat64(24) || audio.sample_rate;
            audio.channel_count = view.getUint32(32) || audio.channel_count;
            audio.sample_size = view.getUint32(40) || audio.sample_size;
          } else {
            audio.channel_count = view.getUint16(8) || audio.channel_count;
            audio.sample_size = view.getUint16(10) || audio.sample_size;
            const fixed = view.getUint32(16);
            if (fixed) audio.sample_rate = fixed >>> 16;
          }
        } catch { /* keep the header values */ }
      }
    }

    return {
      codec: entry.type || '',
      audio: {
        sample_rate: audio.sample_rate > 0 ? audio.sample_rate : 48000,
        channel_count: Math.max(1, Math.min(8, audio.channel_count || 2)),
        sample_size: audio.sample_size || 16
      }
    };
  }

  async function mp4AudioTracks(mp4, file, info) {
    const tracks = info && Array.isArray(info.tracks) ? info.tracks : [];
    const byId = {};
    if (mp4 && mp4.moov && mp4.moov.traks) {
      for (const trak of mp4.moov.traks) {
        const id = trak.tkhd && trak.tkhd.track_id;
        if (id) byId[id] = trak;
      }
    }
    const out = [];
    for (const item of tracks) {
      if (item.audio) { out.push(item); continue; }
      const extra = await readAudioSampleEntry(byId[item.id], file);
      if (!extra) continue;
      out.push({
        id: item.id,
        codec: item.codec || extra.codec,
        language: item.language || 'und',
        name: item.name || '',
        nb_samples: item.nb_samples || 0,
        audio: extra.audio
      });
    }
    return out;
  }

  // ── Public API ─────────────────────────────────────────────
  async function probeAudio(file) {
    const kind = detect(file);
    if (kind !== 'mkv' && kind !== 'avi') return [];
    const data = await readAll(file);
    if (!data) return [];
    const tracks = kind === 'mkv' ? probeMkv(data) : probeAvi(data);
    return tracks || [];
  }

  async function extractAudio(file, source) {
    const data = await readAll(file);
    if (!data) throw new Error('too-large');
    if (source.container === 'mkv') return extractMkv(data, source);
    if (source.container === 'avi') return extractAvi(data, source);
    throw new Error('unsupported-container');
  }

  return {
    detect,
    probeAudio,
    extractAudio,
    mp4AudioTracks,
    _internals: {
      parseMkvTracks,
      collectMkvBlocks,
      parseAvi,
      oggPage,
      wavFile,
      opusPacketSamples,
      parseAudioSpecificConfig
    }
  };
});
