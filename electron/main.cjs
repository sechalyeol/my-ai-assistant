// Last Updated: 2025-12-10 15:03:34
// [main.cjs] - 괄호 위치 수정 및 최대화 기능 포함 최종본

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path'); // 🟢 이 줄이 없어서 에러가 났던 것입니다! (복구 완료)
const { createRequire } = require('module');

// 표준 방식: 빌드 도구 간섭을 피하기 위해 createRequire만 사용
const nativeRequire = createRequire(__filename);
const pdfParse = nativeRequire('pdf-parse');

require('dotenv').config();

const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, shell, dialog } = require('electron'); // 🟢 shell, dialog 추가

console.log("네이버 키 확인:", process.env.NAVER_CLIENT_ID);

let mainWindow;
let dashboardWindow = null;
let tray = null;
let isQuitting = false;
let currentThemeMode = 'auto';

// 프로젝트 루트 경로 설정
const PROJECT_ROOT = process.cwd();
const DATA_PATHS = {
  schedules: path.join(PROJECT_ROOT, 'schedules.json'), 
  finance: path.join(PROJECT_ROOT, 'finance.json'),
  mental: path.join(PROJECT_ROOT, 'mental.json'),
  development: path.join(PROJECT_ROOT, 'development.json'),
  work: path.join(PROJECT_ROOT, 'work.json'),
  settings: path.join(PROJECT_ROOT, 'settings.json'),
  equipment: path.join(PROJECT_ROOT, 'equipment.json') // 🟢 [신규] 콤마(,) 주의 후 이 줄 추가
};

// 통합된 데이터 업데이트 알림 함수
function broadcastUpdate(dataType) {
    console.log(`📡 Broadcasting update for: ${dataType}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('data-updated', dataType);
    }
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send('data-updated', dataType);
    }
}

// 통합된 saveData 함수
function saveData(filePath, data, dataType = null) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    const count = Array.isArray(data) ? data.length : 'Object';
    console.log(`✅ [저장 완료] 경로: ${filePath}`);
    console.log(`   └─ 데이터 크기: ${count}개 항목`);
    if (dataType) {
        broadcastUpdate(dataType);
    }
  } catch (error) {
    console.error(`❌ [저장 실패] 경로: ${filePath}`, error);
  }
}

// loadData 함수
function loadData(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
    saveData(filePath, defaultValue, null);
    return defaultValue;
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error);
    return defaultValue;
  }
}

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = 420;
  const windowHeight = 700;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 20,
    y: height - windowHeight - 20,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(`http://localhost:5173/?theme=${currentThemeMode}`);

  mainWindow.on('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createDashboardWindow() {
    if (dashboardWindow !== null) {
      dashboardWindow.show();
      dashboardWindow.focus();
      return;
    }
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = Math.floor(width * 0.8);
    const windowHeight = Math.floor(height * 0.8);
    const initialBgColor = currentThemeMode === 'light' ? '#f5f5f5' : '#18181b';

    dashboardWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: Math.floor(width * 0.1),
        y: Math.floor(height * 0.1),
        frame: false,
        backgroundColor: initialBgColor,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    dashboardWindow.loadURL(`http://localhost:5173/?view=dashboard&theme=${currentThemeMode}`);

    // 🟢 창 최대화/복원 상태 감지 및 전송
    dashboardWindow.on('maximize', () => {
        dashboardWindow.webContents.send('window-maximized-state', true);
    });
    dashboardWindow.on('unmaximize', () => {
        dashboardWindow.webContents.send('window-maximized-state', false);
    });
    dashboardWindow.on('ready-to-show', () => {
        dashboardWindow.show();
        dashboardWindow.webContents.send('window-maximized-state', dashboardWindow.isMaximized());
    });
    
    dashboardWindow.on('closed', () => { dashboardWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/tray.png');
  const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '챗봇 열기', click: () => mainWindow.show() },
    { label: '대시보드 열기', click: () => createDashboardWindow() },
    { type: 'separator' },
    { label: '종료', click: () => { isQuitting = true; app.quit(); }}
  ]);
  tray.setToolTip('AI Partner Pro');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
}

app.on('ready', () => {
  createMainWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// --- IPC 핸들러 ---

ipcMain.on('sync-theme-mode', (event, mode) => { currentThemeMode = mode; });

ipcMain.on('toggle-dashboard', () => {
    if (dashboardWindow === null) {
        createDashboardWindow();
    } else {
        dashboardWindow.isVisible() ? dashboardWindow.hide() : dashboardWindow.show();
    }
});

ipcMain.on('set-background-color', (event, color) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBackgroundColor(color);
    if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.setBackgroundColor(color);
});

// 데이터 로드/저장 핸들러
ipcMain.handle('load-schedules', () => loadData(DATA_PATHS.schedules, []));
ipcMain.on('save-schedules', (event, data) => {
    console.log(`📥 [요청 수신] save-schedules: ${data.length}개 항목 수신됨`);
    saveData(DATA_PATHS.schedules, data, 'schedules');
});

ipcMain.handle('load-finance', () => loadData(DATA_PATHS.finance, { totalAsset: 0, items: [] }));
ipcMain.on('save-finance', (event, data) => {
    saveData(DATA_PATHS.finance, data, 'finance');
});

ipcMain.handle('load-mental', () => loadData(DATA_PATHS.mental, { logs: [], currentMood: '기록 없음', score: 0 }));
ipcMain.on('save-mental', (event, data) => {
    saveData(DATA_PATHS.mental, data, 'mental');
});

ipcMain.handle('load-development', () => loadData(DATA_PATHS.development, { tasks: [] }));
ipcMain.on('save-development', (event, data) => {
    saveData(DATA_PATHS.development, data, 'development');
});

ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('hide-window', () => mainWindow.hide());

ipcMain.on('dashboard-minimize', () => dashboardWindow && dashboardWindow.minimize());

// 대시보드 최대화/복원 토글 핸들러
ipcMain.on('dashboard-maximize', () => {
    if (dashboardWindow) {
        if (dashboardWindow.isMaximized()) {
            dashboardWindow.unmaximize();
            // 💡 OS 이벤트를 기다리지 않고 즉시 상태 전송 (False: 복원됨)
            dashboardWindow.webContents.send('window-maximized-state', false);
        } else {
            dashboardWindow.maximize();
            // 💡 OS 이벤트를 기다리지 않고 즉시 상태 전송 (True: 최대화됨)
            dashboardWindow.webContents.send('window-maximized-state', true);
        }
    }
});

// ⚙️ 설정(Settings) 로드/저장 핸들러
ipcMain.handle('load-settings', () => loadData(DATA_PATHS.settings, {
    shiftBaseDate: "2025-03-05", // 기본값
    shiftPattern: [
        "주간 근무","주간 근무","휴무","휴무","휴무",
        "야간 근무","야간 근무","휴무","휴무",
        "주간 근무","주간 근무","주간 근무","휴무","휴무",
        "야간 근무","야간 근무","휴무","휴무","휴무",
        "주간 근무","주간 근무","휴무","휴무",
        "야간 근무","야간 근무","야간 근무","휴무","휴무",
    ]
}));

ipcMain.on('save-settings', (event, data) => {
    saveData(DATA_PATHS.settings, data, 'settings');
});

// 📚 네이버 도서 검색 API 핸들러
const https = require('https');

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

ipcMain.handle('search-naver-books', async (event, query) => {
    return new Promise((resolve, reject) => {
        // 정확도순(sim) 정렬, 10개 검색
        const api_url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURI(query)}&display=10&sort=sim`;
        
        const options = {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
            }
        };

        const req = https.get(api_url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const parsed = JSON.parse(data);
                        resolve(parsed.items || []); // 검색 결과 배열 반환
                    } else {
                        console.error("Naver API Error Status:", res.statusCode);
                        resolve([]); // 에러 시 빈 배열 반환
                    }
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    resolve([]);
                }
            });
        });

        req.on('error', (e) => {
            console.error("Network Error:", e);
            resolve([]);
        });
    });
});

ipcMain.on('dashboard-close', () => dashboardWindow && dashboardWindow.close());

// 🟢 [신규] PDF 파일 선택 창 열기
ipcMain.handle('select-pdf', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0]; // 선택된 파일 경로 반환
});

// 🟢 [신규] 파일 열기 (기본 연결 프로그램)
ipcMain.on('open-local-file', (event, filePath) => {
    if (filePath) shell.openPath(filePath);
});

ipcMain.handle('extract-pdf-text', async (event, filePath) => {
    try {
        console.log(`📄 PDF 추출 시작: ${filePath}`);
        
        // 1. 파일 읽기
        const dataBuffer = fs.readFileSync(filePath);
        
        // 2. 표준 라이브러리 사용 (이제 함수로 정상 동작함)
        const data = await pdfParse(dataBuffer);
        
        console.log(`✅ PDF 추출 성공 (길이: ${data.text.length}자)`);
        return data.text; 

    } catch (error) {
        console.error("❌ PDF Parsing Error:", error);
        return ""; // 에러 나면 빈 문자열 반환
    }
});

ipcMain.handle('load-work', () => loadData(DATA_PATHS.work, { manuals: [] })); // tasks 대신 manuals 사용
ipcMain.on('save-work', (event, data) => {
    saveData(DATA_PATHS.work, data, 'work');
});

ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'jpeg'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0]; // 선택된 이미지 경로 반환
});

// 🟢 [신규] 모든 파일 선택 핸들러 (이게 없으면 이미지 선택창이 뜹니다)
ipcMain.handle('select-any-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] } // ⭐ 모든 파일 허용
        ]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    
    // 파일 경로와 파일명을 함께 반환
    return { 
        filePath: result.filePaths[0], 
        fileName: path.basename(result.filePaths[0]) 
    };
});

// 🟢 [신규] 설비 데이터 로드 (load-equipment)
ipcMain.handle('load-equipment', () => loadData(DATA_PATHS.equipment, { list: [] }));

// 🟢 [신규] 설비 데이터 저장 (save-equipment)
ipcMain.on('save-equipment', (event, data) => {
    saveData(DATA_PATHS.equipment, data, 'equipment');
});