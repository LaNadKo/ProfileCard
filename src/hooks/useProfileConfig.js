import { useState, useEffect } from 'react';
import { profileData as initialProfileData } from '../data/profileData';
import { apiUrl, appConfig, storageKey } from '../config/appConfig';

function getCached(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setCached(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore quota errors
  }
}

export function useProfileConfig() {
  const [profile, setProfile] = useState(() => getCached(storageKey('profile'), initialProfileData.personal));
  const [socials, setSocials] = useState(() => getCached(storageKey('socials'), initialProfileData.socials));
  const [projects, setProjects] = useState(() => getCached(storageKey('projects'), []));
  const [weather, setWeather] = useState(() => getCached(storageKey('weather'), initialProfileData.weather));
  const [guestbook, setGuestbook] = useState(() => getCached(storageKey('guestbook'), initialProfileData.guestbook));
  const [lang, setLang] = useState(() => getCached(storageKey('lang'), 'ru'));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDynamicConfig() {
      try {
        // Fetch dynamic profile contacts
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const urlLang = urlParams?.get('lang')?.toLowerCase();
        const profRes = await fetch(apiUrl('profile', (urlLang === 'ru' || urlLang === 'en') ? { lang: urlLang } : {}));
        if (profRes.ok) {
          const profData = await profRes.json();
          if (isMounted && profData) {
            if (profData.lang) {
              setLang(profData.lang);
              setCached(storageKey('lang'), profData.lang);
            }
            if (profData.personal) {
              setProfile(profData.personal);
              setCached(storageKey('profile'), profData.personal);
            }
            if (profData.socials && Array.isArray(profData.socials)) {
              setSocials(profData.socials);
              setCached(storageKey('socials'), profData.socials);
            }
            if (profData.weather) {
              setWeather(profData.weather);
              setCached(storageKey('weather'), profData.weather);
            }
            if (profData.guestbook) {
              setGuestbook(profData.guestbook);
              setCached(storageKey('guestbook'), profData.guestbook);
            }
          }
        }
      } catch {
        // Fallback to cache
      }

      try {
        // Fetch dynamic GitHub projects (instantly cached from server)
        const projRes = await fetch(apiUrl('projects'));
        if (projRes.ok) {
          const projData = await projRes.json();
          if (isMounted && projData && Array.isArray(projData.projects) && projData.projects.length > 0) {
            setProjects(projData.projects);
            setCached(storageKey('projects'), projData.projects);
          }
        }
      } catch {
        // Fallback to cache
      }

      if (isMounted) {
        setLoaded(true);
      }
    }

    loadDynamicConfig();

    // Refresh every 5 minutes in background
    const interval = setInterval(loadDynamicConfig, appConfig.polling.profileMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!profile?.name) return;

    const title = profile.alias ? `${profile.name} · ${profile.alias}` : profile.name;
    const description = profile.bio || title;
    const canonicalUrl = profile.canonicalUrl || window.location.href;
    const imageUrl = profile.avatar ? new URL(profile.avatar, canonicalUrl).toString() : '';

    document.title = title;
    const metadata = {
      'meta[name="description"]': description,
      'meta[property="og:url"]': canonicalUrl,
      'meta[property="og:site_name"]': profile.name,
      'meta[property="og:title"]': title,
      'meta[property="og:description"]': description,
      'meta[property="og:image"]': imageUrl,
      'meta[property="og:image:secure_url"]': imageUrl,
      'meta[property="og:image:alt"]': profile.name,
      'meta[name="twitter:title"]': title,
      'meta[name="twitter:description"]': description,
      'meta[name="twitter:image"]': imageUrl,
    };

    Object.entries(metadata).forEach(([selector, value]) => {
      document.querySelector(selector)?.setAttribute('content', value);
    });
  }, [profile]);

  return {
    personal: profile,
    socials,
    projects,
    weather,
    guestbook,
    lang,
    loaded
  };
}
