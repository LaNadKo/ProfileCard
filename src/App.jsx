import React, { useState, useCallback, useEffect } from 'react';
import { useProfileConfig } from './hooks/useProfileConfig';
import { FireBackground } from './components/FireBackground';
import { ProfileHeader } from './components/ProfileHeader';
import { NavigationTabs } from './components/NavigationTabs';
import { SocialLinks } from './components/SocialLinks';
import { ProjectsSection } from './components/ProjectsSection';
import { GuestbookTab } from './components/GuestbookTab';
import { TerminalModal } from './components/TerminalModal';
import { Toast } from './components/Toast';
import { usePresence } from './hooks/usePresence';
import { useWeather } from './hooks/useWeather';
import { getLanguage } from './i18n/translations';
import './styles/global.css';
import './styles/card.css';

export function App() {
  const config = useProfileConfig();
  const lang = getLanguage(config.lang);
  const [activeTab, setActiveTab] = useState('contacts');
  const [toastMessage, setToastMessage] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [guestbookCount, setGuestbookCount] = useState(0);

  // Global shared presence and weather
  const presence = usePresence({
    discordUserId: config.personal.discordUserId,
    lang,
  });
  const weather = useWeather(config.weather, lang);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  // Global hotkeys: Ctrl+K / Cmd+K or Backquote (~) to open Terminal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      } else if (e.key === '`' || e.key === '~') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          setIsTerminalOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Living Atmospheric Monochrome Fire & Embers Background */}
      <FireBackground />

      <main className="card-perspective-container">
        <div className="profile-card">
          {/* Header Section with Live Video Avatar & Presence */}
          <ProfileHeader
            personal={config.personal}
            presence={presence}
            weather={weather}
            showToast={showToast}
            onOpenTerminal={() => setIsTerminalOpen(true)}
            lang={lang}
          />

          {/* Tab Navigation (Контакты / Проекты / Стена) */}
          <NavigationTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            guestbookCount={guestbookCount}
            lang={lang}
          />

          {/* Persistent Tab Panes (Zero lag, 60fps instant switching on mobile) */}
          <div className="tab-content">
            <div className={`tab-pane ${activeTab === 'contacts' ? 'tab-pane-active' : 'tab-pane-hidden'}`}>
              <SocialLinks socials={config.socials} showToast={showToast} lang={lang} />
            </div>

            <div className={`tab-pane ${activeTab === 'projects' ? 'tab-pane-active' : 'tab-pane-hidden'}`}>
              <ProjectsSection projects={config.projects} lang={lang} />
            </div>

            <div className={`tab-pane ${activeTab === 'guestbook' ? 'tab-pane-active' : 'tab-pane-hidden'}`}>
              <GuestbookTab
                showToast={showToast}
                onCountChange={setGuestbookCount}
                config={config.guestbook}
                lang={lang}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Interactive CLI Terminal / Easter Egg Modal */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        personal={config.personal}
        projects={config.projects}
        socials={config.socials}
        weather={weather}
        presence={presence}
        showToast={showToast}
        lang={lang}
      />

      {/* Floating Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </>
  );
}

export default App;
