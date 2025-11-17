// Last Updated: 2025-11-18 01:11:26
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
let isQuitting = false; 

// app.getAppPath()는 C:\Users\user\my-ai-assistant 경로를 반환합니다.
const todosFilePath = path.join(app.getPath('userData'), 'todos.json');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const windowWidth = 400;
  const windowHeight = 650;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 20,
    y: height - windowHeight - 20,
    frame: false,            
    transparent: true,       
    backgroundColor: '#00000000', 
    hasShadow: false, 
    resizable: false,
    skipTaskbar: false, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 개발 환경(http://localhost:5173) 또는 빌드된 파일 로드
  const startUrl = 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  // [핵심] 닫기 버튼 누르면 숨기기 (트레이로 이동)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => (mainWindow = null));
}

// [수정됨] 트레이 아이콘 생성 (에러 방지 로직 추가)
function createTray() {
  const iconPath = path.join(__dirname, '../public/tray.png');
  
  // 1. 아이콘 이미지가 실제로 있는지 확인
  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // 파일이 없으면 빈 아이콘으로 생성 (에러 방지)
    console.log("⚠️ 알림: tray.png 파일을 찾을 수 없습니다. 빈 아이콘을 사용합니다.");
    trayIcon = nativeImage.createEmpty(); 
  }
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '열기', click: () => mainWindow.show() },
    { label: '종료', click: () => {
      isQuitting = true;
      app.quit();
    }}
  ]);

  tray.setToolTip('AI Partner Pro');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}

ipcMain.handle('load-todos', async () => {
  try {
    if (fs.existsSync(todosFilePath)) {
      const data = fs.readFileSync(todosFilePath, 'utf8');
      return JSON.parse(data); // 저장된 JSON 데이터 반환
    }
    return []; // 파일이 없으면 빈 배열 반환
  } catch (error) {
    console.error('Error loading todos:', error);
    return [];
  }
});

// 2. 데이터 쓰기 요청 처리 (todos 상태가 변경될 때 자동 저장)
ipcMain.on('save-todos', (event, todos) => {
  try {
    fs.writeFileSync(todosFilePath, JSON.stringify(todos), 'utf8');
  } catch (error) {
    console.error('Error saving todos:', error);
  }
});

ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('hide-window', () => {
  mainWindow.hide();
});

app.on('ready', () => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});