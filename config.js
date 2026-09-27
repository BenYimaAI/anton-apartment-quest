// Safe default: the game works fully in local/browser mode.
// For cross-device HomeChat, Family Wall posts and cloud saves, follow README.md
// and then set enabled=true plus your own Supabase values.
window.AAQ_CONFIG = {
  cloud: {
    enabled: false,
    supabaseUrl: "",
    supabaseAnonKey: ""
  },
  family: {
    childDisplayName: "Anton",
    householdName: "Apartment Quest Family"
  }
};
