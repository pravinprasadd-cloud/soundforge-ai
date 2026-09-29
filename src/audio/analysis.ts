export function estimateBPM(energyHistory: number[]): number {
  if (energyHistory.length < 60) return 0;
  let peaks = 0;
  for (let i = 2; i < energyHistory.length - 2; i++) {
    if (
      energyHistory[i] > energyHistory[i - 1] &&
      energyHistory[i] > energyHistory[i + 1] &&
      energyHistory[i] > 0.4
    ) peaks++;
  }
  const seconds = energyHistory.length / 60;
  return Math.round((peaks / seconds) * 60);
}

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function estimateKey(chroma: number[]): string {
  const max = chroma.indexOf(Math.max(...chroma));
  return KEY_NAMES[max] || 'C';
}