import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Clock,
  Gamepad2,
  Terminal as TerminalIcon,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  ExternalLink,
  Music,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ServerStatusBadge } from './ServerStatusBadge';
import { LiveVisitorsBadge } from './LiveVisitorsBadge';
import { appConfig } from '../config/appConfig';
import { useI18n } from '../i18n/translations';

const formatTime = (ms) => {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const PRESENCE_LABELS = {
  online: '● PRESENCE ONLINE',
  idle: '◐ PRESENCE IDLE',
  dnd: '● PRESENCE BUSY',
  offline: '○ PRESENCE OFFLINE'
};

export const ProfileHeader = ({ personal, presence, weather, showToast, onOpenTerminal, lang }) => {
  const { t } = useI18n(lang);
  const [liveTime, setLiveTime] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [imgError, setImgError] = useState(false);
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const currentTimeRef = useRef(null);

  // Reset img error on new track
  useEffect(() => {
    setImgError(false);
  }, [presence.spotify?.song, presence.lastPlayedSpotify?.song]);

  // Zero-Rerender High-Performance Spotify progress bar + Time Ticker
  useEffect(() => {
    const spotify = presence.spotify;
    if (!spotify) {
      progressRef.current?.style.setProperty('--spotify-progress', '0%');
      return;
    }

    const startProgress = Number.isFinite(spotify.progressMs) ? spotify.progressMs : 0;
    const duration = Number.isFinite(spotify.durationMs) ? spotify.durationMs : 0;
    const startedAt = performance.now();

    let rafId;
    let previousSecond = -1;

    const tick = (now) => {
      const current = Math.min(startProgress + now - startedAt, duration);
      const percent = duration > 0 ? (current / duration) * 100 : 0;

      if (progressRef.current) {
        progressRef.current.style.setProperty('--spotify-progress', `${percent}%`);
      }

      const second = Math.floor(current / 1000);
      if (second !== previousSecond) {
        previousSecond = second;
        if (currentTimeRef.current) {
          currentTimeRef.current.textContent = formatTime(current);
        }
      }

      if (current < duration) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [presence.spotify?.song, presence.spotify?.progressMs, presence.spotify?.durationMs]);

  // Live real clock with seconds (HH:MM:SS)
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeString = now.toLocaleTimeString(t.locale, {
          ...(personal.timezone ? { timeZone: personal.timezone } : {}),
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLiveTime(timeString);
      } catch {
        const now = new Date();
        setLiveTime(now.toTimeString().split(' ')[0]);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [personal.timezone, t.locale]);

  const toggleVideoPlayback = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      showToast(lang === 'en' ? 'Video resumed' : 'Видео воспроизводится');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      showToast(lang === 'en' ? 'Video paused' : 'Видео на паузе');
    }
  };

  const renderWeatherIcon = () => {
    const size = 14;
    switch (weather.iconType) {
      case 'sun':
        return <Sun size={size} />;
      case 'moon':
        return <Moon size={size} />;
      case 'cloud-sun':
        return <CloudSun size={size} />;
      case 'cloud-moon':
        return <CloudMoon size={size} />;
      case 'rain':
        return <CloudRain size={size} />;
      case 'snow':
        return <CloudSnow size={size} />;
      case 'thunder':
        return <CloudLightning size={size} />;
      case 'fog':
        return <CloudFog size={size} />;
      default:
        return <CloudSun size={size} />;
    }
  };

  const presenceLabel =
    PRESENCE_LABELS[presence.discord_status] ??
    (presence.isOnline ? '● PRESENCE ONLINE' : '○ PRESENCE OFFLINE');

  return (
    <header>
      {/* Top action bar: Nexus Identity Node + Presence + Server status + Live visitors + Terminal + Theme controls */}
      <div className="card-top-bar">
        <div className="node-identity-header font-mono">
          <span className="node-nexus-badge">NEXUS / IDENTITY</span>
          <span className="node-num-badge">NODE 01</span>
        </div>

        <div className="top-controls">
          <div
            className={`status-badge status-${presence.statusType}`}
            title={presence.isOnline ? t.header.statusOnline : presence.statusText}
          >
            <span className={`status-dot status-dot-${presence.statusType}`}></span>
            <span>{presenceLabel}</span>
          </div>

          <ServerStatusBadge lang={lang} />
          <LiveVisitorsBadge lang={lang} />

          <button
            className="icon-btn terminal-launch-btn"
            onClick={onOpenTerminal}
            title={t.header.terminalBtnTitle}
            aria-label="Terminal CLI"
          >
            <TerminalIcon size={16} />
          </button>

          <ThemeToggle lang={lang} />
        </div>
      </div>

      {/* Hero avatar and title */}
      <div className="profile-hero">
        <div
          className="avatar-wrapper video-avatar-container"
          onClick={toggleVideoPlayback}
          title={isPlaying ? (lang === 'en' ? 'Click to pause' : 'Нажмите для паузы') : (lang === 'en' ? 'Click to play' : 'Нажмите для воспроизведения')}
        >
          <div className="avatar-monochrome-glow"></div>

          {personal.videoAvatar ? (
            <video
              ref={videoRef}
              src={personal.videoAvatar}
              poster={personal.videoPoster || personal.avatar}
              autoPlay
              loop
              muted
              playsInline
              className="avatar-img avatar-video"
            />
          ) : (
            <img
              src={personal.avatar}
              alt={personal.name}
              className="avatar-img"
            />
          )}
        </div>

        <div className="user-name-row">
          <h1 className="user-name">{personal.name}</h1>
        </div>

        {personal.alias && (
          <div className="user-alias-badge">
            <span>~ {personal.alias}</span>
          </div>
        )}

        {personal.bio && (
          <p className="profile-bio-short">{personal.bio}</p>
        )}

        {/* Joint Activity Widgets under Bio (Game + Spotify + Last-Played) */}
        <div className="profile-activities-container">
          {presence.isOnline && presence.activity && (
            <div
              className="profile-activity-pill activity-game-pill"
              title={`${t.header.playing} ${presence.activity}`}
            >
              <Gamepad2 size={13} className="activity-icon activity-game" />
              <span className="activity-text">
                {t.header.playing} <strong className="activity-title">{presence.activity}</strong>
              </span>
            </div>
          )}

          {/* Active Live Spotify Player */}
          {presence.spotify ? (
            <a
              href={presence.spotify.trackUri || presence.spotify.trackUrl}
              className="profile-activity-pill activity-music-pill activity-link-pill"
              title={`${t.header.listeningTo} ${presence.spotify.title}`}
            >
              {/* Main track info line */}
              <div className="spotify-pill-main-row">
                {presence.spotify.albumArtUrl && !imgError ? (
                  <img
                    src={presence.spotify.albumArtUrl}
                    alt={presence.spotify.album || 'Cover'}
                    className="spotify-mini-art"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Music size={13} className="activity-icon" />
                )}

                {/* 5-Bar Refined Monochrome Equalizer */}
                <div className="spotify-live-eq" aria-hidden="true">
                  <span className="eq-bar eq-1"></span>
                  <span className="eq-bar eq-2"></span>
                  <span className="eq-bar eq-3"></span>
                  <span className="eq-bar eq-4"></span>
                  <span className="eq-bar eq-5"></span>
                </div>

                <span className="activity-text">
                  {t.header.listeningTo} <strong className="activity-title">{presence.spotify.title}</strong>
                </span>

                <ExternalLink size={11} className="activity-ext-icon" />
              </div>

              {/* Zero-Rerender DOM Progress Bar & Time */}
              {presence.spotify.durationMs > 0 && (
                <div className="spotify-progress-container">
                  <div className="spotify-progress-bar-bg">
                    <div
                      ref={progressRef}
                      className="spotify-progress-bar-fill"
                      style={{ width: 'var(--spotify-progress, 0%)' }}
                    />
                  </div>
                  <div className="spotify-progress-time">
                    <span ref={currentTimeRef}>{formatTime(presence.spotify.progressMs || 0)}</span>
                    <span>{formatTime(presence.spotify.durationMs)}</span>
                  </div>
                </div>
              )}
            </a>
          ) : presence.lastPlayedSpotify ? (
            /* Subtle Last Played Track Cache when paused */
            <a
              href={presence.lastPlayedSpotify.trackUri || presence.lastPlayedSpotify.trackUrl}
              className="profile-activity-pill activity-last-played-pill"
              title={`${t.header.playedEarlier} ${presence.lastPlayedSpotify.title}`}
            >
              {presence.lastPlayedSpotify.albumArtUrl && !imgError ? (
                <img
                  src={presence.lastPlayedSpotify.albumArtUrl}
                  alt={presence.lastPlayedSpotify.album || 'Cover'}
                  className="spotify-mini-art"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Music size={12} className="activity-icon" />
              )}
              <span className="activity-text">
                {t.header.playedEarlier} <strong className="activity-title">{presence.lastPlayedSpotify.title}</strong>
              </span>
              <ExternalLink size={11} className="activity-ext-icon" />
            </a>
          ) : null}
        </div>

        {/* Meta Info Row: Location, Live Weather, and Live Clock */}
        <div className="meta-info-row">
          <a
            href={`${appConfig.mapsSearchBaseUrl}${encodeURIComponent(personal.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="meta-item meta-link"
            title={`Open ${personal.location || 'location'} on Google Maps`}
          >
            <MapPin size={14} />
            <span>{personal.location}</span>
          </a>

          {/* Live Weather Item */}
          {weather.loaded && weather.temp && (
            <div className="meta-item weather-item" title={weather.desc}>
              <span className="weather-icon-box">{renderWeatherIcon()}</span>
              <span className="weather-temp-digits">{weather.temp}</span>
            </div>
          )}

          {/* Live Clock Item */}
          <div className="meta-item time-item" title="Local Time">
            <span className="live-time-dot"></span>
            <Clock size={14} />
            <span className="time-digits">{liveTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
