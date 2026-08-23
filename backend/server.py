#!/usr/bin/env python3
"""
whoami Unified Backend Daemon
-----------------------------
Features:
- Autonomous Spotify Web API Presence with 1-min last-played cache
- Telegram-style Last-Seen tracking
- Real-time CPU / RAM / Disk / OS system metrics
- Unique IP visits counter and recent visitors ledger
- Live concurrent visitors heartbeat counter (2.5s window)
- SQLite persistent Guestbook with rate limiting, anti-spam & reactions
"""

import http.server
import socketserver
import urllib.parse
import urllib.request
import base64
import json
import time
import os
import sqlite3
import hashlib
import hmac
import html
import re
import threading
import platform
import socket
import secrets
from datetime import datetime

# Load environment variables from .env file if present
def load_dotenv(dotenv_path=".env"):
    if not os.path.exists(dotenv_path):
        return
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k and k not in os.environ:
                os.environ[k] = v

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

def env_int(name, default):
    try:
        return int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default

def env_float(name, default):
    try:
        return float(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default

def env_bool(name, default=False):
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in ("true", "1", "yes", "on", "t", "y")

def optional_float(value):
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None

def env_csv(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]

DB_PATH = os.environ.get("DB_PATH", os.path.join(BACKEND_DIR, "data.db"))
if not os.path.isabs(DB_PATH):
    DB_PATH = os.path.join(BACKEND_DIR, DB_PATH)
PORT = env_int("PORT", 8095)
BIND_HOST = os.environ.get("BIND_HOST", "0.0.0.0").strip()
CORS_ALLOWED_ORIGINS = set(env_csv("CORS_ALLOWED_ORIGINS"))

CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
REFRESH_TOKEN = os.environ.get("SPOTIFY_REFRESH_TOKEN", "")
DISCORD_USER_ID = os.environ.get("DISCORD_USER_ID", "")
IP_HASH_SECRET = os.environ.get("IP_HASH_SECRET", "").encode("utf-8")
IP_HASH_SECRET_FILE = os.environ.get(
    "IP_HASH_SECRET_FILE",
    os.path.join(BACKEND_DIR, ".ip_hash_secret")
)
if not os.path.isabs(IP_HASH_SECRET_FILE):
    IP_HASH_SECRET_FILE = os.path.join(BACKEND_DIR, IP_HASH_SECRET_FILE)

ALLOWED_EMOJIS = env_csv("GUESTBOOK_ALLOWED_REACTIONS")
GUESTBOOK_MAX_NAME_LENGTH = env_int("GUESTBOOK_MAX_NAME_LENGTH", 50)
GUESTBOOK_MAX_MESSAGE_LENGTH = env_int("GUESTBOOK_MAX_MESSAGE_LENGTH", 300)
GUESTBOOK_RESERVED_NAMES = {
    value.lower()
    for value in env_csv("GUESTBOOK_RESERVED_NAMES")
}
ACTIVE_VISITOR_TTL_SECONDS = env_float("ACTIVE_VISITOR_TTL_SECONDS", 8.0)
VISIT_SESSION_SECONDS = env_int("VISIT_SESSION_SECONDS", 1800)
SPOTIFY_LAST_PLAYED_TTL_SECONDS = env_int("SPOTIFY_LAST_PLAYED_TTL_SECONDS", 60)
GITHUB_CACHE_TTL_SECONDS = env_int("GITHUB_CACHE_TTL_SECONDS", 600)
SYSTEM_DISK_PATH = os.environ.get("SYSTEM_DISK_PATH", os.path.abspath(os.sep))
MAX_REQUEST_BYTES = env_int("MAX_REQUEST_BYTES", 10000)
LAST_SEEN_FALLBACK_SECONDS = env_int("LAST_SEEN_FALLBACK_SECONDS", 3600)
SPOTIFY_TOKEN_URL = os.environ.get("SPOTIFY_TOKEN_URL", "https://accounts.spotify.com/api/token").strip()
SPOTIFY_CURRENTLY_PLAYING_URL = os.environ.get(
    "SPOTIFY_CURRENTLY_PLAYING_URL",
    "https://api.spotify.com/v1/me/player/currently-playing"
).strip()
LANYARD_REST_BASE_URL = os.environ.get("LANYARD_REST_BASE_URL", "https://api.lanyard.rest/v1/users").rstrip("/")
OUTBOUND_USER_AGENT = os.environ.get("OUTBOUND_USER_AGENT", "ProfileCard").strip()

# Excluded IP addresses from analytics & live visitors counter (configured via .env)
ALL_EXCLUDED_IPS = set(x.strip() for x in os.environ.get("EXCLUDED_IPS", "").split(",") if x.strip())

def get_ip_hash_secret():
    global IP_HASH_SECRET
    if IP_HASH_SECRET:
        return IP_HASH_SECRET

    try:
        if os.path.exists(IP_HASH_SECRET_FILE):
            with open(IP_HASH_SECRET_FILE, "rb") as f:
                IP_HASH_SECRET = f.read().strip()
        else:
            IP_HASH_SECRET = secrets.token_hex(32).encode("ascii")
            with open(IP_HASH_SECRET_FILE, "xb") as f:
                f.write(IP_HASH_SECRET)
            try:
                os.chmod(IP_HASH_SECRET_FILE, 0o600)
            except OSError:
                pass
    except FileExistsError:
        with open(IP_HASH_SECRET_FILE, "rb") as f:
            IP_HASH_SECRET = f.read().strip()

    if not IP_HASH_SECRET:
        raise RuntimeError("IP hash secret is empty")
    return IP_HASH_SECRET

def hash_identifier(value, namespace):
    secret = get_ip_hash_secret()
    payload = f"{namespace}:{value}".encode("utf-8")
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()

def is_excluded_ip(ip_str):
    if not ip_str:
        return True
    ip = ip_str.strip()
    if ip in ALL_EXCLUDED_IPS:
        return True
    if ip.startswith(("127.", "192.168.", "10.", "::1", "localhost", "0.0.0.0")):
        return True
    if ip.startswith("172."):
        try:
            parts = ip.split(".")
            if len(parts) >= 2 and 16 <= int(parts[1]) <= 31:
                return True
        except Exception:
            pass
    return False

def is_local_or_private_ip(ip_str):
    return is_excluded_ip(ip_str)

# In-memory Active Live Visitors Tracker (Device ID + IP keyed)
visitors_lock = threading.Lock()
ACTIVE_VISITORS = {}  # visitor_key -> last_seen_ts

def record_visitor_heartbeat(client_ip, visitor_id=None):
    now = time.time()
    with visitors_lock:
        # Active window: 8 seconds TTL
        cutoff = now - ACTIVE_VISITOR_TTL_SECONDS
        expired = [k for k, ts in ACTIVE_VISITORS.items() if ts < cutoff]
        for k in expired:
            del ACTIVE_VISITORS[k]

        # Ignore local/private and blacklisted network addresses completely
        if not client_ip or is_excluded_ip(client_ip):
            return len(ACTIVE_VISITORS)

        if visitor_id:
            key_str = f"{client_ip}_{visitor_id}"
            visitor_key = hash_identifier(key_str, "active-visitor")
            ACTIVE_VISITORS[visitor_key] = now
        else:
            ip_key = hash_identifier(client_ip, "active-ip")
            ACTIVE_VISITORS[ip_key] = now

        return len(ACTIVE_VISITORS)

# SQLite DB Initializer
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS guestbook (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_hash TEXT UNIQUE,
            name TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS guestbook_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            ip_hash TEXT NOT NULL,
            emoji TEXT NOT NULL,
            UNIQUE(message_id, ip_hash, emoji)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS presence_state (
            key TEXT PRIMARY KEY,
            val TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS unique_visits (
            ip_hash TEXT PRIMARY KEY,
            masked_ip TEXT NOT NULL,
            device TEXT NOT NULL,
            first_seen INTEGER NOT NULL,
            last_seen INTEGER NOT NULL,
            visits_count INTEGER NOT NULL DEFAULT 1
        )
    """)
    conn.commit()
    conn.close()

init_db()

def mask_ip(ip_str):
    if not ip_str:
        return "Unknown"
    parts = ip_str.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.***.***"
    if ":" in ip_str:
        ipv6_parts = ip_str.split(":")
        return f"{ipv6_parts[0]}:{ipv6_parts[1]}:****:****"
    return "Protected IP"

def parse_user_agent(ua_str):
    if not ua_str:
        return "Other"
    ua = ua_str.lower()
    os_name = "Other"
    if "windows" in ua:
        os_name = "Windows"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"

    browser = "Web"
    if "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua or "crios" in ua:
        browser = "Chrome"
    elif "firefox" in ua or "fxios" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "opera" in ua or "opr" in ua:
        browser = "Opera"

    return f"{os_name} • {browser}"

def record_unique_visit(client_ip, user_agent):
    if not client_ip or is_local_or_private_ip(client_ip):
        return
    ip_hash = hash_identifier(client_ip, "analytics")
    masked = mask_ip(client_ip)
    device = parse_user_agent(user_agent)
    now = int(time.time())

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT last_seen, visits_count FROM unique_visits WHERE ip_hash = ?", (ip_hash,))
        row = c.fetchone()
        if row:
            last_seen_ts = row[0]
            # Session window: only increment visits_count if > 30 minutes (1800s) since last activity
            increment = 1 if (now - last_seen_ts > VISIT_SESSION_SECONDS) else 0
            c.execute("""
                UPDATE unique_visits
                SET last_seen = ?, visits_count = visits_count + ?, device = ?
                WHERE ip_hash = ?
            """, (now, increment, device, ip_hash))
        else:
            c.execute("""
                INSERT INTO unique_visits (ip_hash, masked_ip, device, first_seen, last_seen, visits_count)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (ip_hash, masked, device, now, now))
        conn.commit()
        conn.close()
    except Exception:
        pass

def get_visits_stats():
    now = int(time.time())
    today_start = int(datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).timestamp())

    total_unique = 0
    today_unique = 0
    total_views = 0
    recent = []

    excluded_hashes = [
        hash_identifier(ip, "analytics")
        for ip in ALL_EXCLUDED_IPS
    ]

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        ex_placeholders = ",".join("?" * len(excluded_hashes)) if excluded_hashes else "''"
        params = list(excluded_hashes)

        where_clause = f"""
            WHERE masked_ip NOT LIKE '192.168.%' 
              AND masked_ip NOT LIKE '127.%' 
              AND masked_ip NOT LIKE '10.%'
              AND ip_hash NOT IN ({ex_placeholders})
        """

        c.execute(f"SELECT COUNT(*), SUM(visits_count) FROM unique_visits {where_clause}", params)
        row = c.fetchone()
        if row:
            total_unique = row[0] or 0
            total_views = row[1] or 0

        c.execute(f"SELECT COUNT(*) FROM unique_visits {where_clause} AND last_seen >= ?", params + [today_start])
        row_today = c.fetchone()
        if row_today:
            today_unique = row_today[0] or 0

        c.execute(f"""
            SELECT masked_ip, device, first_seen, last_seen, visits_count
            FROM unique_visits
            {where_clause}
            ORDER BY last_seen DESC
            LIMIT 15
        """, params)
        for r in c.fetchall():
            recent.append({
                "maskedIp": r[0],
                "device": r[1],
                "firstSeen": r[2],
                "lastSeen": r[3],
                "visitsCount": r[4]
            })
        conn.close()
    except Exception:
        pass

    return {
        "totalUnique": total_unique,
        "todayUnique": today_unique,
        "totalVisits": total_views,
        "recent": recent
    }

def get_my_session(client_ip, user_agent):
    if not client_ip:
        return {"ip": "Unknown", "device": "Web Browser", "visitsCount": 1, "firstSeen": int(time.time())}
    ip_hash = hash_identifier(client_ip, "analytics")
    masked = mask_ip(client_ip)
    device = parse_user_agent(user_agent)
    now = int(time.time())

    visits_count = 1
    first_seen = now

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT first_seen, visits_count FROM unique_visits WHERE ip_hash = ?", (ip_hash,))
        row = c.fetchone()
        if row:
            first_seen = row[0]
            visits_count = row[1]
        conn.close()
    except Exception:
        pass

    return {
        "ip": masked,
        "rawIp": client_ip,
        "device": device,
        "firstSeen": first_seen,
        "visitsCount": visits_count
    }

cached_spotify_token = None
spotify_token_expires_at = 0

def get_spotify_access_token():
    global cached_spotify_token, spotify_token_expires_at
    now = time.time()
    if cached_spotify_token and now < (spotify_token_expires_at - 60):
        return cached_spotify_token

    if not CLIENT_ID or not CLIENT_SECRET or not REFRESH_TOKEN:
        return None

    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()

    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
    }).encode()

    req = urllib.request.Request(
        SPOTIFY_TOKEN_URL,
        data=data,
        headers={
            "Authorization": f"Basic {b64_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            cached_spotify_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            spotify_token_expires_at = now + expires_in
            return cached_spotify_token
    except Exception as e:
        print(f"Error refreshing access token: {e}")
        return None

def get_cached_last_played():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT val FROM presence_state WHERE key = 'last_played_track'")
        row = c.fetchone()
        conn.close()
        if row:
            data = json.loads(row[0])
            # TTL: 1 minute (60 seconds)
            played_at = data.get("playedAtTimestamp", 0)
            if time.time() - played_at <= SPOTIFY_LAST_PLAYED_TTL_SECONDS:
                return data
    except Exception:
        pass
    return None

def save_last_played(track_dict):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        val_str = json.dumps(track_dict)
        c.execute("INSERT INTO presence_state (key, val) VALUES ('last_played_track', ?) ON CONFLICT(key) DO UPDATE SET val = ?", (val_str, val_str))
        conn.commit()
        conn.close()
    except Exception:
        pass

def get_spotify_status():
    token = get_spotify_access_token()
    last_played = get_cached_last_played()

    if not token:
        return {"isPlaying": False, "lastPlayed": last_played}

    req = urllib.request.Request(
        SPOTIFY_CURRENTLY_PLAYING_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": OUTBOUND_USER_AGENT
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 204 or resp.status == 202:
                return {"isPlaying": False, "lastPlayed": last_played}
            body = resp.read().decode()
            if not body:
                return {"isPlaying": False, "lastPlayed": last_played}

            data = json.loads(body)
            is_playing = data.get("is_playing", False)
            item = data.get("item")

            if not is_playing or not item:
                return {"isPlaying": False, "lastPlayed": last_played}

            artists = ", ".join([a.get("name", "") for a in item.get("artists", [])])
            song = item.get("name", "")
            album = item.get("album", {}).get("name", "")
            images = item.get("album", {}).get("images", [])
            album_art_url = images[0].get("url") if images else None
            track_id = item.get("id")
            track_uri = item.get("uri") or (f"spotify:track:{track_id}" if track_id else None)
            track_url = item.get("external_urls", {}).get("spotify")

            track_info = {
                "isPlaying": True,
                "song": song,
                "artist": artists,
                "album": album,
                "albumArtUrl": album_art_url,
                "trackId": track_id,
                "trackUri": track_uri,
                "trackUrl": track_url,
                "title": f"{song} — {artists}" if artists else song,
                "progressMs": data.get("progress_ms", 0),
                "durationMs": item.get("duration_ms", 0),
                "playedAtTimestamp": int(time.time()),
            }

            save_last_played(track_info)
            now_ts = int(time.time())
            try:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("INSERT INTO presence_state (key, val) VALUES ('last_seen_ts', ?) ON CONFLICT(key) DO UPDATE SET val = ?", (str(now_ts), str(now_ts)))
                conn.commit()
                conn.close()
            except Exception:
                pass
            return track_info
    except Exception:
        return {"isPlaying": False, "lastPlayed": last_played}

def get_real_os_name():
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=", 1)[1].strip().strip('"')
    except Exception:
        pass
    return platform.platform()

def format_compact_uptime(uptime_sec):
    if uptime_sec <= 0:
        return "0m"
    days = int(uptime_sec // 86400)
    hours = int((uptime_sec % 86400) // 3600)
    mins = int((uptime_sec % 3600) // 60)
    years = int(days // 365)
    rem_days = int(days % 365)

    parts = []
    if years > 0:
        parts.append(f"{years}y")
        if rem_days > 0:
            parts.append(f"{rem_days}d")
    elif days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if mins > 0 or not parts:
        parts.append(f"{mins}m")

    return " ".join(parts)

def get_system_status():
    uptime_sec = 0
    try:
        with open("/proc/uptime", "r") as f:
            uptime_sec = float(f.readline().split()[0])
    except Exception:
        pass

    uptime_str = format_compact_uptime(uptime_sec)

    load_avg = 0
    try:
        load_avg = round(os.getloadavg()[0], 2)
    except Exception:
        pass

    mem_total_mb = 0
    mem_used_mb = 0
    mem_percent = 0
    try:
        with open("/proc/meminfo", "r") as f:
            meminfo = {}
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    meminfo[key] = int(val)
            if "MemTotal" in meminfo and "MemAvailable" in meminfo:
                total_kb = meminfo["MemTotal"]
                avail_kb = meminfo["MemAvailable"]
                used_kb = total_kb - avail_kb
                mem_total_mb = int(total_kb / 1024)
                mem_used_mb = int(used_kb / 1024)
                mem_percent = round((used_kb / total_kb) * 100, 1)
    except Exception:
        pass

    mem_used_gb = round(mem_used_mb / 1024, 2)
    mem_total_gb = round(mem_total_mb / 1024, 2)

    import shutil
    disk_used_gb = 0
    disk_total_gb = 0
    disk_percent = 0
    try:
        usage = shutil.disk_usage(SYSTEM_DISK_PATH)
        disk_total_gb = round(usage.total / (1024**3), 1)
        disk_used_gb = round(usage.used / (1024**3), 1)
        disk_percent = round((usage.used / usage.total) * 100, 1)
    except Exception:
        pass

    model = platform.machine() or platform.node()
    if os.path.exists("/proc/device-tree/model"):
        try:
            with open("/proc/device-tree/model", "r") as f:
                raw_model = f.read().strip("\x00").strip()
                model = raw_model
        except Exception:
            pass

    kernel_str = platform.release()
    try:
        uname = os.uname()
        kernel_str = uname.release
    except Exception:
        pass

    pkg_count = "N/A"
    try:
        import subprocess
        package_parts = []
        if shutil.which("dpkg-query"):
            dpkg_out = subprocess.check_output(
                ["dpkg-query", "-f", "${binary:Package}\n", "-W"],
                stderr=subprocess.DEVNULL,
            ).decode().splitlines()
            package_parts.append(f"{len(dpkg_out)} (dpkg)")
        if shutil.which("snap"):
            snap_out = subprocess.check_output(
                ["snap", "list"],
                stderr=subprocess.DEVNULL,
            ).decode().splitlines()
            snap_count = max(0, len(snap_out) - 1)
            package_parts.append(f"{snap_count} (snap)")
        if package_parts:
            pkg_count = ", ".join(package_parts)
    except Exception:
        pass

    hostname = platform.node()
    try:
        hostname = socket.gethostname()
    except Exception:
        pass

    cpu_model = platform.processor() or platform.machine()
    try:
        with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
            for line in f:
                if line.lower().startswith(("model name", "hardware")):
                    detected_cpu = line.split(":", 1)[1].strip()
                    if detected_cpu:
                        cpu_model = detected_cpu
                        break
    except Exception:
        pass

    shell_name = os.path.basename(os.environ.get("SHELL") or os.environ.get("COMSPEC") or "")

    return {
        "status": "online",
        "uptimeSec": int(uptime_sec),
        "uptimeStr": uptime_str,
        "loadAvg": load_avg,
        "memTotalMb": mem_total_mb,
        "memUsedMb": mem_used_mb,
        "memUsedGb": mem_used_gb,
        "memTotalGb": mem_total_gb,
        "memPercent": mem_percent,
        "memStr": f"{mem_used_mb}MiB / {mem_total_mb}MiB ({mem_percent}%)",
        "diskUsedGb": disk_used_gb,
        "diskTotalGb": disk_total_gb,
        "diskPercent": disk_percent,
        "diskStr": f"{disk_used_gb} GiB / {disk_total_gb} GiB ({disk_percent}%)",
        "host": model,
        "kernel": kernel_str,
        "cpu": cpu_model,
        "packages": pkg_count,
        "shell": shell_name,
        "hostname": hostname,
        "os": get_real_os_name(),
        "timestamp": int(time.time())
    }

def get_last_seen():
    now = int(time.time())
    is_discord_online = False
    if DISCORD_USER_ID:
        try:
            req = urllib.request.Request(
                f"{LANYARD_REST_BASE_URL}/{urllib.parse.quote(DISCORD_USER_ID)}",
                headers={"User-Agent": OUTBOUND_USER_AGENT}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                if data.get("success"):
                    d = data.get("data", {})
                    discord_status = d.get("discord_status", "offline")
                    is_discord_online = discord_status in ["online", "idle", "dnd"]
        except Exception:
            pass

    is_spotify_online = False
    if not is_discord_online and CLIENT_ID and REFRESH_TOKEN:
        try:
            spot = get_spotify_status()
            is_spotify_online = bool(spot.get("isPlaying"))
        except Exception:
            pass

    is_online = is_discord_online or is_spotify_online

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        if is_online:
            c.execute("INSERT INTO presence_state (key, val) VALUES ('last_seen_ts', ?) ON CONFLICT(key) DO UPDATE SET val = ?", (str(now), str(now)))
            conn.commit()
            conn.close()
            return {"isOnline": True, "lastSeenTimestamp": now}
        else:
            c.execute("SELECT key, val FROM presence_state WHERE key IN ('last_seen_ts', 'last_played_track')")
            rows = dict(c.fetchall())
            conn.close()
            last_ts = int(rows.get('last_seen_ts', 0)) if rows.get('last_seen_ts') else 0
            if 'last_played_track' in rows:
                try:
                    lp = json.loads(rows['last_played_track'])
                    lp_ts = int(lp.get('playedAtTimestamp', 0))
                    last_ts = max(last_ts, lp_ts)
                except Exception:
                    pass
            if not last_ts:
                last_ts = now - LAST_SEEN_FALLBACK_SECONDS
            return {"isOnline": False, "lastSeenTimestamp": last_ts}
    except Exception:
        pass

    return {"isOnline": False, "lastSeenTimestamp": int(time.time() - LAST_SEEN_FALLBACK_SECONDS)}

def get_guestbook_messages(client_ip):
    ip_hash = hash_identifier(client_ip, "guestbook")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        SELECT id, name, text, created_at, ip_hash
        FROM guestbook
        ORDER BY created_at DESC
        LIMIT 50
    """)
    rows = c.fetchall()

    c.execute("SELECT message_id, emoji, ip_hash FROM guestbook_reactions")
    all_reactions = c.fetchall()

    has_posted = any(r[4] == ip_hash for r in rows)

    reactions_map = {}
    for mid, emoji, r_ip_hash in all_reactions:
        if mid not in reactions_map:
            reactions_map[mid] = {}
        if emoji not in reactions_map[mid]:
            reactions_map[mid][emoji] = {"count": 0, "userReacted": False}
        reactions_map[mid][emoji]["count"] += 1
        if r_ip_hash == ip_hash:
            reactions_map[mid][emoji]["userReacted"] = True

    messages = []
    for r in rows:
        mid = r[0]
        msg_reactions = reactions_map.get(mid, {})
        formatted_reactions = {}
        for em in ALLOWED_EMOJIS:
            info = msg_reactions.get(em, {"count": 0, "userReacted": False})
            formatted_reactions[em] = {
                "count": info["count"],
                "userReacted": info["userReacted"]
            }

        messages.append({
            "id": mid,
            "name": r[1],
            "text": r[2],
            "createdAt": r[3],
            "isOwner": (r[4] == ip_hash),
            "reactions": formatted_reactions
        })

    conn.close()
    return messages, has_posted

def add_guestbook_message(client_ip, name, text):
    name = (name or "").strip()
    text = (text or "").strip()

    # Filter control characters
    name = "".join(ch for ch in name if ord(ch) >= 32 and ch not in ["\u200b", "\u200c", "\u200d", "\ufeff"]).strip()
    name = re.sub(r"\s+", " ", name)

    # Blacklist domains in nickname
    if re.search(r"(https?:\/\/|www\.|t\.me|discord|\.com|\.ru|\.xyz|\.net|\.org)", name, re.I):
        return False, "Имя не должно содержать ссылок или доменов."

    if not name or len(name) < 2:
        return False, "Имя должно содержать минимум 2 символа."
    normalized_name = re.sub(r"[^a-zA-Z0-9а-яА-ЯёЁ]", "", name).lower()
    if any(reserved in normalized_name for reserved in GUESTBOOK_RESERVED_NAMES):
        return False, "Это имя зарезервировано владельцем."

    if len(name) > GUESTBOOK_MAX_NAME_LENGTH:
        return False, f"Имя не должно превышать {GUESTBOOK_MAX_NAME_LENGTH} символов."

    if not text or len(text) < 2:
        return False, "Текст сообщения слишком короткий."
    if len(text) > GUESTBOOK_MAX_MESSAGE_LENGTH:
        return False, f"Сообщение не должно превышать {GUESTBOOK_MAX_MESSAGE_LENGTH} символов."

    name = html.escape(name)
    text = html.escape(text)

    ip_hash = hash_identifier(client_ip, "guestbook")
    now = int(time.time())

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    try:
        c.execute("SELECT 1 FROM guestbook WHERE ip_hash = ?", (ip_hash,))
        if c.fetchone():
            return False, "Вы уже оставили сообщение на Стене."

        c.execute("""
            INSERT INTO guestbook (ip_hash, name, text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (ip_hash, name, text, now, now))
        conn.commit()
        return True, "Сообщение успешно опубликовано!"
    except sqlite3.IntegrityError:
        return False, "Вы уже оставили сообщение на Стене."
    except Exception as e:
        return False, f"Ошибка базы данных: {e}"
    finally:
        conn.close()

def toggle_reaction(client_ip, message_id, emoji):
    if emoji not in ALLOWED_EMOJIS:
        return False, "Недопустимый эмодзи"

    try:
        mid = int(message_id)
    except Exception:
        return False, "Некорректный ID сообщения"

    ip_hash = hash_identifier(client_ip, "guestbook")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("SELECT 1 FROM guestbook WHERE id = ?", (mid,))
        if not c.fetchone():
            return False, "Сообщение не найдено"

        c.execute("SELECT 1 FROM guestbook_reactions WHERE message_id = ? AND ip_hash = ? AND emoji = ?", (mid, ip_hash, emoji))
        if c.fetchone():
            c.execute("DELETE FROM guestbook_reactions WHERE message_id = ? AND ip_hash = ? AND emoji = ?", (mid, ip_hash, emoji))
            conn.commit()
            return True, "Реакция снята"
        else:
            c.execute("INSERT INTO guestbook_reactions (message_id, ip_hash, emoji) VALUES (?, ?, ?)", (mid, ip_hash, emoji))
            conn.commit()
            return True, "Реакция добавлена"
    except Exception as e:
        return False, str(e)
    finally:
        conn.close()

# GitHub & Profile Dynamic Config
GITHUB_USERNAME = os.environ.get("GITHUB_USERNAME", "").strip()
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
GITHUB_API_BASE_URL = os.environ.get("GITHUB_API_BASE_URL", "https://api.github.com").rstrip("/")

github_cache_lock = threading.Lock()
github_cache = {
    "timestamp": 0,
    "projects": []
}

def get_profile_config(req_lang=None):
    default_lang = os.environ.get("PROFILE_LANG", "ru").lower().strip()
    lang = req_lang if (req_lang in ["ru", "en"]) else default_lang
    is_en = (lang == "en")

    name = os.environ.get("OWNER_NAME", "").strip()
    nickname = os.environ.get("OWNER_NICKNAME", name).strip()
    alias = os.environ.get("OWNER_ALIAS", "").strip()
    handle = os.environ.get("OWNER_HANDLE", "").strip()
    role = (os.environ.get("OWNER_ROLE_EN") if is_en else None) or os.environ.get("OWNER_ROLE", "").strip()
    bio = (os.environ.get("OWNER_BIO_EN") if is_en else None) or os.environ.get("OWNER_BIO", "").strip()
    location = (os.environ.get("OWNER_LOCATION_EN") if is_en else None) or os.environ.get("OWNER_LOCATION", "").strip()
    timezone = os.environ.get("OWNER_TIMEZONE", "UTC").strip()
    canonical_url = os.environ.get("OWNER_CANONICAL_URL", "").strip()
    discord_user_id = os.environ.get("DISCORD_USER_ID", "").strip()

    social_candidates = [
        {
            "id": "telegram",
            "name": "Telegram",
            "value": os.environ.get("TELEGRAM_HANDLE", "").strip(),
            "url": os.environ.get("TELEGRAM_URL", "").strip(),
            "copyable": True,
            "label": os.environ.get("TELEGRAM_LABEL_EN" if is_en else "TELEGRAM_LABEL", "Primary contact" if is_en else "Основная связь").strip()
        },
        {
            "id": "discord",
            "name": "Discord",
            "value": os.environ.get("DISCORD_HANDLE", "").strip(),
            "url": os.environ.get("DISCORD_URL", "").strip(),
            "copyable": True,
            "label": os.environ.get("DISCORD_LABEL_EN" if is_en else "DISCORD_LABEL", "Voice & Chat" if is_en else "Голос & Чат").strip()
        },
        {
            "id": "steam",
            "name": "Steam",
            "value": os.environ.get("STEAM_DISPLAY_NAME", "").strip(),
            "url": os.environ.get("STEAM_URL", "").strip(),
            "copyable": False,
            "label": os.environ.get("STEAM_LABEL_EN" if is_en else "STEAM_LABEL", "Gaming profile" if is_en else "Игровой профиль").strip()
        },
        {
            "id": "github",
            "name": "GitHub",
            "value": os.environ.get("GITHUB_DISPLAY_NAME", GITHUB_USERNAME).strip(),
            "url": os.environ.get("GITHUB_URL", "").strip(),
            "copyable": False,
            "label": os.environ.get("GITHUB_LABEL_EN" if is_en else "GITHUB_LABEL", "Repositories" if is_en else "Репозитории").strip()
        },
        {
            "id": "tiktok",
            "name": "TikTok",
            "value": os.environ.get("TIKTOK_HANDLE", "").strip(),
            "url": os.environ.get("TIKTOK_URL", "").strip(),
            "copyable": True,
            "label": os.environ.get("TIKTOK_LABEL_EN" if is_en else "TIKTOK_LABEL", "Content" if is_en else "Контент").strip()
        },
        {
            "id": "spotify",
            "name": "Spotify",
            "value": os.environ.get("SPOTIFY_DISPLAY_NAME", "").strip(),
            "url": os.environ.get("SPOTIFY_PROFILE_URL", "").strip(),
            "copyable": False,
            "label": os.environ.get("SPOTIFY_LABEL_EN" if is_en else "SPOTIFY_LABEL", "Music" if is_en else "Музыка").strip()
        }
    ]
    socials = [item for item in social_candidates if item["url"] or item["value"]]

    weather_latitude = os.environ.get("WEATHER_LATITUDE", "").strip()
    weather_longitude = os.environ.get("WEATHER_LONGITUDE", "").strip()

    weather_location_label = (
        (os.environ.get("WEATHER_LOCATION_LABEL_EN") or os.environ.get("OWNER_LOCATION_EN") or location)
        if is_en
        else (os.environ.get("WEATHER_LOCATION_LABEL") or location)
    ).strip()

    return {
        "lang": lang,
        "personal": {
            "name": name,
            "nickname": nickname,
            "alias": alias,
            "handle": handle,
            "role": role,
            "location": location,
            "timezone": timezone,
            "timezoneOffset": env_float("OWNER_TIMEZONE_OFFSET", 0),
            "discordUserId": discord_user_id,
            "avatar": os.environ.get("OWNER_AVATAR_PATH", "/avatar.jpg").strip(),
            "videoAvatar": os.environ.get("OWNER_VIDEO_PATH", "/video_bg.mp4").strip(),
            "videoPoster": os.environ.get("OWNER_VIDEO_POSTER_PATH", "/poster.jpg").strip(),
            "bio": bio,
            "canonicalUrl": canonical_url
        },
        "socials": socials,
        "weather": {
            "latitude": optional_float(weather_latitude),
            "longitude": optional_float(weather_longitude),
            "timezone": os.environ.get("WEATHER_TIMEZONE", timezone).strip(),
            "locationLabel": weather_location_label,
            "apiUrl": os.environ.get("WEATHER_API_URL", "").strip()
        },
        "guestbook": {
            "allowedReactions": ALLOWED_EMOJIS,
            "maxNameLength": GUESTBOOK_MAX_NAME_LENGTH,
            "maxMessageLength": GUESTBOOK_MAX_MESSAGE_LENGTH
        }
    }

def load_configured_projects():
    raw_json = os.environ.get("PROJECTS_JSON", "").strip()
    projects_file = os.environ.get("PROJECTS_FILE", "").strip()
    try:
        if raw_json:
            parsed = json.loads(raw_json)
        elif projects_file:
            resolved_path = projects_file if os.path.isabs(projects_file) else os.path.join(BACKEND_DIR, projects_file)
            with open(resolved_path, "r", encoding="utf-8") as f:
                parsed = json.load(f)
        else:
            return []
        return parsed if isinstance(parsed, list) else []
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Projects configuration notice: {exc}")
        return []

CONFIGURED_PROJECTS = load_configured_projects()

from concurrent.futures import ThreadPoolExecutor

def fetch_repo_languages(lang_url, headers):
    if not lang_url or not GITHUB_TOKEN:
        return []
    try:
        lreq = urllib.request.Request(lang_url, headers=headers)
        with urllib.request.urlopen(lreq, timeout=3) as lresp:
            lang_data = json.loads(lresp.read().decode("utf-8"))
            return list(lang_data.keys())[:4]
    except Exception:
        return []

def get_github_projects(force_refresh=False, hide_private=None):
    global github_cache
    now = time.time()

    should_hide_private = (
        env_bool("GITHUB_HIDE_PRIVATE", False)
        or env_bool("HIDE_PRIVATE_PROJECTS", False)
        or env_bool("HIDE_PRIVATE_REPOS", False)
        if hide_private is None
        else hide_private
    )

    with github_cache_lock:
        if not force_refresh and github_cache["projects"] and (now - github_cache["timestamp"] < GITHUB_CACHE_TTL_SECONDS):
            cached = github_cache["projects"]
            return [p for p in cached if not p.get("isPrivate")] if should_hide_private else cached

    headers = {
        "User-Agent": os.environ.get("GITHUB_USER_AGENT", "ProfileCard"),
        "Accept": "application/vnd.github.v3+json"
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        url = f"{GITHUB_API_BASE_URL}/user/repos?affiliation=owner&sort=updated&per_page=100"
    elif GITHUB_USERNAME:
        url = f"{GITHUB_API_BASE_URL}/users/{urllib.parse.quote(GITHUB_USERNAME)}/repos?sort=updated&per_page=100"
    else:
        url = None

    try:
        if not url:
            raise RuntimeError("GitHub integration is not configured")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw_repos = json.loads(resp.read().decode("utf-8"))

            # Fetch languages in parallel across repos (super fast)
            lang_urls = [r.get("languages_url") for r in raw_repos]
            all_langs = []
            if GITHUB_TOKEN:
                with ThreadPoolExecutor(max_workers=8) as executor:
                    all_langs = list(executor.map(lambda u: fetch_repo_languages(u, headers), lang_urls))
            else:
                all_langs = [[] for _ in raw_repos]

            projects = []
            for idx, r in enumerate(raw_repos):
                name = r.get("name", "")
                is_private = bool(r.get("private", False))
                desc = r.get("description") or name
                topics = r.get("topics", [])
                stars = r.get("stargazers_count", 0)
                homepage = r.get("homepage")
                html_url = r.get("html_url")

                tags = all_langs[idx] if idx < len(all_langs) else []
                if not tags and r.get("language"):
                    tags.append(r.get("language"))

                for t in topics[:3]:
                    if t.lower() not in [x.lower() for x in tags] and len(tags) < 5:
                        tags.append(t)

                status_badge = "Закрытый проект" if is_private else (f"⭐ {stars}" if stars > 0 else "Активный")
                status_type = "private" if is_private else ("stars" if stars > 0 else "active")

                # CRITICAL SECURITY RULE: If private, link is strictly None!
                link_url = None if is_private else html_url

                projects.append({
                    "id": r.get("id", name),
                    "title": name,
                    "description": desc,
                    "tags": tags if tags else ["Open Source"],
                    "stars": stars,
                    "statusBadge": status_badge,
                    "statusType": status_type,
                    "isPrivate": is_private,
                    "link": link_url,
                    "demo": homepage if homepage and not is_private else None,
                    "updatedAt": r.get("updated_at")
                })

            if projects:
                with github_cache_lock:
                    github_cache["timestamp"] = now
                    github_cache["projects"] = projects
                return [p for p in projects if not p.get("isPrivate")] if should_hide_private else projects
    except Exception as e:
        print(f"GitHub API fetch notice (rate limit or offline): {e}")

    # Fallback to cache or explicitly configured projects
    with github_cache_lock:
        if not github_cache["projects"]:
            github_cache["projects"] = CONFIGURED_PROJECTS
        cached = github_cache["projects"]
        return [p for p in cached if not p.get("isPrivate")] if should_hide_private else cached

class UnifiedHandler(http.server.SimpleHTTPRequestHandler):
    def get_client_ip(self):
        xff = self.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()
        x_real_ip = self.headers.get("X-Real-IP")
        if x_real_ip:
            return x_real_ip.strip()
        return self.client_address[0]

    def send_json_response(self, code, payload):
        try:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_cors_headers()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def send_cors_headers(self):
        request_origin = self.headers.get("Origin", "")
        if request_origin:
            if not CORS_ALLOWED_ORIGINS or request_origin in CORS_ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", request_origin)
                self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        query_params = urllib.parse.parse_qs(parsed.query)
        visitor_id = query_params.get("vid", [None])[0]
        client_ip = self.get_client_ip()
        user_agent = self.headers.get("User-Agent", "")

        record_unique_visit(client_ip, user_agent)
        if path == "/api/live-visitors" or visitor_id:
            active_count = record_visitor_heartbeat(client_ip, visitor_id)
        else:
            with visitors_lock:
                cutoff = time.time() - ACTIVE_VISITOR_TTL_SECONDS
                active_count = len([k for k, ts in ACTIVE_VISITORS.items() if ts >= cutoff])

        if path in ["", "/api/spotify-status", "/api/spotify", "/api/spotify/playing", "/api/spotify/current"]:
            result = get_spotify_status()
            self.send_json_response(200, result)
        elif path == "/api/system-status":
            result = get_system_status()
            self.send_json_response(200, result)
        url_lang = query_params.get("lang", [None])[0]
        if path == "/api/profile":
            self.send_json_response(200, get_profile_config(req_lang=url_lang))
        elif path in ["/api/projects", "/api/github-projects"]:
            force_refresh = "refresh" in query_params or "force" in query_params
            hide_param = query_params.get("hide_private", [None])[0]
            hide_priv = (hide_param.lower() in ("true", "1", "yes")) if hide_param is not None else None
            self.send_json_response(200, {"projects": get_github_projects(force_refresh=force_refresh, hide_private=hide_priv)})
        elif path == "/api/last-seen":
            result = get_last_seen()
            self.send_json_response(200, result)
        elif path == "/api/live-visitors":
            self.send_json_response(200, {"onlineVisitors": active_count})
        elif path == "/api/visits-history":
            stats = get_visits_stats()
            self.send_json_response(200, stats)
        elif path == "/api/my-session":
            sess = get_my_session(client_ip, user_agent)
            self.send_json_response(200, sess)
        elif path == "/api/guestbook":
            messages, has_posted = get_guestbook_messages(client_ip)
            self.send_json_response(200, {
                "messages": messages,
                "count": len(messages),
                "hasPosted": has_posted,
                "onlineVisitors": active_count
            })
        else:
            self.send_json_response(404, {"error": "not_found"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        query_params = urllib.parse.parse_qs(parsed.query)
        visitor_id = query_params.get("vid", [None])[0]
        client_ip = self.get_client_ip()
        user_agent = self.headers.get("User-Agent", "")
        record_unique_visit(client_ip, user_agent)
        record_visitor_heartbeat(client_ip, visitor_id)

        if path == "/api/guestbook":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                if content_len > MAX_REQUEST_BYTES:
                    self.send_json_response(413, {"success": False, "error": "payload_too_large"})
                    return

                raw_body = self.rfile.read(content_len).decode("utf-8")
                data = json.loads(raw_body)

                name = data.get("name", "")
                text = data.get("text", "")

                success, msg = add_guestbook_message(client_ip, name, text)
                messages, has_posted = get_guestbook_messages(client_ip)
                if success:
                    self.send_json_response(200, {
                        "success": True,
                        "message": msg,
                        "messages": messages,
                        "hasPosted": True
                    })
                else:
                    self.send_json_response(400, {
                        "success": False,
                        "error": msg,
                        "hasPosted": has_posted
                    })
            except Exception as e:
                self.send_json_response(500, {"success": False, "error": str(e)})

        elif path == "/api/guestbook/react":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(content_len).decode("utf-8")
                data = json.loads(raw_body)

                message_id = data.get("messageId")
                emoji = data.get("emoji")

                success, msg = toggle_reaction(client_ip, message_id, emoji)
                messages, has_posted = get_guestbook_messages(client_ip)

                if success:
                    self.send_json_response(200, {
                        "success": True,
                        "message": msg,
                        "messages": messages,
                        "hasPosted": has_posted
                    })
                else:
                    self.send_json_response(400, {"success": False, "error": msg})
            except Exception as e:
                self.send_json_response(500, {"success": False, "error": str(e)})

        else:
            self.send_json_response(404, {"error": "not_found"})

    def log_message(self, format, *args):
        pass

class ReusableThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    get_ip_hash_secret()
    server = ReusableThreadingServer((BIND_HOST, PORT), UnifiedHandler)
    print(f"Profile backend listening on {BIND_HOST}:{PORT}")
    server.serve_forever()
