const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const isDev = process.env.NODE_ENV === 'development';

// ═══════════════════════════════════════════════════════════════
// In-memory token → file path map.
// The renderer gets a short token (e.g. media://tok_abc123)
// and the main process looks up the real path.
// ═══════════════════════════════════════════════════════════════
const mediaTokens = new Map();
let tokenCounter = 0;

function registerMediaToken(filePath) {
  const token = `tok${++tokenCounter}_${Date.now().toString(36)}`;
  mediaTokens.set(token, filePath);
  // Cleanup: drop tokens after 2 hours
  setTimeout(() => mediaTokens.delete(token), 2 * 60 * 60 * 1000);
  return token;
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      bypassCSP: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    title: 'Innila',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0f',
      symbolColor: '#ff6b9d',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // media://<token>  →  look up the real path, stream the file
  protocol.handle('media', async (request) => {
    try {
      const url = new URL(request.url);
      // URL: media://<token>   → host = token, pathname = ''
      const token = url.hostname;
      console.log('[media://] request for token:', token);

      const realPath = mediaTokens.get(token);
      if (!realPath) {
        console.warn('[media://] unknown token:', token);
        return new Response('Not found', { status: 404 });
      }

      if (!existsSync(realPath)) {
        console.warn('[media://] file missing:', realPath);
        return new Response('File missing', { status: 404 });
      }

      console.log('[media://] streaming:', realPath);
      const fileUrl = pathToFileURL(realPath).toString();
      return net.fetch(fileUrl);
    } catch (err) {
      console.error('[media://] handler error:', err);
      return new Response('Handler error: ' + err.message, { status: 500 });
    }
  });

  createWindow();
});

// ── IPC 1: file picker (audio + video) ──────────────────
ipcMain.handle('dialog:openAudio', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Media', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'mp4', 'mkv', 'webm', 'mov', 'avi'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] },
      { name: 'Video', extensions: ['mp4', 'mkv', 'webm', 'mov', 'avi'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return res.canceled ? [] : res.filePaths;
});

// ── IPC 2: read file for AUDIO ONLY (small files) ───────
ipcMain.handle('file:read', async (_evt, filePath) => {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 100 * 1024 * 1024) {
      return { ok: false, error: 'File too large for IPC read' };
    }
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = {
      mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
      m4a: 'audio/mp4', ogg: 'audio/ogg',
    }[ext] || 'audio/mpeg';
    return { ok: true, mime, data: buf.toString('base64') };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ── IPC 3: video info (returns a token, NOT a raw path) ──
ipcMain.handle('file:videoInfo', async (_evt, filePath) => {
  try {
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = {
      mp4: 'video/mp4', mkv: 'video/x-matroska',
      webm: 'video/webm', mov: 'video/quicktime',
      avi: 'video/x-msvideo',
    }[ext] || 'video/mp4';

    const token = registerMediaToken(filePath);
    const mediaUrl = `media://${token}`;

    console.log('[videoInfo] file:', filePath);
    console.log('[videoInfo] token:', token);
    console.log('[videoInfo] url:', mediaUrl);

    return {
      ok: true,
      mime,
      mediaUrl,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

ipcMain.handle('app:version', () => app.getVersion());

// ── IPC 4: downloader ───────────────────────────────────
ipcMain.handle('media:download', async (event, { url, type }) => {
  try {
    const downloadsDir = path.join(os.homedir(), 'Downloads', 'Innila');
    await fs.mkdir(downloadsDir, { recursive: true });
    const outputTemplate = path.join(downloadsDir, '%(title)s.%(ext)s');

    const args = ['--no-playlist', '--no-warnings', '--newline', '-o', outputTemplate];

    if (type === 'audio') {
      args.push('-f', 'bestaudio/best');
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      args.push('--embed-thumbnail', '--add-metadata');
    } else {
      args.push('-f', 'bestvideo+bestaudio/best');
      args.push('--merge-output-format', 'mp4');
    }

    args.push(url);

    const YTDLP_CANDIDATES = [
      'yt-dlp',
      'C:\\Users\\91776\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe',
      'C:\\ffmpeg\\yt-dlp.exe',
      `${os.homedir()}\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe`,
    ];
    const ytdlpPath = YTDLP_CANDIDATES.find(p => p === 'yt-dlp' || existsSync(p)) || 'yt-dlp';

    return await new Promise((resolve) => {
      const proc = spawn(ytdlpPath, args, { windowsHide: true });
      let errors = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        const progressMatch = text.match(/\[download\]\s+([\d.]+)%/);
        if (progressMatch) {
          event.sender.send('media:progress', { percent: parseFloat(progressMatch[1]) });
        }
        const doneMatch = text.match(/\[(download|Merger|ExtractAudio)\]\s+(Destination|Merging formats into|Extracting audio):\s*(.+)/);
        if (doneMatch) {
          event.sender.send('media:status', { line: doneMatch[0].trim() });
        }
      });

      proc.stderr.on('data', (data) => { errors += data.toString(); });

      proc.on('close', async (code) => {
        if (code !== 0) {
          return resolve({ ok: false, error: errors || `yt-dlp exited with ${code}` });
        }
        try {
          const files = await fs.readdir(downloadsDir);
          let newest = null;
          let newestTime = 0;
          for (const f of files) {
            const fp = path.join(downloadsDir, f);
            const st = await fs.stat(fp);
            if (st.isFile() && st.mtimeMs > newestTime) {
              newestTime = st.mtimeMs;
              newest = fp;
            }
          }
          resolve({ ok: true, path: newest, dir: downloadsDir });
        } catch (err) {
          resolve({ ok: false, error: String(err) });
        }
      });

      proc.on('error', (err) => {
        resolve({
          ok: false,
          error: err.code === 'ENOENT'
            ? `yt-dlp not found. Tried: ${ytdlpPath}`
            : String(err),
        });
      });
    });
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ── IPC 5: open Downloads/Innila ────────────────────────
ipcMain.handle('media:openFolder', async () => {
  const downloadsDir = path.join(os.homedir(), 'Downloads', 'Innila');
  await fs.mkdir(downloadsDir, { recursive: true });
  shell.openPath(downloadsDir);
  return { ok: true };
});

// ── IPC 6: check deps ───────────────────────────────────
ipcMain.handle('media:checkDeps', async () => {
  const { execSync } = require('node:child_process');
  const result = { ytDlp: false, ffmpeg: false, ytVersion: '', ffVersion: '' };
  try {
    result.ytVersion = execSync('yt-dlp --version', { encoding: 'utf-8' }).trim();
    result.ytDlp = true;
  } catch {}
  try {
    const out = execSync('ffmpeg -version', { encoding: 'utf-8' });
    result.ffVersion = out.split('\n')[0];
    result.ffmpeg = true;
  } catch {}
  return result;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});