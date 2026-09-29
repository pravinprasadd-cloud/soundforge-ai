export const BANDS = [20, 40, 80, 160, 320, 640, 1250, 2500, 5000, 10000, 20000];

export const PRESETS: Record<string, number[]> = {
  Flat:                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bose Signature':        [4, 4, 3, 2, 1, 0, 0, 1, 1, 2, 3],
  'Marshall Vintage':      [2, 3, 4, 5, 5, 4, 3, 4, 3, 2, 1],
  'Sonos Reference':       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Deep Bass':             [7, 6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  Podcast:                 [-3, -2, 0, 1, 3, 4, 4, 3, 1, 0, -1],
  Cinema:                  [4, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2],
  Vocal:                   [-2, -1, 0, 1, 3, 4, 4, 2, 1, 0, 0],
  'Concert Hall':          [3, 2, 1, 0, -1, 0, 1, 2, 3, 3, 4],
  'Rock Arena':            [4, 3, 2, 3, 5, 4, 3, 4, 3, 2, 1],
  'Classic Marshall Stack':[3, 4, 5, 6, 6, 5, 4, 5, 4, 3, 2],
  'Blues Club':            [2, 3, 4, 3, 4, 5, 3, 3, 2, 1, 1],
  'Metal Lead':            [5, 4, 3, 4, 6, 5, 4, 6, 5, 3, 2],
  'British Crunch':        [3, 4, 4, 5, 6, 5, 4, 4, 3, 2, 2],
};