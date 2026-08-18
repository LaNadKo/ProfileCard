import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { GithubIcon, TelegramIcon, DiscordIcon, SteamIcon, TikTokIcon, SpotifyIcon } from './Icons';
import { useI18n } from '../i18n/translations';

export const SocialLinks = ({ socials, showToast, lang }) => {
  const { t } = useI18n(lang);

  const getIcon = (id) => {
    switch (id) {
      case 'telegram':
        return <TelegramIcon size={18} />;
      case 'discord':
        return <DiscordIcon size={18} />;
      case 'steam':
        return <SteamIcon size={18} />;
      case 'github':
        return <GithubIcon size={18} />;
      case 'tiktok':
        return <TikTokIcon size={18} />;
      case 'spotify':
        return <SpotifyIcon size={18} />;
      default:
        return null;
    }
  };

  const handleCopy = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(item.value);
    showToast(`${t.socials.copiedToast}${item.name} (${item.value})`);
  };

  return (
    <div className="tab-content">
      <div className="socials-vertical-list">
        {socials.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="social-row-item"
            title={`${t.socials.openLink}: ${item.name}`}
          >
            <div className="social-row-left">
              <div className="social-icon-box">
                {getIcon(item.id)}
              </div>
              <div className="social-info">
                <div className="social-title-line">
                  <span className="social-name">{item.name}</span>
                  {item.label && <span className="social-badge-hint">{item.label}</span>}
                </div>
                <span className="social-val">{item.value}</span>
              </div>
            </div>

            <div className="social-row-right">
              {item.copyable ? (
                <button
                  type="button"
                  className="social-action-icon-btn"
                  onClick={(e) => handleCopy(e, item)}
                  title={`${t.socials.copyHint}: ${item.value}`}
                >
                  <Copy size={16} />
                </button>
              ) : (
                <span className="social-action-icon-btn">
                  <ExternalLink size={16} />
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
