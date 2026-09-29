// Encode an AudioBuffer to WAV (16-bit PCM) — universally playable
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;

  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/**
 * Decode any audio file (mp3/wav/m4a/flac) into an AudioBuffer
 * so we can slice + re-encode.
 */
export async function decodeAudioFile(path: string, readFile: (p: string) => Promise<any>): Promise<AudioBuffer> {
  const res = await readFile(path);
  if (!res?.ok) throw new Error(res?.error || 'read failed');
  const bin = atob(res.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(bytes.buffer.slice(0));
  await ctx.close();
  return buf;
}

/**
 * Slice [startSec, endSec] out of an AudioBuffer
 */
export function sliceBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sr = buffer.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(buffer.length, Math.floor(endSec * sr));
  const len = end - start;
  const out = new AudioContext().createBuffer(buffer.numberOfChannels, len, sr);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(start, end));
  }
  return out;
}