import React, { useState, useRef, useEffect } from 'react';
import { Users, Eye } from 'lucide-react';
import { useLiveVisitors } from '../hooks/useLiveVisitors';
import { useI18n } from '../i18n/translations';

export const LiveVisitorsBadge = ({ lang }) => {
  const { t } = useI18n(lang);
  const [isOpen, setIsOpen] = useState(false);
  const visitors = useLiveVisitors();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="visitors-badge-wrapper" ref={dropdownRef}>
      <button
        className={`icon-btn visitors-btn ${isOpen ? 'visitors-btn-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t.visitorsBadge.btnTitle}
        aria-label="Live visitors count"
      >
        <Users size={15} />
        <span className="visitors-count-pill font-mono">{visitors.count}</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="visitors-popover">
          <div className="visitors-popover-header">
            <div className="visitors-header-left">
              <Eye size={14} className="visitors-icon" />
              <span className="visitors-title">{t.visitorsBadge.title}</span>
            </div>
            <div className="visitors-live-tag">
              <span className="visitors-tag-dot" />
              <span>{t.visitorsBadge.onlineTag}</span>
            </div>
          </div>

          <div className="visitors-body">
            <div className="visitors-big-num font-mono">
              <span className="visitors-big-digits">{visitors.count}</span>
              <span className="visitors-big-label">
                {lang === 'en'
                  ? (visitors.count === 1 ? 'visitor' : 'visitors')
                  : t.visitorsBadge.countText(visitors.count).split(' ')[1]}
              </span>
            </div>
            <p className="visitors-desc">{t.visitorsBadge.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
};
