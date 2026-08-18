export const translations = {
  ru: {
    locale: 'ru-RU',
    nav: {
      contacts: 'Контакты',
      projects: 'Проекты',
      guestbook: 'Стена',
      ariaLabel: 'Вкладки профиля',
    },
    header: {
      statusOnline: 'Online (в сети)',
      statusIdle: 'Не активен',
      statusDnd: 'Не беспокоить',
      statusOffline: 'Не в сети',
      listeningTo: 'Слушает:',
      playedEarlier: 'Слушал ранее:',
      playing: 'Играет в:',
      weatherLoading: 'Загрузка...',
      terminalBtnTitle: 'Терминал (Ctrl+K или ~)',
      themeBtnDark: 'Темная тема',
      themeBtnLight: 'Светлая тема',
    },
    lastSeen: {
      justNow: 'был только что',
      minsAgo: (m) => `был ${m} мин. назад`,
      hoursAgo: (h) => `был ${h} ч. назад`,
      todayAt: (t) => `был сегодня в ${t}`,
      yesterdayAt: (t) => `был вчера в ${t}`,
      offline: 'не в сети',
    },
    serverPopover: {
      title: 'Сервер',
      statusOnline: 'Online',
      uptime: 'Аптайм',
      ping: 'Пинг (RTT)',
      cpuLoad: 'CPU Load',
      ram: 'RAM',
      os: 'ОС',
      btnTitle: (host, uptime, ping) =>
        `Сервер ${host}: Аптайм ${uptime}${ping ? ` • Ping: ${ping}ms` : ''}`,
    },
    visitorsBadge: {
      title: 'Гости онлайн',
      onlineTag: 'Live',
      btnTitle: 'Посетители онлайн в реальном времени',
      countText: (count) => {
        const c = Math.max(0, count || 0);
        const lastTwo = c % 100;
        const lastOne = c % 10;
        let word = 'посетителей';
        if (lastTwo < 11 || lastTwo > 19) {
          if (lastOne === 1) word = 'посетитель';
          else if (lastOne >= 2 && lastOne <= 4) word = 'посетителя';
        }
        return `${c} ${word}`;
      },
      desc: 'Живой счетчик активных подключений в реальном времени.',
    },
    socials: {
      copyHint: 'Нажмите, чтобы скопировать',
      copiedToast: 'Скопировано в буфер обмена: ',
      openLink: 'Открыть ссылку',
    },
    projects: {
      privateBadge: 'Закрытый проект',
      activeBadge: 'Активный',
      devBadge: 'В разработке',
      githubTitle: 'Открыть репозиторий на GitHub',
      demoTitle: 'Live Demo',
    },
    guestbook: {
      title: 'Стена сообщений',
      placeholder: 'Оставить свой след на стене...',
      namePlaceholder: 'Ваше имя',
      sendBtn: 'Оставить след',
      sendingBtn: 'Отправка...',
      alreadyPosted: 'Вы уже оставили сообщение на Стене',
      emptyFeed: 'Стена пока пуста. Оставьте первое сообщение!',
      successToast: 'Сообщение успешно опубликовано!',
      errorNoText: 'Введите текст сообщения',
      timeJustNow: 'только что',
      timeMinsAgo: (m) => `${m} мин. назад`,
      timeHoursAgo: (h) => `${h} ч. назад`,
    },
    terminal: {
      titleBar: 'guest@lanadkopi: ~ (whoami-cli)',
      welcome: 'Добро пожаловать в whoami-cli v2.5.0! Введите "help" для списка доступных команд.',
      placeholder: 'Введите команду (например, "help", "neofetch", "snake")...',
      closeTitle: 'Закрыть (ESC)',
      minimizeTitle: 'Свернуть',
    },
  },
  en: {
    locale: 'en-US',
    nav: {
      contacts: 'Contacts',
      projects: 'Projects',
      guestbook: 'Wall',
      ariaLabel: 'Profile navigation tabs',
    },
    header: {
      statusOnline: 'Online',
      statusIdle: 'Idle',
      statusDnd: 'Do Not Disturb',
      statusOffline: 'Offline',
      listeningTo: 'Listening to:',
      playedEarlier: 'Played recently:',
      playing: 'Playing:',
      weatherLoading: 'Loading...',
      terminalBtnTitle: 'Terminal (Ctrl+K or ~)',
      themeBtnDark: 'Dark mode',
      themeBtnLight: 'Light mode',
    },
    lastSeen: {
      justNow: 'seen just now',
      minsAgo: (m) => `seen ${m}m ago`,
      hoursAgo: (h) => `seen ${h}h ago`,
      todayAt: (t) => `seen today at ${t}`,
      yesterdayAt: (t) => `seen yesterday at ${t}`,
      offline: 'offline',
    },
    serverPopover: {
      title: 'Server',
      statusOnline: 'Online',
      uptime: 'Uptime',
      ping: 'Ping (RTT)',
      cpuLoad: 'CPU Load',
      ram: 'RAM',
      os: 'OS',
      btnTitle: (host, uptime, ping) =>
        `Server ${host}: Uptime ${uptime}${ping ? ` • Ping: ${ping}ms` : ''}`,
    },
    visitorsBadge: {
      title: 'Live Visitors',
      onlineTag: 'Live',
      btnTitle: 'Active visitors connected in real-time',
      countText: (count) => {
        const c = Math.max(0, count || 0);
        return `${c} visitor${c === 1 ? '' : 's'}`;
      },
      desc: 'Real-time heartbeat of active website visitors.',
    },
    socials: {
      copyHint: 'Click to copy handle',
      copiedToast: 'Copied to clipboard: ',
      openLink: 'Open link',
    },
    projects: {
      privateBadge: 'Private project',
      activeBadge: 'Active',
      devBadge: 'In development',
      githubTitle: 'View repository on GitHub',
      demoTitle: 'Live Demo',
    },
    guestbook: {
      title: 'Guestbook Wall',
      placeholder: 'Leave your mark on the wall...',
      namePlaceholder: 'Your name',
      sendBtn: 'Post note',
      sendingBtn: 'Posting...',
      alreadyPosted: 'You have already posted on the Wall',
      emptyFeed: 'The wall is empty. Be the first to leave a note!',
      successToast: 'Note published successfully!',
      errorNoText: 'Please enter a message',
      timeJustNow: 'just now',
      timeMinsAgo: (m) => `${m}m ago`,
      timeHoursAgo: (h) => `${h}h ago`,
    },
    terminal: {
      titleBar: 'guest@lanadkopi: ~ (whoami-cli)',
      welcome: 'Welcome to whoami-cli v2.5.0! Type "help" for a list of available commands.',
      placeholder: 'Type a command (e.g. "help", "neofetch", "snake")...',
      closeTitle: 'Close (ESC)',
      minimizeTitle: 'Minimize',
    },
  },
};

export function getLanguage(configLang) {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang')?.toLowerCase();
    if (urlLang === 'en' || urlLang === 'ru') return urlLang;
  }
  if (configLang && (configLang.toLowerCase().startsWith('en') || configLang.toLowerCase() === 'en')) {
    return 'en';
  }
  return 'ru';
}

export function useI18n(configLang) {
  const lang = getLanguage(configLang);
  return {
    lang,
    t: translations[lang] || translations.ru,
  };
}
