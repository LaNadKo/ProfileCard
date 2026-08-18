import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, CornerDownLeft, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import avatarFrames from '../data/avatarFrames.json';
import { apiUrl, appConfig, storageKey } from '../config/appConfig';

const formatRelativeTime = (sec, lang = 'ru') => {
  const isEn = lang === 'en';
  if (!sec) return '—';
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, nowSec - sec);

  if (diff < 60) return isEn ? 'just now' : 'только что';
  if (diff < 3600) return isEn ? `${Math.floor(diff / 60)}m ago` : `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return isEn ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 3600)} ч. назад`;

  const d = new Date(sec * 1000);
  return d.toLocaleDateString(isEn ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TerminalModal = ({ isOpen, onClose, personal, projects, socials = [], weather, presence, showToast, lang = 'ru' }) => {
  const isEn = lang === 'en';
  const terminalHost = appConfig.terminal.hostName;
  const terminalPrompt = `guest@${terminalHost}:~$`;
  const terminalVersion = appConfig.terminal.version ? ` v${appConfig.terminal.version}` : '';
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    {
      type: 'system',
      text: isEn
        ? `${appConfig.terminal.productName} OS${terminalVersion}\nType "help" for available commands.`
        : `${appConfig.terminal.productName} OS${terminalVersion}\nВведите "help" для списка доступных команд.`,
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState([]);
  const [isMatrixActive, setIsMatrixActive] = useState(false);
  const [isSnakeActive, setIsSnakeActive] = useState(false);
  const [animFrameIndex, setAnimFrameIndex] = useState(0);

  // Snake game state
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeGameOver, setSnakeGameOver] = useState(false);
  const snakeCanvasRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const snakeStateRef = useRef({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    dir: { x: 0, y: -1 },
    nextDir: { x: 0, y: -1 },
    food: { x: 5, y: 5 },
    score: 0,
    gameOver: false,
  });

  const inputRef = useRef(null);
  const terminalEndRef = useRef(null);
  const canvasRef = useRef(null);

  // Sync welcome message when language changes
  useEffect(() => {
    setHistory((prev) => {
      if (prev.length === 1 && prev[0].type === 'system') {
        return [
          {
            type: 'system',
            text: isEn
              ? `${appConfig.terminal.productName} OS${terminalVersion}\nType "help" for available commands.`
              : `${appConfig.terminal.productName} OS${terminalVersion}\nВведите "help" для списка доступных команд.`,
          },
        ];
      }
      return prev;
    });
  }, [isEn, terminalVersion]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsMatrixActive(false);
      setIsSnakeActive(false);
    }
  }, [isOpen]);

  // Live video frame animation loop (10-12 FPS)
  useEffect(() => {
    if (!isOpen || isSnakeActive || isMatrixActive) return;

    const interval = setInterval(() => {
      setAnimFrameIndex((prev) => (prev + 1) % (avatarFrames.length || 1));
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isSnakeActive, isMatrixActive]);

  // Scroll to bottom on output update
  useEffect(() => {
    if (isOpen && !isSnakeActive) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, isOpen, isSnakeActive]);

  // Handle global ESC key & Ctrl+C & Snake movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlC = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';

      if (isSnakeActive) {
        if (e.key === 'Escape' || isCtrlC) {
          e.preventDefault();
          setIsSnakeActive(false);
          setHistory((prev) => [
            ...prev,
            {
              type: 'system',
              text: isEn
                ? `Game over. Final score: ${snakeStateRef.current.score}`
                : `Игра окончена. Ваш счёт: ${snakeStateRef.current.score}`,
            },
          ]);
          return;
        }

        const state = snakeStateRef.current;
        if (state.gameOver) {
          if (e.key === ' ' || e.key === 'Enter') {
            restartSnake();
          }
          return;
        }

        if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && state.dir.y === 0) {
          e.preventDefault();
          state.nextDir = { x: 0, y: -1 };
        } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && state.dir.y === 0) {
          e.preventDefault();
          state.nextDir = { x: 0, y: 1 };
        } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && state.dir.x === 0) {
          e.preventDefault();
          state.nextDir = { x: -1, y: 0 };
        } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && state.dir.x === 0) {
          e.preventDefault();
          state.nextDir = { x: 1, y: 0 };
        }
        return;
      }

      if (isMatrixActive) {
        if (e.key === 'Escape' || isCtrlC) {
          e.preventDefault();
          setIsMatrixActive(false);
          return;
        }
      }

      if (isOpen) {
        if (e.key === 'Escape') {
          onClose();
        } else if (isCtrlC) {
          if (input) {
            e.preventDefault();
            setHistory((prev) => [...prev, { type: 'input', text: `${terminalPrompt} ${input}^C` }]);
            setInput('');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMatrixActive, isSnakeActive, onClose, input, terminalPrompt, isEn]);

  // Matrix rain canvas animation (Pure Monochrome White)
  useEffect(() => {
    if (!isMatrixActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#*+=-<>~/\\{}[]';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMatrixActive]);

  // Snake Game Loop
  const restartSnake = () => {
    snakeStateRef.current = {
      snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
      dir: { x: 0, y: -1 },
      nextDir: { x: 0, y: -1 },
      food: { x: 5, y: 5 },
      score: 0,
      gameOver: false,
    };
    setSnakeScore(0);
    setSnakeGameOver(false);
  };

  const changeDirection = (dirName) => {
    const state = snakeStateRef.current;
    if (state.gameOver) {
      restartSnake();
      return;
    }
    if (dirName === 'up' && state.dir.y === 0) state.nextDir = { x: 0, y: -1 };
    if (dirName === 'down' && state.dir.y === 0) state.nextDir = { x: 0, y: 1 };
    if (dirName === 'left' && state.dir.x === 0) state.nextDir = { x: -1, y: 0 };
    if (dirName === 'right' && state.dir.x === 0) state.nextDir = { x: 1, y: 0 };
  };

  const handleTouchStart = (e) => {
    if (!isSnakeActive || !e.touches[0]) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (!isSnakeActive || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) return;

    if (absDx > absDy) {
      changeDirection(dx > 0 ? 'right' : 'left');
    } else {
      changeDirection(dy > 0 ? 'down' : 'up');
    }
  };

  useEffect(() => {
    if (!isSnakeActive || !snakeCanvasRef.current) return;

    restartSnake();
    const canvas = snakeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const gridSize = 16;
    const tileCount = 20;

    canvas.width = gridSize * tileCount;
    canvas.height = gridSize * tileCount;

    let gameInterval = setInterval(() => {
      const state = snakeStateRef.current;
      if (state.gameOver) return;

      state.dir = state.nextDir;
      const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };

      // Wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        state.gameOver = true;
        setSnakeGameOver(true);
        return;
      }

      // Self collision
      if (state.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
        state.gameOver = true;
        setSnakeGameOver(true);
        return;
      }

      state.snake.unshift(head);

      // Food collision
      if (head.x === state.food.x && head.y === state.food.y) {
        state.score += 10;
        setSnakeScore(state.score);
        state.food = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount),
        };
      } else {
        state.snake.pop();
      }

      // Draw Screen
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Food
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.fillRect(state.food.x * gridSize + 2, state.food.y * gridSize + 2, gridSize - 4, gridSize - 4);
      ctx.shadowBlur = 0;

      // Snake Body
      state.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#ffffff' : '#a1a1aa';
        ctx.fillRect(seg.x * gridSize + 1, seg.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    }, 110);

    return () => clearInterval(gameInterval);
  }, [isSnakeActive]);

  const generateProgressBar = (percent, totalBars = 20) => {
    const filled = Math.round((percent / 100) * totalBars);
    const empty = Math.max(0, totalBars - filled);
    return `[${'|'.repeat(filled)}${'.'.repeat(empty)}]`;
  };

  const executeCommand = async (cmdStr) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    const args = raw.split(' ');
    const requestedCommand = args[0].toLowerCase();
    const profileAliases = [personal.name, personal.nickname, personal.alias, personal.handle]
      .filter(Boolean)
      .map((value) => value.replace(/^@/, '').toLowerCase());
    const cmd = profileAliases.includes(requestedCommand) ? 'profile' : requestedCommand;
    const restArgs = raw.slice(args[0].length).trim();

    setCommandHistory((prev) => [...prev, raw]);
    setHistoryIndex(-1);

    const newEntries = [{ type: 'input', text: `${terminalPrompt} ${raw}` }];

    switch (cmd) {
      case 'help':
        newEntries.push({
          type: 'output',
          text: isEn ? `Available commands:
  whoami       - Current visitor identification (IP, OS, visits)
  profile      - Profile owner overview${personal.alias ? ` (~ ${personal.alias})` : ''}
  neofetch     - Animated ASCII video cat + hardware specs
  fastfetch    - System Fastfetch dashboard
  visits       - Unique visitor analytics & recent history
  projects     - List of repositories and tech stack
  contact      - Social contacts and links
  weather      - Current weather${personal.location ? ` in ${personal.location}` : ''}
  nowplaying   - Live Discord / Spotify activity
  uptime       - Server uptime and host status
  top / htop   - Live interactive server workload monitor
  visitors     - Concurrent online visitors right now
  snake / game - Classic arcade Snake game in terminal
  guestbook    - Read recent public notes from the Wall
  msg <text>   - Post a note to the Wall
  matrix       - Matrix Rain (Ctrl+C or ESC to exit)
  clear        - Clear terminal screen
  sudo         - Check superuser privileges
  exit         - Close terminal` : `Доступные команды:
  whoami       - Идентификация текущего гостя (ваш IP, ОС, визиты)
  profile      - Информация о владельце профиля${personal.alias ? ` (~ ${personal.alias})` : ''}
  neofetch     - Анимированный видео-аватар кота + спеки сервера
  fastfetch    - Системный Fastfetch (живой видео-аватар)
  visits       - История и статистика уникальных IP посещений
  projects     - Список проектов с описанием
  contact      - Контакты и профили социальных сетей
  weather      - Текущая погода${personal.location ? ` в ${personal.location}` : ''}
  nowplaying   - Текущая активность в Discord / Spotify
  uptime       - Реальный аптайм и статус сервера
  top / htop   - Интерактивный дашборд нагрузки сервера
  visitors     - Количество гостей на сайте прямо сейчас
  snake / game - Ретро-игра «Змейка» прямо в консоли
  guestbook    - Посмотреть сообщения со Стены
  msg <текст>  - Написать сообщение на Стену
  matrix       - Matrix Rain (Ctrl+C или ESC для выхода)
  clear        - Очистить экран терминала
  sudo         - Проверка прав суперпользователя
  exit         - Закрыть терминал`,
        });
        break;

      case 'whoami':
      case 'id':
      case 'me':
        try {
          const res = await fetch(apiUrl('my-session', { _t: Date.now() }));
          const sess = await res.json();

          const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A';
          const userLang = typeof navigator !== 'undefined' ? (navigator.language || appConfig.locale) : appConfig.locale;
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const visitorId = localStorage.getItem(storageKey('visitor_id')) || 'dev_session';
          const firstSeenTime = formatRelativeTime(sess.firstSeen, lang);

          newEntries.push({
            type: 'output',
            text: isEn ? `============================================================
              VISITOR IDENTIFICATION (whoami)
============================================================
  User:               guest (Visitor)
  Your IP Address:    ${sess.ip || 'Unknown'}
  Device & OS:        ${sess.device || 'Web Browser'}
  Display Resolution: ${screenRes}
  Locale & Language:  ${userLang}
  Time Zone:          ${timeZone}
  Visit Count:        #${sess.visitsCount || 1} visit to this site
  First Seen:         ${firstSeenTime}
  Device Session ID:  ${visitorId.slice(0, 16)}...
------------------------------------------------------------
 * For profile owner overview, type: profile
============================================================` : `============================================================
              ИДЕНТИФИКАЦИЯ ГОСТЯ (whoami)
============================================================
  Пользователь:       guest (Посетитель)
  Ваш IP-адрес:       ${sess.ip || 'Unknown'}
  Устройство и ОС:    ${sess.device || 'Web Browser'}
  Разрешение экрана:  ${screenRes}
  Локаль и Язык:      ${userLang}
  Часовой пояс:       ${timeZone}
  Количество визитов: ${sess.visitsCount || 1}-й раз на сайте
  Первый визит:       ${firstSeenTime}
  Device Session ID:  ${visitorId.slice(0, 16)}...
------------------------------------------------------------
 * Для информации о владельце профиля введите: profile
============================================================`,
          });
        } catch {
          newEntries.push({
            type: 'output',
            text: `USER: guest (Visitor)\nSESSION: ${localStorage.getItem(storageKey('visitor_id')) || 'active'}`,
          });
        }
        break;

      case 'neofetch':
      case 'fastfetch':
      case 'fetch':
      case 'avatar':
      case 'cat':
      case 'video':
        try {
          const res = await fetch(apiUrl('system-status', { _t: Date.now() }));
          const s = await res.json();
          const screenRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A';
          const osName = s.os || 'N/A';
          const hostName = s.host || 'N/A';
          const kernel = s.kernel || 'N/A';
          const uptime = s.uptimeStr || 'N/A';
          const pkgs = s.packages || 'N/A';
          const cpu = s.cpu || 'N/A';
          const mem = s.memTotalGb ? `${s.memUsedGb} GiB / ${s.memTotalGb} GiB (${s.memPercent}%)` : 'N/A';
          const disk = s.diskTotalGb ? `${s.diskUsedGb} GiB / ${s.diskTotalGb} GiB (${s.diskPercent}%)` : 'N/A';
          const hostUser = `guest@${s.hostname || terminalHost}`;
          const coordinateText = Number.isFinite(weather.latitude) && Number.isFinite(weather.longitude)
            ? ` [${weather.latitude}, ${weather.longitude}]`
            : '';

          newEntries.push({
            type: 'fastfetch',
            text: `${hostUser}
${'-'.repeat(hostUser.length + 4)}
OS:        ${osName}
Host:      ${hostName}
Kernel:    ${kernel}
Uptime:    ${uptime}
Packages:  ${pkgs}
Shell:     ${s.shell || 'N/A'} / ${appConfig.terminal.productName}${terminalVersion}
Terminal:  web-tty (live ascii-video)
Display:   ${screenRes}
WM:        Glassmorphism UI
CPU:       ${cpu}
Memory:    ${mem}
Disk (/):  ${disk}
Identity:  ${personal.name} (~ ${personal.alias})
Location:  ${personal.location || 'N/A'}${coordinateText}
Status:    Online [⚪ Live Animated Video]

Palette:   ██ ▓▓ ▒▒ ░░ ⚫ ⚪`,
          });
        } catch {
          newEntries.push({
            type: 'fastfetch',
            text: isEn ? 'System telemetry temporarily unavailable.' : 'Системные данные временно недоступны.',
          });
        }
        break;

      case 'profile':
      case 'about':
      case 'owner':
        newEntries.push({
          type: 'output',
          text: `============================================================
              ${isEn ? 'PROFILE OVERVIEW' : 'ПРОФИЛЬ ВЛАДЕЛЬЦА'} (${personal.name || 'Owner'})
============================================================
  USER:        ${personal.name} (~ ${personal.alias})
  ROLE:        ${personal.role}
  HANDLE:      ${personal.handle}
  LOCATION:    ${personal.location} (${personal.timezone || 'N/A'}, UTC${personal.timezoneOffset >= 0 ? '+' : ''}${personal.timezoneOffset ?? 0})
  BIO:         ${personal.bio}
  URL:         ${personal.canonicalUrl}
  STATUS:      ${presence.isOnline ? (isEn ? 'Online' : 'Online (в сети)') : presence.statusText}
============================================================`,
        });
        break;

      case 'visits':
      case 'history':
      case 'analytics':
      case 'stats':
        try {
          const res = await fetch(apiUrl('visits-history', { _t: Date.now() }));
          if (!res.ok) throw new Error('Failed to fetch visits');
          const data = await res.json();

          const tableRows = (data.recent || [])
            .map((r, i) => {
              const num = String(i + 1).padStart(2, '0');
              const ip = (r.maskedIp || 'Unknown').padEnd(16, ' ');
              const dev = (r.device || 'Other').padEnd(18, ' ');
              const cnt = String(r.visitsCount || 1).padStart(4, ' ');
              const time = formatRelativeTime(r.lastSeen, lang);
              return `  ${num}.  ${ip}  ${dev}  ${cnt}    ${time}`;
            })
            .join('\n');

          newEntries.push({
            type: 'output',
            text: isEn ? `============================================================
              UNIQUE VISITOR ANALYTICS
============================================================
  Total Unique IPs:        ${data.totalUnique || 0}
  Unique Visitors Today:   ${data.todayUnique || 0}
  Total Page Views:        ${data.totalVisits || 0}
------------------------------------------------------------
 RECENT UNIQUE VISITORS:
  [#]   IP ADDRESS        DEVICE             VIEWS      LAST SEEN
${tableRows || '  (No records yet)'}
============================================================` : `============================================================
              УНИКАЛЬНАЯ СТАТИСТИКА ПОСЕЩЕНИЙ
============================================================
  Всего уникальных IP:     ${data.totalUnique || 0}
  Уникальных за сегодня:   ${data.todayUnique || 0}
  Количество просмотров:   ${data.totalVisits || 0}
------------------------------------------------------------
 ПОСЛЕДНИЕ УНИКАЛЬНЫЕ ПОСЕТИТЕЛИ:
  [#]   IP-АДРЕС          УСТРОЙСТВО         ПРОСМОТРЫ  ПОСЛЕДНИЙ ВИЗИТ
${tableRows || '  (Пока нет записей)'}
============================================================`,
          });
        } catch {
          newEntries.push({
            type: 'error',
            text: isEn ? 'Failed to fetch visitor analytics from server' : 'Ошибка получения истории посещений с сервера',
          });
        }
        break;

      case 'visitors':
      case 'online':
      case 'users':
        try {
          const res = await fetch(apiUrl('live-visitors', { _t: Date.now() }));
          const v = await res.json();
          const count = typeof v.onlineVisitors === 'number' ? v.onlineVisitors : 0;
          newEntries.push({
            type: 'output',
            text: isEn ? `👥 LIVE VISITORS:
  Currently on site: ${count} active visitor${count === 1 ? '' : 's'} (real-time)` : `👥 ГОСТИ ОНЛАЙН:
  Сейчас на сайте: ${count} чел. (в реальном времени)`,
          });
        } catch {
          newEntries.push({
            type: 'error',
            text: isEn ? 'Failed to fetch online visitors count' : 'Ошибка получения счетчика посетителей',
          });
        }
        break;

      case 'top':
      case 'htop':
      case 'sys':
        try {
          const t0 = performance.now();
          const res = await fetch(apiUrl('system-status', { _t: Date.now() }));
          const ping = Math.round(performance.now() - t0);
          const s = await res.json();

          const cpuPercent = Math.min(Math.round(s.loadAvg * 20), 100);
          const cpuBar = generateProgressBar(cpuPercent, 22);
          const memBar = generateProgressBar(s.memPercent, 22);

          newEntries.push({
            type: 'output',
            text: isEn ? `top - ${s.hostname} (${s.os}) - Uptime: ${s.uptimeStr}
CPU Load  ${cpuBar} ${s.loadAvg} (${cpuPercent}%)
Memory    ${memBar} ${Math.round(s.memUsedMb / 1024 * 10) / 10} / ${Math.round(s.memTotalMb / 1024)} GB (${s.memPercent}%)
Ping RTT: ${ping} ms • Status: ONLINE [⚪]` : `top - ${s.hostname} (${s.os}) - Аптайм: ${s.uptimeStr}
CPU Load  ${cpuBar} ${s.loadAvg} (${cpuPercent}%)
Память    ${memBar} ${Math.round(s.memUsedMb / 1024 * 10) / 10} / ${Math.round(s.memTotalMb / 1024)} GB (${s.memPercent}%)
Пинг RTT: ${ping} мс • Статус: ONLINE [⚪]`,
          });
        } catch {
          newEntries.push({
            type: 'error',
            text: isEn ? 'Failed to fetch server telemetry' : 'Ошибка получения метрик сервера',
          });
        }
        break;

      case 'snake':
      case 'game':
      case 'play':
        setIsSnakeActive(true);
        return;

      case 'uptime':
      case 'server':
      case 'status':
        try {
          const res = await fetch(apiUrl('system-status', { _t: Date.now() }));
          const s = await res.json();
          newEntries.push({
            type: 'output',
            text: isEn ? `SERVER ${s.hostname.toUpperCase()} (${s.os}):
  Status:      ONLINE [⚪]
  Uptime:      ${s.uptimeStr}
  CPU Load:    ${s.loadAvg}
  RAM Memory:  ${Math.round(s.memUsedMb / 1024 * 10) / 10} / ${Math.round(s.memTotalMb / 1024)} GB (${s.memPercent}%)` : `СЕРВЕР ${s.hostname.toUpperCase()} (${s.os}):
  Статус:      ONLINE [⚪]
  Аптайм:      ${s.uptimeStr}
  CPU Load:    ${s.loadAvg}
  Память RAM:  ${Math.round(s.memUsedMb / 1024 * 10) / 10} / ${Math.round(s.memTotalMb / 1024)} GB (${s.memPercent}%)`,
          });
        } catch {
          newEntries.push({
            type: 'error',
            text: isEn ? 'Failed to fetch server data' : 'Ошибка получения данных с сервера',
          });
        }
        break;

      case 'guestbook':
      case 'messages':
      case 'wall':
        try {
          const res = await fetch(apiUrl('guestbook', { _t: Date.now() }));
          const data = await res.json();
          const msgs = data.messages || [];
          if (msgs.length === 0) {
            newEntries.push({
              type: 'output',
              text: isEn ? 'The guestbook wall is empty. Write the first note: msg "Your text"' : 'Стена сообщений пуста. Напишите первое: msg "Ваш текст"',
            });
          } else {
            const formatted = msgs
              .slice(0, 10)
              .map((m, i) => `[${i + 1}] ${m.name}: "${m.text}"`)
              .join('\n');
            newEntries.push({
              type: 'output',
              text: `${isEn ? 'RECENT NOTES' : 'ПОСЛЕДНИЕ СООБЩЕНИЯ'}:\n${formatted}`,
            });
          }
        } catch {
          newEntries.push({
            type: 'error',
            text: isEn ? 'Failed to load guestbook messages' : 'Ошибка загрузки сообщений со Стены',
          });
        }
        break;

      case 'msg':
      case 'post':
        if (!restArgs) {
          newEntries.push({
            type: 'error',
            text: isEn ? 'Usage: msg <message text (max 300 chars)>' : 'Использование: msg <текст сообщения (макс 300 символов)>',
          });
        } else {
          try {
            const res = await fetch(apiUrl('guestbook'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'CLI Guest',
                text: restArgs.slice(0, 300),
              }),
            });
            const data = await res.json();
            if (data.success) {
              newEntries.push({
                type: 'output',
                text: isEn ? '[OK] Note published on the Wall successfully!' : `[OK] Сообщение успешно опубликовано на Стене!`,
              });
              if (showToast) showToast(isEn ? 'Note posted to the Wall' : 'Сообщение со стены отправлено');
            } else {
              newEntries.push({
                type: 'error',
                text: `Error: ${data.error || 'Failed to post'}`,
              });
            }
          } catch {
            newEntries.push({
              type: 'error',
              text: isEn ? 'Network error posting note' : 'Ошибка сети при отправке сообщения',
            });
          }
        }
        break;

      case 'projects':
        newEntries.push({
          type: 'output',
          text: projects
            .map(
              (p, i) =>
                `[${i + 1}] ${p.title} (${p.statusBadge})\n    ${p.description}\n    ${isEn ? 'Tags' : 'Теги'}: ${p.tags.join(', ')}${p.link ? `\n    URL:  ${p.link}` : ''}`
            )
            .join('\n\n'),
        });
        break;

      case 'contact':
      case 'contacts':
      case 'socials':
        {
          const lines = (socials || [])
            .map((s) => `  ${(s.name + ':').padEnd(12, ' ')} ${s.value}${s.url && s.url !== s.value ? ` (${s.url})` : ''}`)
            .join('\n');
          newEntries.push({
            type: 'output',
            text: `${isEn ? 'CONTACTS & SOCIALS' : 'СВЯЗЬ & СОЦСЕТИ'}:\n${lines || (isEn ? '  No contacts configured' : '  Контакты не настроены')}`,
          });
        }
        break;

      case 'weather':
        newEntries.push({
          type: 'output',
          text: `${isEn ? 'WEATHER IN' : 'ПОГОДА В'} ${personal.location ? personal.location.toUpperCase() : (isEn ? 'CITY' : 'ГОРОДЕ')}:
  ${isEn ? 'Temperature' : 'Температура'}: ${weather.temp || 'N/A'}
  ${isEn ? 'Condition' : 'Состояние'}:   ${weather.desc || (isEn ? 'Clear' : 'Ясно')}
  ${isEn ? 'Coordinates' : 'Координаты'}:  ${Number.isFinite(weather.latitude) && Number.isFinite(weather.longitude) ? `${weather.latitude}, ${weather.longitude}` : 'N/A'}`,
        });
        break;

      case 'nowplaying':
      case 'np':
      case 'activity':
        {
          let actText = isEn ? 'No active games or music playing right now.' : 'Сейчас нет активных игр или музыки.';
          if (presence.activity && presence.spotify) {
            actText = isEn ? `🎮 Playing:    ${presence.activity}\n🎧 Listening:  ${presence.spotify.title}` : `🎮 Играет в:  ${presence.activity}\n🎧 Слушает:   ${presence.spotify.title}`;
          } else if (presence.activity) {
            actText = isEn ? `🎮 Playing:    ${presence.activity}` : `🎮 Играет в:  ${presence.activity}`;
          } else if (presence.spotify) {
            actText = isEn ? `🎧 Listening:  ${presence.spotify.title}\n   Album:      ${presence.spotify.album}` : `🎧 Слушает:   ${presence.spotify.title}\n   Альбом:    ${presence.spotify.album}`;
          } else if (presence.lastPlayedSpotify) {
            actText = isEn ? `🎧 Played recently: ${presence.lastPlayedSpotify.title}` : `🎧 Слушал ранее: ${presence.lastPlayedSpotify.title}`;
          }
          newEntries.push({
            type: 'output',
            text: `${isEn ? 'ACTIVITY' : 'АКТИВНОСТЬ'}:\n${actText}`,
          });
        }
        break;

      case 'matrix':
      case 'matrix-rain':
        setIsMatrixActive(true);
        newEntries.push({
          type: 'system',
          text: isEn ? 'Entering the Matrix... Press Ctrl+C or ESC to return to terminal.' : 'Вход в Матрицу... Нажмите Ctrl+C или ESC для выхода в консоль.',
        });
        break;

      case 'clear':
      case 'cls':
        setHistory([]);
        setInput('');
        return;

      case 'sudo':
        newEntries.push({
          type: 'error',
          text: `guest is not in the sudoers file. This incident will be reported to ~ ${personal.alias || personal.name || 'Admin'}.`,
        });
        break;

      case 'exit':
      case 'quit':
      case ':q':
        onClose();
        setInput('');
        return;

      default:
        newEntries.push({
          type: 'error',
          text: isEn ? `Command not found: "${cmd}". Type "help" for available commands.` : `Команда не найдена: "${cmd}". Введите "help" для списка команд.`,
        });
        break;
    }

    setHistory((prev) => [...prev, ...newEntries]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="terminal-overlay-backdrop" onClick={onClose}>
      {/* Matrix Rain Canvas Overlay */}
      {isMatrixActive && (
        <div className="matrix-canvas-wrapper" onClick={() => setIsMatrixActive(false)}>
          <canvas ref={canvasRef} className="matrix-canvas" />
        </div>
      )}

      {/* Terminal Window */}
      <div
        className={`terminal-window ${isMatrixActive ? 'terminal-window-dimmed' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.focus();
        }}
      >
        {/* Title bar */}
        <div className="terminal-titlebar">
          <div className="terminal-traffic-lights">
            <button className="terminal-dot dot-close" onClick={onClose} title={isEn ? 'Close (ESC)' : 'Закрыть (ESC)'} />
            <button className="terminal-dot dot-minimize" onClick={onClose} title={isEn ? 'Minimize' : 'Свернуть'} />
            <button
              className="terminal-dot dot-matrix"
              onClick={() => setIsMatrixActive(!isMatrixActive)}
              title="Matrix Rain"
            />
          </div>

          <div className="terminal-title">
            <TerminalIcon size={13} />
            <span>{terminalPrompt} ({appConfig.terminal.productName})</span>
          </div>

          <button className="terminal-close-btn" onClick={onClose} title={isEn ? 'Close' : 'Закрыть'}>
            <X size={15} />
          </button>
        </div>

        {/* Console Body OR Snake Game */}
        {isSnakeActive ? (
          <div
            className="terminal-snake-wrapper"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="snake-header">
              <span className="snake-title">🐍 SNAKE RETRO GAME</span>
              <span className="snake-score font-mono">{isEn ? 'Score' : 'Счёт'}: {snakeScore}</span>
              <button
                type="button"
                className="snake-exit-btn"
                onClick={() => {
                  setIsSnakeActive(false);
                  setHistory((prev) => [
                    ...prev,
                    {
                      type: 'system',
                      text: isEn ? `Game over. Final score: ${snakeScore}` : `Игра окончена. Ваш счёт: ${snakeScore}`,
                    },
                  ]);
                }}
              >
                {isEn ? 'Exit (ESC)' : 'Выход (ESC)'}
              </button>
            </div>

            <div className="snake-canvas-box">
              <canvas ref={snakeCanvasRef} className="snake-canvas" />

              {snakeGameOver && (
                <div className="snake-game-over-overlay">
                  <span className="game-over-text">{isEn ? 'GAME OVER' : 'ИГРА ОКОНЧЕНА'}</span>
                  <span className="final-score font-mono">{isEn ? 'Result' : 'Результат'}: {snakeScore}</span>
                  <button type="button" className="snake-retry-btn" onClick={restartSnake}>
                    <RotateCcw size={13} /> {isEn ? 'Restart (Space / Tap)' : 'Заново (Пробел / Тап)'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Touch D-Pad for touch screens */}
            <div className="snake-touch-dpad" aria-label="Touch D-Pad">
              <button
                type="button"
                className="snake-dpad-btn btn-up"
                onClick={() => changeDirection('up')}
                aria-label="Up"
              >
                <ArrowUp size={18} />
              </button>
              <div className="snake-dpad-row">
                <button
                  type="button"
                  className="snake-dpad-btn btn-left"
                  onClick={() => changeDirection('left')}
                  aria-label="Left"
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  type="button"
                  className="snake-dpad-btn btn-down"
                  onClick={() => changeDirection('down')}
                  aria-label="Down"
                >
                  <ArrowDown size={18} />
                </button>
                <button
                  type="button"
                  className="snake-dpad-btn btn-right"
                  onClick={() => changeDirection('right')}
                  aria-label="Right"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            <div className="snake-controls-hint">
              <span>{isEn ? 'Controls: Swipes, D-Pad or WASD • Exit: ESC' : 'Управление: Свайпы, стрелки или WASD • Выход: ESC'}</span>
            </div>
          </div>
        ) : (
          <div className="terminal-body">
            {history.map((item, idx) => (
              <div key={idx} className={`terminal-line terminal-line-${item.type}`}>
                {item.type === 'fastfetch' ? (
                  <div className="terminal-fastfetch-box">
                    <pre className="terminal-fastfetch-art">
                      {avatarFrames && avatarFrames.length > 0
                        ? avatarFrames[animFrameIndex % avatarFrames.length].join('\n')
                        : ''}
                    </pre>
                    <pre className="terminal-fastfetch-info">{item.text}</pre>
                  </div>
                ) : (
                  <pre>{item.text}</pre>
                )}
              </div>
            ))}

            {/* Prompt line */}
            <div className="terminal-input-row">
              <span className="terminal-prompt">{terminalPrompt}</span>
              <input
                ref={inputRef}
                type="text"
                className="terminal-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoComplete="off"
                placeholder={isEn ? 'Type a command (e.g. help, neofetch, snake)...' : 'Введите команду (например: help, neofetch, snake)...'}
              />
              <button
                type="button"
                className="terminal-send-btn"
                onClick={() => executeCommand(input)}
                title={isEn ? 'Execute' : 'Выполнить'}
              >
                <CornerDownLeft size={13} />
              </button>
            </div>
            <div ref={terminalEndRef} />
          </div>
        )}

        {/* Quick action chips */}
        <div className="terminal-quick-chips">
          {['help', 'neofetch', 'whoami', 'profile', 'visits', 'visitors', 'top', 'snake', 'guestbook', 'matrix'].map((c) => (
            <button
              key={c}
              className="terminal-chip"
              onClick={() => executeCommand(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
