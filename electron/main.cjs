// Last Updated: 2025-12-30 14:52:43
// [main.cjs] - null 데이터 처리 안전장치 추가 버전

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// 표준 방식: 빌드 도구 간섭을 피하기 위해 createRequire만 사용
const nativeRequire = createRequire(__filename);
const pdfParse = nativeRequire('pdf-parse');

require('dotenv').config();

const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, shell, dialog } = require('electron');


console.log("네이버 키 확인:", process.env.NAVER_CLIENT_ID);

// 🟢 [추가] 캐시 에러 방지를 위한 하드웨어 가속 비활성화 (선택 사항)
// app.disableHardwareAcceleration(); 

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
    equipment: path.join(PROJECT_ROOT, 'equipment.json'),
    user: path.join(PROJECT_ROOT, 'user-profile.json'),
    widgets: path.join(PROJECT_ROOT, 'widgets.json'),
    mapData: path.join(PROJECT_ROOT, 'src/data/mapData.json')
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

// 🟢 [수정됨] 통합된 saveData 함수 (안전장치 추가)
function saveData(filePath, data, dataType = null) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

        // 로그 출력 시 data가 null이거나 undefined일 경우를 대비해 안전하게 체크
        let countLog = 'Empty';
        if (Array.isArray(data)) {
            countLog = `${data.length} items`;
        } else if (data && typeof data === 'object') {
            countLog = data.items ? `${data.items.length} items` : 'Object';
        }

        console.log(`✅ [저장 완료] 경로: ${filePath} (${countLog})`);

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
            webSecurity: false // 로컬 이미지 로드 허용
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

        // 🌟 [추가] 최소 크기 설정 (이 크기 이하로 줄어들지 않음)
        minWidth: 1280,  // 툴바가 깨지지 않는 최소 너비
        minHeight: 600,  // 최소 높이

        frame: false,
        backgroundColor: initialBgColor,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
    });

    dashboardWindow.loadURL(`http://localhost:5173/?view=dashboard&theme=${currentThemeMode}`);

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
        { label: '종료', click: () => { isQuitting = true; app.quit(); } }
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

ipcMain.handle('load-work', () => loadData(DATA_PATHS.work, { manuals: [] }));
ipcMain.on('save-work', (event, data) => {
    saveData(DATA_PATHS.work, data, 'work');
});

ipcMain.handle('load-equipment', () => loadData(DATA_PATHS.equipment, { list: [] }));
ipcMain.on('save-equipment', (event, data) => {
    saveData(DATA_PATHS.equipment, data, 'equipment');
});

// 🟢 [수정됨] 사용자 프로필 로드 (기본값을 null 대신 빈 객체 {}로 설정하여 에러 방지)
ipcMain.handle('load-user-profile', () => loadData(DATA_PATHS.user, {}));
ipcMain.on('save-user-profile', (event, data) => {
    saveData(DATA_PATHS.user, data, 'user');
});

// 선택적 데이터 백업
ipcMain.on('export-selective-data', async (event, dataToExport) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: '데이터 백업 (선택 항목)',
            defaultPath: path.join(app.getPath('downloads'), 'my-ai-data-backup.json'),
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (filePath) {
            fs.writeFileSync(filePath, JSON.stringify(dataToExport, null, 2));
            console.log("백업 완료:", filePath);
        }
    } catch (error) {
        console.error('데이터 내보내기 실패:', error);
    }
});

// 데이터 초기화
ipcMain.on('reset-all-data', () => {
    try {
        Object.values(DATA_PATHS).forEach(filePath => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        console.log("모든 데이터가 초기화되었습니다.");
        app.relaunch();
        app.exit();
    } catch (error) {
        console.error("데이터 초기화 실패:", error);
    }
});

// 이미지 선택 핸들러
ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'jpeg', 'webp'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.on('minimize-window', () => mainWindow.minimize());
ipcMain.on('hide-window', () => mainWindow.hide());
ipcMain.on('dashboard-minimize', () => dashboardWindow && dashboardWindow.minimize());
ipcMain.on('dashboard-maximize', () => {
    if (dashboardWindow) {
        if (dashboardWindow.isMaximized()) {
            dashboardWindow.unmaximize();
            dashboardWindow.webContents.send('window-maximized-state', false);
        } else {
            dashboardWindow.maximize();
            dashboardWindow.webContents.send('window-maximized-state', true);
        }
    }
});
ipcMain.on('dashboard-close', () => dashboardWindow && dashboardWindow.close());

// 설정 로드/저장
ipcMain.handle('load-settings', () => loadData(DATA_PATHS.settings, {
    shiftBaseDate: "2025-03-05",
    shiftPattern: [
        "주간 근무", "주간 근무", "휴무", "휴무", "휴무",
        "야간 근무", "야간 근무", "휴무", "휴무",
        "주간 근무", "주간 근무", "주간 근무", "휴무", "휴무",
        "야간 근무", "야간 근무", "휴무", "휴무", "휴무",
        "주간 근무", "주간 근무", "휴무", "휴무",
        "야간 근무", "야간 근무", "야간 근무", "휴무", "휴무",
    ]
}));
ipcMain.on('save-settings', (event, data) => {
    saveData(DATA_PATHS.settings, data, 'settings');
});

// 네이버 도서 검색 API
const https = require('https');
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

ipcMain.handle('search-naver-books', async (event, query) => {
    return new Promise((resolve, reject) => {
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
                        resolve(parsed.items || []);
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', (e) => resolve([]));
    });
});

// PDF 파일 처리
ipcMain.handle('select-pdf', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.on('open-local-file', (event, filePath) => {
    if (filePath) shell.openPath(filePath);
});

ipcMain.handle('extract-pdf-text', async (event, filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    } catch (error) {
        return "";
    }
});

// 모든 파일 선택
ipcMain.handle('select-any-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return {
        filePath: result.filePaths[0],
        fileName: path.basename(result.filePaths[0])
    };
});

// 🌟 [추가] 커스텀 위젯 데이터 로드/저장 핸들러
ipcMain.handle('load-custom-widgets', () => loadData(DATA_PATHS.widgets, []));

ipcMain.on('save-custom-widgets', (event, data) => {
    saveData(DATA_PATHS.widgets, data, 'widgets');
});



// 🟢 [추가] 파일 열기 요청 처리
ipcMain.on('open-path', (event, path) => {
    // shell.openPath는 파일이나 바로가기를 기본 프로그램으로 실행합니다.
    shell.openPath(path).then((error) => {
        if (error) console.error('Failed to open path:', error);
    });
});
// -----------------------------------------------------------------------------
// 🗺️ [신규 추가] 맵 데이터(mapData.json) 관리 핸들러
// -----------------------------------------------------------------------------

// 1. 읽기 (Load)
ipcMain.handle('load-map-data', async () => {
    try {
        // 파일이 없으면 빈 배열 반환
        if (!fs.existsSync(DATA_PATHS.mapData)) return [];
        
        // 파일 읽어서 JSON 파싱 후 반환
        const data = fs.readFileSync(DATA_PATHS.mapData, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ 맵 데이터 로드 실패:", error);
        return []; // 에러 나면 빈 배열 반환 (앱 멈춤 방지)
    }
});

// 2. 저장 (Save) - 안전한 원자적 저장 방식
ipcMain.handle('save-map-data', async (event, data) => {
    const tempPath = `${DATA_PATHS.mapData}.tmp`; // 임시 파일
    try {
        // 1) 임시 파일에 먼저 저장
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        
        // 2) 원본 파일과 교체 (파일 깨짐 방지)
        if (fs.existsSync(DATA_PATHS.mapData)) {
            try { fs.unlinkSync(DATA_PATHS.mapData); } catch(e) {}
        }
        fs.renameSync(tempPath, DATA_PATHS.mapData);
        
        console.log("✅ 맵 데이터 저장 완료");
        return true;
    } catch (error) {
        console.error("❌ 맵 데이터 저장 실패:", error);
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
        }
        throw error;
    }
});