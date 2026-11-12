import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const duration = 0.85;
const totalSamples = Math.floor(sampleRate * duration);
const pcm = Buffer.alloc(totalSamples * 2);

for (let i = 0; i < totalSamples; i += 1) {
  const t = i / sampleRate;
  let envelope = 0;
  let frequency = 880;

  if (t < 0.05) {
    envelope = t / 0.05;
    frequency = 880;
  } else if (t < 0.28) {
    envelope = 0.75;
    frequency = 880;
  } else if (t < 0.36) {
    envelope = 0;
  } else if (t < 0.41) {
    envelope = (t - 0.36) / 0.05;
    frequency = 1174;
  } else if (t < 0.62) {
    envelope = 0.7;
    frequency = 1174;
  } else if (t < 0.7) {
    envelope = 0;
  } else if (t < 0.75) {
    envelope = (t - 0.7) / 0.05;
    frequency = 1568;
  } else if (t < 0.82) {
    envelope = 0.55;
    frequency = 1568;
  } else {
    envelope = Math.max(0, (duration - t) / 0.03);
    frequency = 1568;
  }

  const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.32;
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const outDir = path.resolve('android/app/src/main/res/raw');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'rest.wav'), Buffer.concat([header, pcm]));
console.log('generated android/app/src/main/res/raw/rest.wav');
