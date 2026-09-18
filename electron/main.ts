/**
 * Electron main process.
 *
 * Owns the application window, the Gemini API key, and every privileged
 * operation. The renderer is a sandboxed, context-isolated web page that can
 * only reach this process through the two channels declared in `shared/ipc.ts`.
 */
import path from 'node:path';
import fs from 'node:fs';
import { BrowserWindow, app, shell } from 'electron';
import { getApiKey, getEnvFilePath, getModelName, loadEnvironment } from './env';
import { registerIpcHandlers } from './ipc';
import { redact } from './errors';

/** Set by `scripts/dev.mjs`; absent in a packaged build. */
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const isDev = !app.isPackaged && Boolean(devServerUrl);

const RENDERER_DIST = path.join(__dirname, '..', 'dist');
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');

let mainWindow: BrowserWindow | null = null;

function resolveWindowIcon(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#F7F8F5',
    title: 'AI Image Analyzer',
    icon: resolveWindowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      // --- Security posture ---------------------------------------------
      contextIsolation: true, // renderer and preload get separate JS contexts
      nodeIntegration: false, // no `require`/`process` in the renderer
      sandbox: true, // renderer runs in the OS sandbox
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      // ------------------------------------------------------------------
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Never let the renderer navigate away from the app, and open any external
  // link in the user's real browser instead of inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevServer = Boolean(devServerUrl && url.startsWith(devServerUrl));
    if (!isDevServer) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  if (isDev && devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

function logStartupConfiguration(): void {
  const envPath = getEnvFilePath();
  const hasKey = getApiKey() !== null;

  console.log(`[startup] AI Image Analyzer ${app.getVersion()} (${app.isPackaged ? 'packaged' : 'development'})`);
  console.log(`[startup] .env loaded from: ${envPath ?? 'none found (using process environment)'}`);
  console.log(`[startup] GEMINI_API_KEY: ${hasKey ? 'present' : 'MISSING'}`);
  console.log(`[startup] model: ${getModelName()}`);
}

// A second launch focuses the existing window rather than starting a new app.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  // Windows taskbar grouping / notification identity.
  app.setAppUserModelId('com.aiimageanalyzer.app');

  loadEnvironment();

  void app.whenReady().then(() => {
    logStartupConfiguration();
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Last-resort guards so an unexpected failure logs a redacted message instead
// of tearing the process down silently.
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', redact(error?.stack ?? String(error)));
});

process.on('unhandledRejection', (reason) => {
  console.error(
    '[unhandledRejection]',
    redact(reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)),
  );
});
