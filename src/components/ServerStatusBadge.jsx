import React, { useState, useRef, useEffect } from 'react';
import { Server, Activity, Cpu, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { useServerStatus } from '../hooks/useServerStatus';
import { useI18n } from '../i18n/translations';

export const ServerStatusBadge = ({ lang }) => {
  const { t } = useI18n(lang);
  const [isOpen, setIsOpen] = useState(false);
  const server = useServerStatus();
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
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
    <div className="server-status-wrapper" ref={dropdownRef}>
      <button
        className={`icon-btn server-btn ${isOpen ? 'server-btn-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t.serverPopover.btnTitle(server.hostname, server.uptimeStr, server.pingMs)}
        aria-label="Server status"
      >
        <Server size={15} />
        <span className="server-live-dot" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="server-popover">
          <div className="server-popover-header">
            <div className="server-header-left">
              <ShieldCheck size={14} className="server-shield-icon" />
              <span className="server-title">{server.hostname}</span>
            </div>
            <div className="server-status-pill">
              <span className="server-pill-dot" />
              <span>{t.serverPopover.statusOnline}</span>
            </div>
          </div>

          <div className="server-metrics-grid">
            <div className="server-metric-item">
              <span className="metric-label">
                <Activity size={12} /> {t.serverPopover.uptime}
              </span>
              <span className="metric-value font-mono">{server.uptimeStr}</span>
            </div>

            <div className="server-metric-item">
              <span className="metric-label">
                <Zap size={12} /> {t.serverPopover.ping}
              </span>
              <span className="metric-value font-mono">{server.pingMs !== null ? `${server.pingMs} ${lang === 'en' ? 'ms' : 'мс'}` : '—'}</span>
            </div>

            <div className="server-metric-item">
              <span className="metric-label">
                <Cpu size={12} /> {t.serverPopover.cpuLoad}
              </span>
              <span className="metric-value font-mono">{server.loadAvg}</span>
            </div>

            <div className="server-metric-item">
              <span className="metric-label">
                <HardDrive size={12} /> {t.serverPopover.ram} ({server.memPercent}%)
              </span>
              <span className="metric-value font-mono">
                {Math.round(server.memUsedMb / 1024 * 10) / 10} / {Math.round(server.memTotalMb / 1024)} GB
              </span>
            </div>

            <div className="server-metric-item">
              <span className="metric-label">{t.serverPopover.os}</span>
              <span className="metric-value">{server.os}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
