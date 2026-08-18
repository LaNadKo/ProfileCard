import React from 'react';
import { AtSign, FolderGit2, MessageSquare } from 'lucide-react';
import { useI18n } from '../i18n/translations';

export const NavigationTabs = ({ activeTab, onSelectTab, guestbookCount = 0, lang }) => {
  const { t } = useI18n(lang);
  const tabs = [
    { id: 'contacts', label: t.nav.contacts, icon: <AtSign size={15} /> },
    { id: 'projects', label: t.nav.projects, icon: <FolderGit2 size={15} /> },
    {
      id: 'guestbook',
      label: t.nav.guestbook,
      icon: <MessageSquare size={15} />,
      badge: Number.isInteger(guestbookCount) && guestbookCount > 0 ? guestbookCount : null,
    },
  ];

  return (
    <nav className="tabs-navigation" aria-label={t.nav.ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          type="button"
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge && (
            <span className="tab-badge-count font-mono">{tab.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
};
