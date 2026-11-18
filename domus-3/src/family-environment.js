(() => {
  const existingProjects = new Set(['pmgonotpbmybtwvxbcvf', 'jiwfpczmffsjpfvsrrvk']);
  function readConfig(raw, runtime) {
    const config = runtime.readConfig(raw);
    if (!config.ready || raw.edition !== 'domus-families-beta') return { ready: false };
    const host = new URL(config.supabaseUrl).hostname;
    const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(host);
    if (!match || match[1] !== raw.familyProjectRef || existingProjects.has(match[1])) return { ready: false };
    return config;
  }
  window.DOMUSFamilyEnvironment = Object.freeze({ readConfig });
})();
