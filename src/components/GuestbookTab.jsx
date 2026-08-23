import React, { useState, useCallback } from 'react';
import { Send, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { apiUrl, appConfig, storageKey } from '../config/appConfig';
import { useI18n } from '../i18n/translations';
import { useSmartPolling } from '../hooks/useSmartPolling';

const containsLink = (str) => {
  if (!str) return false;
  const urlPattern = /(https?:\/\/|www\.|t\.me\/|discord\.gg\/|\.com\b|\.ru\b|\.xyz\b|\.net\b|\.org\b|\.io\b)/i;
  return urlPattern.test(str);
};

export const GuestbookTab = ({ showToast, onCountChange, config = {}, lang, isActive = true }) => {
  const { t } = useI18n(lang);
  const allowedReactions = Array.isArray(config.allowedReactions) ? config.allowedReactions : [];
  const maxNameLength = Number(config.maxNameLength) || 50;
  const maxMessageLength = Number(config.maxMessageLength) || 300;
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPosted, setHasPosted] = useState(false);

  const formatMessageTime = (sec) => {
    if (!sec) return '';
    const nowSec = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, nowSec - sec);

    if (diff < 60) return t.guestbook.timeJustNow;
    if (diff < 3600) return t.guestbook.timeMinsAgo(Math.floor(diff / 60));
    if (diff < 86400) return t.guestbook.timeHoursAgo(Math.floor(diff / 3600));

    const d = new Date(sec * 1000);
    return d.toLocaleDateString(t.locale, { day: 'numeric', month: 'short' });
  };

  const fetchMessages = useCallback(async ({ signal } = {}) => {
    try {
      const res = await fetch(apiUrl('guestbook', { _t: Date.now() }), { signal });
      if (res.ok) {
        const data = await res.json();
        const msgList = data.messages || [];
        setMessages(msgList);
        if (onCountChange) onCountChange(msgList.length);

        const posted = Boolean(data.hasPosted);
        setHasPosted(posted);
        if (posted) {
          localStorage.setItem(storageKey('guestbook_posted'), 'true');
        } else {
          localStorage.removeItem(storageKey('guestbook_posted'));
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        const local = localStorage.getItem(storageKey('guestbook_posted')) === 'true';
        setHasPosted(local);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onCountChange]);

  useSmartPolling(fetchMessages, {
    interval: appConfig.polling.guestbookMs || 20000,
    maxBackoff: 60000,
    enabled: isActive,
  });

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await fetch(apiUrl('guestbook/react'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } else if (res.status === 429) {
        showToast('Too many reactions. Please wait.');
      }
    } catch {
      showToast('Error setting reaction');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasPosted) {
      showToast(t.guestbook.alreadyPosted);
      return;
    }

    const cleanName = name.trim();
    const cleanText = text.trim();

    if (containsLink(cleanName)) {
      showToast('Links in username are forbidden');
      return;
    }

    if (cleanName.length > maxNameLength) {
      showToast(`Max name length is ${maxNameLength} chars`);
      return;
    }

    if (!cleanText) {
      showToast(t.guestbook.errorNoText);
      return;
    }
    if (cleanText.length > maxMessageLength) {
      showToast(`Max ${maxMessageLength} chars`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl('guestbook'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName || (lang === 'en' ? 'Anonymous' : 'Аноним'),
          text: cleanText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setText('');
        setName('');
        setHasPosted(true);
        localStorage.setItem(storageKey('guestbook_posted'), 'true');
        showToast(t.guestbook.successToast);
        if (data.messages) {
          setMessages(data.messages);
          if (onCountChange) onCountChange(data.messages.length);
        } else {
          fetchMessages();
        }
      } else {
        const posted = Boolean(data.hasPosted);
        setHasPosted(posted);
        if (posted) {
          localStorage.setItem(storageKey('guestbook_posted'), 'true');
        }
        showToast(data.error || 'Failed to post note');
      }
    } catch {
      showToast('Network error while posting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="guestbook-container">
      {/* Form Input OR Already Posted Badge */}
      {!hasPosted ? (
        <form className="guestbook-form" onSubmit={handleSubmit}>
          <div className="guestbook-form-header">
            <input
              type="text"
              className="guestbook-name-input"
              placeholder={`${t.guestbook.namePlaceholder} (max ${maxNameLength})`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={maxNameLength}
            />
            <span className={`char-counter ${text.length > maxMessageLength * 0.9 ? 'char-counter-warn' : ''}`}>
              {text.length} / {maxMessageLength}
            </span>
          </div>

          <div className="guestbook-textarea-wrapper">
            <textarea
              className="guestbook-textarea"
              placeholder={t.guestbook.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={maxMessageLength}
              rows={2}
            />
            <button
              type="submit"
              className="guestbook-send-btn"
              disabled={isSubmitting || !text.trim()}
              title={t.guestbook.sendBtn}
            >
              <Send size={14} />
              <span>{isSubmitting ? t.guestbook.sendingBtn : t.guestbook.sendBtn}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="guestbook-already-posted">
          <CheckCircle2 size={16} className="guestbook-check-icon" />
          <span>{t.guestbook.alreadyPosted}</span>
        </div>
      )}

      {/* Messages Feed */}
      <div className="guestbook-feed">
        {isLoading ? (
          <div className="guestbook-empty">{t.guestbook.sendingBtn}</div>
        ) : messages.length === 0 ? (
          <div className="guestbook-empty">
            <MessageSquare size={24} className="guestbook-empty-icon" />
            <p>{t.guestbook.emptyFeed}</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="guestbook-card">
              <div className="guestbook-card-header">
                <div className="guestbook-author-group">
                  <div className="guestbook-avatar-dot">
                    {(m.name || 'A')[0].toUpperCase()}
                  </div>
                  <span className="guestbook-author-name">{m.name || (lang === 'en' ? 'Anonymous' : 'Аноним')}</span>
                </div>
                <span className="guestbook-time font-mono">
                  <Clock size={11} /> {formatMessageTime(m.updatedAt || m.createdAt)}
                </span>
              </div>
              
              <p className="guestbook-card-text">{m.text}</p>

              {/* Emoji Reaction Bar */}
              <div className="guestbook-reactions-row">
                {allowedReactions.map((emoji) => {
                  const reaction = m.reactions?.[emoji];
                  const count = Number(reaction?.count ?? (typeof reaction === 'number' ? reaction : 0));
                  const isUserReacted = Boolean(reaction?.userReacted || (Array.isArray(m.userReactions) && m.userReactions.includes(emoji)));

                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`guestbook-reaction-chip ${isUserReacted ? 'active' : ''}`}
                      onClick={() => handleReact(m.id, emoji)}
                      title={`${emoji} (${count})`}
                    >
                      <span className="reaction-emoji">{emoji}</span>
                      {count > 0 && <span className="reaction-count font-mono">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
