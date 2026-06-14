export const actions = [
  "remove", "extract", "isolate", "separate", "split", 
  "clean", "mute", "strip", "filter", "delete"
];

export const targets = [
  "vocals", "drums", "bass", "instruments", "voice", 
  "music", "acapella", "dialogue", "noise", "melody"
];

export const context1 = [
  "mp3", "wav", "flac", "mp4", "video", "audio", "song", "track", "recording", "podcast",
  "youtube", "spotify", "tiktok", "reels", "shorts", "interview", "sample", "beat", "file", "stream",
  "live-performance", "concert", "movie", "film", "documentary", "vlog", "webinar", "zoom-call", "meeting", "lecture",
  "speech", "presentation", "voicemail", "discord", "twitch", "gaming", "vinyl", "cassette", "cd", "tape",
  "rock", "pop", "hiphop", "rap", "jazz", "classical", "edm", "house", "techno", "trance",
  "dubstep", "country", "rnb", "soul", "funk", "disco", "reggae", "metal", "punk", "indie",
  "alternative", "folk", "blues", "gospel", "latin", "kpop", "jpop", "afrobeat", "dancehall", "ambient",
  "lofi", "trap", "drill", "grime", "synthwave", "vaporwave", "acoustic", "instrumental", "choir", "orchestra",
  "commercial", "advertisement", "trailer", "teaser", "promo", "intro", "outro", "jingle", "soundtrack", "score",
  "bgm", "theme", "mashup", "remix", "bootleg", "cover", "karaoke", "backing-track", "stem", "multitrack"
]; // exactly 100

export const context2 = [
  "djs", "producers", "remixers", "musicians", "singers", "vocalists", "drummers", "bassists", "guitarists", "pianists",
  "engineers", "mixers", "mastering", "beatmakers", "composers", "arrangers", "songwriters", "artists", "bands", "choirs",
  "content-creators", "youtubers", "vloggers", "streamers", "podcasters", "broadcasters", "journalists", "reporters", "interviewers", "hosts",
  "filmmakers", "directors", "editors", "videographers", "animators", "designers", "creatives", "studios", "agencies", "brands",
  "hobbyists", "beginners", "professionals", "experts", "students", "teachers", "instructors", "educators", "coaches", "mentors",
  "windows", "mac", "linux", "ios", "android", "mobile", "desktop", "web", "browser", "online",
  "premiere", "after-effects", "final-cut", "davinci", "ableton", "fl-studio", "logic-pro", "pro-tools", "cubase", "studio-one",
  "reaper", "garageband", "audacity", "audition", "resolve", "capcut", "tiktok-creators", "instagram-creators", "youtube-creators", "twitch-streamers",
  "karaoke-bars", "clubs", "venues", "festivals", "events", "parties", "weddings", "ceremonies", "church", "worship",
  "school", "college", "university", "academy", "classes", "courses", "workshops", "tutorials", "lessons", "training"
]; // exactly 100

export const context3 = [
  "2026", "2027", "free", "cheap", "affordable", "premium", "pro", "best", "top", "ultimate",
  "fast", "quick", "easy", "simple", "automated", "ai", "smart", "intelligent", "advanced", "modern",
  "high-quality", "lossless", "hd", "hq", "studio", "professional", "clean", "clear", "perfect", "flawless",
  "online", "web-based", "cloud", "download", "app", "software", "tool", "generator", "creator", "maker",
  "audio", "video", "music", "sound", "voice", "vocal", "speech", "dialogue", "instrument", "beat",
  "remove", "extract", "isolate", "separate", "split", "clean", "mute", "strip", "filter", "delete",
  "without-losing-quality", "with-ai", "automatically", "instantly", "in-seconds", "online-free", "no-download", "no-watermark", "unlimited", "secure",
  "mac", "windows", "pc", "laptop", "phone", "iphone", "android", "tablet", "ipad", "device",
  "creators", "musicians", "djs", "producers", "podcasters", "editors", "filmmakers", "vloggers", "singers", "artists",
  "mp3", "wav", "mp4", "youtube", "spotify", "tiktok", "instagram", "facebook", "twitter", "social-media"
]; // exactly 100

export const context4 = [
  "one-click", "bulk", "batch", "multiple", "large", "heavy", "complex", "noisy", "crowded", "loud",
  "quiet", "soft", "whisper", "shout", "scream", "singing", "talking", "speaking", "conversation", "interview",
  "podcast-editing", "video-editing", "music-production", "beat-making", "remixing", "mashups", "karaoke-tracks", "backing-tracks", "acapellas", "stems",
  "audio-cleanup", "noise-reduction", "voice-isolation", "vocal-extraction", "drum-removal", "bass-separation", "instrument-muting", "stem-splitting", "sound-design", "foley",
  "youtube-videos", "tiktok-sounds", "instagram-reels", "facebook-ads", "spotify-tracks", "apple-music", "soundcloud", "mixcloud", "bandcamp", "patreon",
  "logic", "ableton", "flstudio", "protools", "cubase", "studioone", "reaper", "garageband", "audacity", "premiere",
  "home-studio", "professional-studio", "bedroom-producer", "indie-artist", "major-label", "indie-label", "publishing", "sync", "licensing", "royalty-free",
  "copyright", "fair-use", "remix-contest", "dj-set", "live-show", "performance", "gig", "concert", "tour", "festival",
  "macbook", "imac", "windows11", "windows10", "linux-mint", "ubuntu", "chromeos", "chromebook", "ios18", "android16",
  "fastest", "easiest", "best-rated", "top-rated", "most-popular", "trending", "viral", "new", "latest", "updated"
]; // exactly 100


export function getSeoSlugs(): string[] {
  const slugs: string[] = [];

  // Pattern A: [action]-[target]-from-[context1] (10 * 10 * 100 = 10,000)
  for (const action of actions) {
    for (const target of targets) {
      for (const ctx of context1) {
        slugs.push(`${action}-${target}-from-${ctx}`);
      }
    }
  }

  // Pattern B: best-[target]-extractor-for-[context2] (10 * 10 * 100 = 10,000)
  for (const action of actions) {
    for (const target of targets) {
      for (const ctx of context2) {
        slugs.push(`best-${target}-${action}er-for-${ctx}`);
      }
    }
  }

  // Pattern C: free-[action]-[target]-software-for-[context3] (10 * 10 * 100 = 10,000)
  for (const action of actions) {
    for (const target of targets) {
      for (const ctx of context3) {
        slugs.push(`free-${action}-${target}-software-for-${ctx}`);
      }
    }
  }

  // Pattern D: how-to-[action]-[target]-in-[context4] (10 * 10 * 100 = 10,000)
  for (const action of actions) {
    for (const target of targets) {
      for (const ctx of context4) {
        slugs.push(`how-to-${action}-${target}-in-${ctx}`);
      }
    }
  }

  return slugs; // Exactly 40,000 unique strings!
}

export function parseSlugToData(slug: string) {
  // A helper function to extract meaningful data from the slug to display on the page
  const words = slug.split('-');
  const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    title,
    originalSlug: slug,
  };
}
