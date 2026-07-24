// Shared profile/settings types for the cloud homepage.

export type AvatarEffect =
  | "none"
  | "breathe"
  | "rotate"
  | "float"
  | "yaolingdang"
  | "pulse-ring"
  | "glow";
export type SignatureEffect = "none" | "fade-cycle" | "typing" | "wave" | "rainbow";
export type FontFamilyId = "lxgw" | "kaiti" | "heiti" | "songti" | "system";

export interface FontOption {
  id: FontFamilyId;
  name: string;
  /** CSS font-family value (with fallbacks). */
  cssFamily: string;
  /** If this is a web font, the stylesheet URL to load (else undefined = system font). */
  webFontUrl?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "lxgw",
    name: "霞鹜文楷",
    cssFamily: "'LXGW WenKai', 'LXGW WenKai Screen', 'Noto Serif SC', serif",
    webFontUrl: "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css",
  },
  {
    id: "kaiti",
    name: "楷体",
    cssFamily: "'KaiTi', 'STKaiti', 'Kaiti SC', '楷体', 'Noto Serif SC', serif",
  },
  {
    id: "heiti",
    name: "黑体",
    cssFamily: "'SimHei', 'Heiti SC', '黑体', 'Noto Sans SC', sans-serif",
  },
  {
    id: "songti",
    name: "宋体",
    cssFamily: "'SimSun', 'Songti SC', '宋体', 'Noto Serif SC', serif",
  },
  {
    id: "system",
    name: "系统默认",
    cssFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
];

export function getFontOption(id: FontFamilyId): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}

export interface LinkItem {
  id: string;
  label: string;
  href: string;
  /** Emoji or iconfont class. We support both: if starts with "icon-" treat as iconfont class. */
  icon: string;
  /** Optional icon color (CSS color string). */
  color?: string;
}

export interface SkyTheme {
  /** Preset name (used as label in admin). */
  id: string;
  name: string;
  /** Top of sky color. */
  top: string;
  /** Middle / horizon color. */
  bottom: string;
  /** Fog color used by the cloud shader (should match the horizon to blend clouds into sky). */
  fog: string;
}

export interface ProfileSettings {
  // Identity
  nickname: string;
  nicknameVisible: boolean; // show nickname on homepage (under avatar)
  avatarUrl: string; // data: URL or https URL (image-bed link)
  avatarEffect: AvatarEffect;
  avatarSize: number; // px
  avatarPosX: number; // % horizontal center offset (-50 to 50)
  avatarPosY: number; // % top position (0 to 100)

  // Signature
  signature: string;
  signatureEffect: SignatureEffect;
  signatureSize: number; // px
  signaturePosX: number;
  signaturePosY: number;

  // Links
  links: LinkItem[];

  // Footer
  footer: string; // raw text (may contain simple HTML <a>, <br>, <img>)
  footerEnabled: boolean;

  // Sky theme — either a preset id or custom colors
  skyThemeId: string;
  /** When true, skyThemeId is ignored and customSky colors are used. */
  useCustomSky: boolean;
  customSky: {
    top: string;
    bottom: string;
    fog: string;
  };

  // Cloud rendering controls
  cloudDensity: number; // 500..20000 cloud sprite instances
  cloudSpeed: number; // multiplier of base speed (0.5..3)

  // Page font
  fontFamilyId: FontFamilyId;

  // Misc
  pageTitle: string;

  updatedAt: number;
}

export const SKY_THEMES: SkyTheme[] = [
  {
    id: "dawn-default",
    name: "破晓蓝（原版）",
    top: "#1e4877",
    bottom: "#4584b4",
    fog: "#4584b4",
  },
  {
    id: "twilight",
    name: "暮色紫",
    top: "#2d1b4e",
    bottom: "#7e57c2",
    fog: "#7e57c2",
  },
  {
    id: "sunrise",
    name: "晨曦橙",
    top: "#ff9966",
    bottom: "#ffc3a0",
    fog: "#ffc3a0",
  },
  {
    id: "ocean",
    name: "深海青",
    top: "#0f4c5c",
    bottom: "#5fa8b3",
    fog: "#5fa8b3",
  },
  {
    id: "rose",
    name: "玫瑰粉",
    top: "#8e2444",
    bottom: "#e0a0b0",
    fog: "#e0a0b0",
  },
  {
    id: "midnight",
    name: "子夜深蓝",
    top: "#0a1929",
    bottom: "#1e3a5f",
    fog: "#1e3a5f",
  },
  {
    id: "aurora",
    name: "极光绿",
    top: "#0b3d2e",
    bottom: "#5eb88a",
    fog: "#5eb88a",
  },
  {
    id: "lavender",
    name: "薰衣草",
    top: "#6a5acd",
    bottom: "#c8b6e2",
    fog: "#c8b6e2",
  },
];

/** Resolve the active sky theme: either custom colors or a preset. */
export function resolveSky(s: Pick<ProfileSettings, "skyThemeId" | "useCustomSky" | "customSky">): SkyTheme {
  if (s.useCustomSky) {
    return {
      id: "custom",
      name: "自定义",
      top: s.customSky.top,
      bottom: s.customSky.bottom,
      fog: s.customSky.fog,
    };
  }
  return SKY_THEMES.find((t) => t.id === s.skyThemeId) ?? SKY_THEMES[0];
}

/** Back-compat helper for components that only know the preset id. */
export function getSkyTheme(id: string): SkyTheme {
  return SKY_THEMES.find((t) => t.id === id) ?? SKY_THEMES[0];
}

export const DEFAULT_SETTINGS: ProfileSettings = {
  nickname: "Azad",
  nicknameVisible: false, // default off — user opts in
  avatarUrl: "",
  avatarEffect: "none", // default: no effect (per user request)
  avatarSize: 80,
  avatarPosX: 0,
  avatarPosY: 16,

  signature: "天空一无所有，为何给我安慰",
  signatureEffect: "none", // default: no effect (per user request)
  signatureSize: 14,
  signaturePosX: 0,
  signaturePosY: 36,

  links: [
    { id: "l1", label: "作者主页", href: "https://home.azad.asia/", icon: "🏠", color: "#ffffff" },
    { id: "l2", label: "作者博客", href: "https://blog.azad.asia/", icon: "✍️", color: "#ffffff" },
    { id: "l3", label: "实验室", href: "https://other.azad.asia/", icon: "💡", color: "#ffffff" },
    { id: "l4", label: "开源地址", href: "https://github.com/Azad-sl/cloud-home", icon: "🐙", color: "#ffffff" },
  ],

  footer:
    '©&nbsp;2022&nbsp;-&nbsp;2026&nbsp;|&nbsp;<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" style="color:#737373;text-decoration:none;">粤ICP备XXXXXXXX号-1</a>',
  footerEnabled: true,

  skyThemeId: "dawn-default",
  useCustomSky: false,
  customSky: {
    top: "#1e4877",
    bottom: "#4584b4",
    fog: "#4584b4",
  },

  cloudDensity: 8000,
  cloudSpeed: 1,

  fontFamilyId: "lxgw",

  pageTitle: "我的互联网日志 | Cloud Home",

  updatedAt: 0,
};
