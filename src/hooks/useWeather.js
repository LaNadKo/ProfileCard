import { useState, useEffect } from 'react';
import { appConfig } from '../config/appConfig';

function getWeatherDescription(code, isDay, isEn) {
  if (code === 0) {
    if (isEn) return isDay ? 'Clear sky' : 'Clear night';
    return isDay ? 'Ясно' : 'Ясная ночь';
  }
  if (code === 1) {
    return isEn ? 'Mainly clear' : 'Малооблачно';
  }
  if (code === 2) {
    return isEn ? 'Partly cloudy' : 'Переменная облачность';
  }
  if (code === 3) {
    return isEn ? 'Overcast' : 'Пасмурно';
  }
  if (code === 45 || code === 48) {
    return isEn ? 'Foggy' : 'Туман';
  }
  if (code >= 51 && code <= 67) {
    return isEn ? 'Rain' : 'Дождь';
  }
  if (code >= 71 && code <= 77) {
    return isEn ? 'Snow' : 'Снег';
  }
  if (code >= 80 && code <= 82) {
    return isEn ? 'Heavy rain' : 'Ливень';
  }
  if (code >= 95) {
    return isEn ? 'Thunderstorm' : 'Гроза';
  }
  return isEn ? 'Clear' : 'Ясно';
}

function getWeatherIconType(code, isDay) {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code >= 1 && code <= 3) return isDay ? 'cloud-sun' : 'cloud-moon';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 95) return 'thunder';
  return isDay ? 'sun' : 'moon';
}

/**
 * Live weather hook driven by Open-Meteo with full bilingual support.
 */
export function useWeather(config = {}, lang = 'ru') {
  const isEn = lang === 'en';
  const [weather, setWeather] = useState({
    temp: null,
    weatherCode: 0,
    isDay: 1,
    desc: isEn ? 'Loading...' : 'Загрузка...',
    iconType: 'sun',
    loaded: false,
    latitude: config.latitude ?? null,
    longitude: config.longitude ?? null,
    locationLabel: config.locationLabel || '',
    timezone: config.timezone || '',
  });

  useEffect(() => {
    const latitude = Number(config.latitude);
    const longitude = Number(config.longitude);
    const apiUrl = config.apiUrl?.trim();
    const locationLabel = config.locationLabel?.trim() || '';

    if (!apiUrl || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setWeather((prev) => ({
        ...prev,
        temp: null,
        loaded: true,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        locationLabel,
        timezone: config.timezone || '',
      }));
      return undefined;
    }

    const fetchWeather = async () => {
      try {
        const query = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current: 'temperature_2m,weather_code,is_day',
          timezone: config.timezone || 'auto',
        });
        const res = await fetch(`${apiUrl}?${query.toString()}`);
        if (!res.ok) throw new Error('Weather request failed');
        const data = await res.json();

        if (data && data.current) {
          const rawTemp = Math.round(data.current.temperature_2m);
          const tempStr = rawTemp > 0 ? `+${rawTemp}°C` : `${rawTemp}°C`;
          const code = data.current.weather_code;
          const isDay = data.current.is_day;

          const desc = getWeatherDescription(code, isDay, isEn);
          const iconType = getWeatherIconType(code, isDay);

          setWeather({
            temp: tempStr,
            weatherCode: code,
            isDay,
            desc: locationLabel ? `${desc} — ${locationLabel} (${tempStr})` : `${desc} (${tempStr})`,
            iconType,
            loaded: true,
            latitude,
            longitude,
            locationLabel,
            timezone: config.timezone || '',
          });
        }
      } catch {
        // Soft fallback
        setWeather((prev) => ({ ...prev, loaded: true }));
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, appConfig.polling.weatherMs);
    return () => clearInterval(interval);
  }, [config.apiUrl, config.latitude, config.longitude, config.locationLabel, config.timezone, isEn]);

  return weather;
}
