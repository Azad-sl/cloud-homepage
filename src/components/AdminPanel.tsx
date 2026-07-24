"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  RotateCcw,
  Settings2,
  Lock,
  Link2,
  X,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  SKY_THEMES,
  type AvatarEffect,
  type FontFamilyId,
  type LinkItem,
  type ProfileSettings,
  type SignatureEffect,
} from "@/lib/types";

interface Props {
  settings: ProfileSettings;
  onSettingsChange: (s: ProfileSettings) => void;
}

const AVATAR_EFFECTS: { value: AvatarEffect; label: string }[] = [
  { value: "none", label: "无动效" },
  { value: "yaolingdang", label: "摇铃铛（原版）" },
  { value: "breathe", label: "呼吸缩放" },
  { value: "rotate", label: "缓慢旋转" },
  { value: "float", label: "上下漂浮" },
  { value: "pulse-ring", label: "脉冲光环" },
  { value: "glow", label: "微光发光" },
];

const SIGNATURE_EFFECTS: { value: SignatureEffect; label: string }[] = [
  { value: "none", label: "无动效" },
  { value: "fade-cycle", label: "淡入淡出" },
  { value: "typing", label: "打字机" },
  { value: "wave", label: "波浪起伏" },
  { value: "rainbow", label: "彩虹色变" },
];

type SaveState = "idle" | "saving" | "saved" | "error";
type DbStatus = {
  connected: boolean;
  message: string;
  latencyMs?: number;
  authRequired?: boolean;
} | null;

/**
 * Get the admin password (if any) from the client-side sessionStorage.
 * Note: this is NOT a security boundary — the real check is server-side
 * in /api/profile and /api/upload. The client-side gate is just UX so
 * visitors don't see the admin panel by default.
 *
 * Flow:
 *   1. Page loads → gear icon shown top-left.
 *   2. User clicks gear → if no ADMIN_PASSWORD env var set (authRequired=false),
 *      panel opens immediately.
 *   3. If authRequired=true → password prompt shown. User enters password.
 *      We try a noop POST to /api/profile with the password as X-Admin-Token.
 *      If 401 → wrong password. If 200/other → password correct, store in
 *      sessionStorage + open panel.
 *   4. Panel closes via the X button or the gear icon (toggle).
 *   5. Password persists for the session; closing the tab clears it.
 */
const SESSION_KEY = "cloud-home-admin-token";

export default function AdminPanel({ settings, onSettingsChange }: Props) {
  // Panel visibility
  const [open, setOpen] = useState(false);
  // Which collapsible section is currently expanded (accordion: one at a time)
  const [activeSection, setActiveSection] = useState<string>("avatar");
  // Whether a password is required to open the panel
  const [authRequired, setAuthRequired] = useState(false);
  // Whether the current session is authenticated
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState("");
  const [pwdInput, setPwdInput] = useState("");

  // Save/upload/db state
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [db, setDb] = useState<DbStatus>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const update = useCallback(
    (patch: Partial<ProfileSettings>) => {
      onSettingsChange({ ...settings, ...patch });
    },
    [settings, onSettingsChange]
  );

  // ---- Check auth requirement + DB status on mount ----
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setDbLoading(true);
      try {
        const r = await fetch("/api/status", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) {
          setDb(j);
          setAuthRequired(!!j.authRequired);
          // Restore session token if present
          if (j.authRequired) {
            const tok = sessionStorage.getItem(SESSION_KEY);
            if (tok) setAuthed(true); // we'll validate lazily on next save
          } else {
            setAuthed(true); // no password configured
          }
        }
      } catch {
        if (!cancelled)
          setDb({ connected: false, message: "请求失败，请检查网络" });
      } finally {
        if (!cancelled) setDbLoading(false);
      }
    };
    check();
    const id = setInterval(async () => {
      // Lighter status refresh — only DB, not auth
      try {
        const r = await fetch("/api/status", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setDb(j);
      } catch {}
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // ---- Toggle the admin panel open/closed ----
  // Shared by the gear icon click and the Ctrl+Shift+Z keyboard shortcut.
  // - If no password is configured, or the user is already authenticated,
  //   we simply toggle the panel.
  // - If a password is required and the user is NOT authenticated, we OPEN
  //   the panel (which shows the password prompt). Closing in that state is
  //   done via the prompt's own close button.
  const togglePanel = useCallback(() => {
    setOpen((prev) => {
      // If currently open, always close.
      if (prev) return false;
      // If currently closed, open — unless auth is required AND not yet authed,
      // in which case we still open (to show the password prompt).
      return true;
    });
  }, []);

  // Toggle a collapsible section (accordion: clicking an open one closes it).
  const handleSectionToggle = useCallback((id: string) => {
    setActiveSection((prev) => (prev === id ? "" : id));
  }, []);

  // ---- Keyboard shortcut: Ctrl+Shift+Z toggles the admin panel ----
  // We listen on `keydown` at the document level. We ignore the event when
  // the user is typing in an input/textarea/select (so the shortcut doesn't
  // interfere with normal text editing — e.g. editing the signature).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+Shift+Z (or Cmd+Shift+Z on macOS — same physical gesture).
      // Note: Ctrl+Shift+Z is also "redo" in some apps, but in a browser
      // context with no text input focused, it's safe to hijack.
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key.toLowerCase() !== "z") {
        return;
      }
      // Don't hijack if the user is typing in a form field.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      e.preventDefault();
      togglePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  // ---- Auth handlers ----
  const tryAuth = async () => {
    setAuthChecking(true);
    setAuthError("");
    try {
      // We validate the password by issuing a noop POST. We send an empty
      // body — the server merges it with the current settings, so the only
      // thing that can fail at the auth layer is the password itself.
      //
      // IMPORTANT: a 401 means "wrong password". Any other status (200, 500,
      // etc.) means the password was ACCEPTED by the auth gate — the request
      // proceeded past the auth check. A 500 typically means Redis is not
      // connected, but that's a separate concern from authentication.
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": pwdInput,
        },
        body: JSON.stringify({}),
      });
      if (r.status === 401) {
        setAuthError("密码错误");
        return;
      }
      // Any non-401 response means the password was accepted by the server.
      // (Even a 500 from Redis being down is fine — the auth gate passed.)
      sessionStorage.setItem(SESSION_KEY, pwdInput);
      setAuthed(true);
      setOpen(true);
      setPwdInput("");
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setAuthChecking(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setOpen(false);
  };

  // ---- Save / upload handlers ----
  const getToken = (): string | null => {
    if (!authRequired) return null;
    return sessionStorage.getItem(SESSION_KEY);
  };

  const handleSave = async () => {
    setSaveState("saving");
    setSaveMsg("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const tok = getToken();
      if (tok) headers["X-Admin-Token"] = tok;
      const r = await fetch("/api/profile", {
        method: "POST",
        headers,
        body: JSON.stringify(settings),
      });
      if (r.status === 401) {
        setSaveState("error");
        setSaveMsg("管理密码已失效，请重新输入");
        setAuthed(false);
        sessionStorage.removeItem(SESSION_KEY);
        setOpen(false);
        return;
      }
      // Guard against non-JSON (HTML error page) responses, same as upload.
      const contentType = r.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setSaveState("error");
        if (r.status === 413) {
          setSaveMsg("保存失败：数据过大（头像 base64 可能超过 Redis 1MB 限制）。请改用图床链接。");
        } else if (r.status === 504) {
          setSaveMsg("保存超时，请重试。");
        } else {
          setSaveMsg(`保存失败（HTTP ${r.status}），请重试。`);
        }
        return;
      }
      const j = await r.json();
      if (r.ok && j.ok) {
        setSaveState("saved");
        setSaveMsg("已保存");
        setTimeout(() => setSaveState("idle"), 1800);
      } else {
        setSaveState("error");
        setSaveMsg(j.error || "保存失败");
      }
    } catch (e: unknown) {
      setSaveState("error");
      setSaveMsg(e instanceof Error ? e.message : "网络错误");
    }
  };

  const handleReset = () => {
    if (
      !confirm(
        "确定要恢复为默认配置吗？这会覆盖当前所有设置（不影响已上传的头像和云朵密度/速度）。"
      )
    )
      return;
    onSettingsChange({
      ...DEFAULT_SETTINGS,
      avatarUrl: settings.avatarUrl,
      cloudDensity: settings.cloudDensity,
      cloudSpeed: settings.cloudSpeed,
      updatedAt: Date.now(),
    });
  };

  const handleResetCloud = () => {
    if (!confirm("确定要将云朵密度和速度恢复为默认值（8000 片 / 1.0×）吗？")) return;
    update({ cloudDensity: 8000, cloudSpeed: 1 });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const headers: Record<string, string> = {};
      const tok = getToken();
      if (tok) headers["X-Admin-Token"] = tok;
      const r = await fetch("/api/upload", { method: "POST", body: fd, headers });
      if (r.status === 401) {
        setUploadMsg("管理密码已失效，请重新输入");
        setAuthed(false);
        sessionStorage.removeItem(SESSION_KEY);
        setOpen(false);
        return;
      }

      // Vercel may return an HTML error page (413 / 500 / 504) instead of
      // JSON when the upload fails at the platform level (e.g. body too
      // large, function timeout). We detect this by checking the content-type
      // BEFORE calling r.json(), so we don't throw "Unexpected token '<'".
      const contentType = r.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // Non-JSON response — Vercel platform error.
        if (r.status === 413) {
          setUploadMsg("文件过大，超过平台限制。请使用小于 450 KB 的图片，或改用图床链接。");
        } else if (r.status === 504) {
          setUploadMsg("上传超时，请重试或使用图床链接。");
        } else if (file.size > 450_000) {
          setUploadMsg(`文件过大（${(file.size / 1024).toFixed(0)} KB），请小于 450 KB，或改用图床链接。`);
        } else {
          setUploadMsg(`上传失败（HTTP ${r.status}），请重试或改用图床链接。`);
        }
        return;
      }

      const j = await r.json();
      if (r.ok && j.ok) {
        update({ avatarUrl: j.avatarUrl });
        setUploadMsg("上传成功");
      } else {
        setUploadMsg(j.error || "上传失败");
      }
    } catch (e: unknown) {
      setUploadMsg(e instanceof Error ? e.message : "网络错误");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = "";
  };

  /* ----------------------------- Link helpers ---------------------------- */
  const addLink = () => {
    const id = `l${Date.now()}`;
    const next: LinkItem = { id, label: "新链接", href: "https://", icon: "🔗", color: "#ffffff" };
    update({ links: [...settings.links, next] });
  };
  const removeLink = (id: string) =>
    update({ links: settings.links.filter((l) => l.id !== id) });
  const moveLink = (id: string, dir: -1 | 1) => {
    const idx = settings.links.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const next = [...settings.links];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    update({ links: next });
  };
  const patchLink = (id: string, patch: Partial<LinkItem>) =>
    update({
      links: settings.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });

  /* ------------------------------- Render -------------------------------- */
  return (
    <>
      {/* Subtle trigger — a small translucent dot in the very top-left corner.
          It's nearly invisible by default (low-opacity thin ring) so it
          doesn't disturb the ethereal cloud aesthetic. On hover it gently
          fades in and reveals a tiny gear icon. The hit area is 28×28 but
          the visible ring is only 14×14, so it stays unobtrusive. */}
      <button
        onClick={togglePanel}
        title="管理后台 (Ctrl+Shift+Z)"
        aria-label="管理后台"
        className="admin-trigger"
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 60,
          width: 28,
          height: 28,
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.35)",
          opacity: 0.55,
          transition: "opacity .35s ease, color .35s ease, transform .45s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.color = "rgba(255,255,255,0.95)";
          e.currentTarget.style.transform = "rotate(45deg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.55";
          e.currentTarget.style.color = "rgba(255,255,255,0.35)";
          e.currentTarget.style.transform = "rotate(0deg)";
        }}
      >
        {/* A small minimalist gear icon — just a 14px outline ring with 4 tiny
            notches, drawn as inline SVG to avoid the heavier lucide gear. */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.82 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 46,
            left: 10,
            zIndex: 60,
            maxWidth: "calc(100vw - 24px)",
          }}
        >
          {/* If auth required and not authed → password prompt */}
          {authRequired && !authed ? (
            <PasswordPrompt
              value={pwdInput}
              onChange={setPwdInput}
              onSubmit={tryAuth}
              loading={authChecking}
              error={authError}
              onClose={() => {
                setOpen(false);
                setAuthError("");
                setPwdInput("");
              }}
            />
          ) : (
            <div
              className="admin-scroll"
              style={{
                width: 360,
                maxHeight: "calc(100vh - 80px)",
                overflowY: "auto",
                background: "rgba(15,23,42,0.85)",
                color: "#e2e8f0",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
                padding: 14,
                fontSize: 13,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  paddingBottom: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(147,197,253,0.18)",
                    color: "#93c5fd",
                    flexShrink: 0,
                  }}
                >
                  <Settings2 size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                    管理后台
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                    Ctrl+Shift+Z 收起
                  </div>
                </div>
                {authRequired && (
                  <button
                    onClick={logout}
                    title="退出登录"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 6,
                      padding: "4px 9px",
                      color: "#94a3b8",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    退出
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  title="关闭 (Ctrl+Shift+Z)"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6,
                    width: 26,
                    height: 26,
                    color: "#94a3b8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Avatar */}
              <Section
                title="头像"
                icon={<CloudUpload size={13} />}
                accent="#93c5fd"
                sectionId="avatar"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      border: "2px solid #fff",
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {settings.avatarUrl ? (
                      <img
                        src={settings.avatarUrl}
                        alt="avatar"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <CloudUpload size={20} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={onFileChange}
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={btnStyle}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> 上传中…
                        </>
                      ) : (
                        <>
                          <CloudUpload size={12} /> 上传图片
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => update({ avatarUrl: "" })}
                      style={{ ...btnStyle, marginLeft: 6, background: "rgba(239,68,68,0.18)" }}
                    >
                      清空
                    </button>
                    {uploadMsg && (
                      <div style={{ marginTop: 4, fontSize: 11, color: "#fca5a5" }}>
                        {uploadMsg}
                      </div>
                    )}
                  </div>
                </div>

                {/* Image-bed URL field */}
                <Field label="或填写图床链接（https://…）">
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={settings.avatarUrl.startsWith("data:") ? "" : settings.avatarUrl}
                      onChange={(e) => update({ avatarUrl: e.target.value })}
                      placeholder="https://example.com/avatar.png"
                    />
                    <button
                      onClick={() => update({ avatarUrl: "" })}
                      title="清空"
                      style={{ ...miniBtn, width: 28, height: 28 }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
                    支持 PNG/JPG/WebP/GIF/SVG。上传≤450KB；图床链接无大小限制。
                  </div>
                </Field>

                <Field label="昵称">
                  <input
                    style={inputStyle}
                    value={settings.nickname}
                    onChange={(e) => update({ nickname: e.target.value })}
                    placeholder="显示在头像下方"
                  />
                </Field>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                    fontSize: 11,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.nicknameVisible}
                    onChange={(e) => update({ nicknameVisible: e.target.checked })}
                  />
                  在主页显示昵称（头像下方）
                </label>

                <Field label="网站标题 (浏览器 Tab)">
                  <input
                    style={inputStyle}
                    value={settings.pageTitle}
                    onChange={(e) => update({ pageTitle: e.target.value })}
                  />
                </Field>

                <Field label="头像动效">
                  <select
                    className="admin-select"
                    value={settings.avatarEffect}
                    onChange={(e) => update({ avatarEffect: e.target.value as AvatarEffect })}
                  >
                    {AVATAR_EFFECTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <RangeField
                  label={`头像大小 (${settings.avatarSize}px)`}
                  min={40}
                  max={200}
                  value={settings.avatarSize}
                  onChange={(v) => update({ avatarSize: v })}
                />
                <RangeField
                  label={`头像水平偏移 (${settings.avatarPosX}%)`}
                  min={-50}
                  max={50}
                  value={settings.avatarPosX}
                  onChange={(v) => update({ avatarPosX: v })}
                />
                <RangeField
                  label={`头像垂直位置 (${settings.avatarPosY}%)`}
                  min={0}
                  max={60}
                  value={settings.avatarPosY}
                  onChange={(v) => update({ avatarPosY: v })}
                />
              </Section>

              {/* Signature */}
              <Section
                title="个性签名"
                icon={<span style={{ fontSize: 13 }}>✍</span>}
                accent="#fbbf24"
                sectionId="signature"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <Field label="签名文字">
                  <textarea
                    style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
                    value={settings.signature}
                    onChange={(e) => update({ signature: e.target.value })}
                  />
                </Field>
                <Field label="签名动效">
                  <select
                    className="admin-select"
                    value={settings.signatureEffect}
                    onChange={(e) =>
                      update({ signatureEffect: e.target.value as SignatureEffect })
                    }
                  >
                    {SIGNATURE_EFFECTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <RangeField
                  label={`字号 (${settings.signatureSize}px)`}
                  min={10}
                  max={36}
                  value={settings.signatureSize}
                  onChange={(v) => update({ signatureSize: v })}
                />
                <RangeField
                  label={`水平偏移 (${settings.signaturePosX}%)`}
                  min={-50}
                  max={50}
                  value={settings.signaturePosX}
                  onChange={(v) => update({ signaturePosX: v })}
                />
                <RangeField
                  label={`垂直位置 (${settings.signaturePosY}%)`}
                  min={0}
                  max={80}
                  value={settings.signaturePosY}
                  onChange={(v) => update({ signaturePosY: v })}
                />
              </Section>

              {/* Sky theme */}
              <Section
                title="天空配色"
                icon={<span style={{ fontSize: 13 }}>🌈</span>}
                accent="#a78bfa"
                sectionId="sky"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                    fontSize: 11,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.useCustomSky}
                    onChange={(e) => update({ useCustomSky: e.target.checked })}
                  />
                  使用自定义渐变色
                </label>

                {!settings.useCustomSky ? (
                  <>
                    <Field label="预设">
                      <select
                        className="admin-select"
                        value={settings.skyThemeId}
                        onChange={(e) => update({ skyThemeId: e.target.value })}
                      >
                        {SKY_THEMES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {SKY_THEMES.map((t) => (
                        <button
                          key={t.id}
                          title={t.name}
                          onClick={() => update({ skyThemeId: t.id })}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border:
                              settings.skyThemeId === t.id
                                ? "2px solid #fff"
                                : "2px solid transparent",
                            cursor: "pointer",
                            background: `linear-gradient(to bottom, ${t.top}, ${t.bottom})`,
                          }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <ColorField
                      label="顶部色"
                      value={settings.customSky.top}
                      onChange={(v) =>
                        update({ customSky: { ...settings.customSky, top: v } })
                      }
                    />
                    <ColorField
                      label="地平线色"
                      value={settings.customSky.bottom}
                      onChange={(v) =>
                        update({ customSky: { ...settings.customSky, bottom: v } })
                      }
                    />
                    <ColorField
                      label="云雾色"
                      value={settings.customSky.fog}
                      onChange={(v) =>
                        update({ customSky: { ...settings.customSky, fog: v } })
                      }
                    />
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        height: 24,
                        borderRadius: 6,
                        background: `linear-gradient(to bottom, ${settings.customSky.top}, ${settings.customSky.bottom})`,
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    />
                    <div style={{ gridColumn: "1 / -1", fontSize: 10, color: "#94a3b8" }}>
                      提示：云雾色通常与地平线色相同，云朵才能平滑融入天空。
                    </div>
                  </div>
                )}
              </Section>

              {/* Cloud rendering */}
              <Section
                title="云朵渲染"
                icon={<span style={{ fontSize: 13 }}>☁</span>}
                accent="#7dd3fc"
                sectionId="cloud"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <RangeField
                  label={`云朵密度 (${settings.cloudDensity} 片)`}
                  min={500}
                  max={20000}
                  step={500}
                  value={settings.cloudDensity}
                  onChange={(v) => update({ cloudDensity: v })}
                />
                <RangeField
                  label={`云朵速度 (${settings.cloudSpeed.toFixed(2)}×)`}
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={settings.cloudSpeed}
                  onChange={(v) => update({ cloudSpeed: v })}
                />
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>
                  密度越高越朦胧（建议 4000-12000）；速度 1× 为原版速度。
                </div>
                <button
                  onClick={handleResetCloud}
                  style={{ ...btnStyle, background: "rgba(148,163,184,0.2)", width: "100%" }}
                >
                  <RotateCcw size={12} /> 重置云朵密度 / 速度
                </button>
              </Section>

              {/* Page font */}
              <Section
                title="页面字体"
                icon={<span style={{ fontSize: 13 }}>🔤</span>}
                accent="#86efac"
                sectionId="font"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <Field label="字体">
                  <select
                    className="admin-select"
                    value={settings.fontFamilyId}
                    onChange={(e) =>
                      update({ fontFamilyId: e.target.value as FontFamilyId })
                    }
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                  霞鹜文楷为网络字体（首次加载需联网），其余为系统字体（依赖访客设备）。
                </div>
              </Section>

              {/* Links */}
              <Section
                title={`链接 (${settings.links.length})`}
                icon={<Link2 size={13} />}
                accent="#f9a8d4"
                sectionId="links"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {settings.links.map((link, i) => (
                    <div
                      key={link.id}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 8,
                        padding: 8,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        <GripVertical size={12} color="#64748b" />
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>#{i + 1}</span>
                        <div style={{ flex: 1 }} />
                        <button
                          onClick={() => moveLink(link.id, -1)}
                          disabled={i === 0}
                          style={miniBtn}
                          title="上移"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveLink(link.id, 1)}
                          disabled={i === settings.links.length - 1}
                          style={miniBtn}
                          title="下移"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeLink(link.id)}
                          style={{ ...miniBtn, color: "#fca5a5" }}
                          title="删除"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          style={{
                            ...inputStyle,
                            width: 48,
                            textAlign: "center",
                            padding: "4px 6px",
                          }}
                          value={link.icon}
                          onChange={(e) => patchLink(link.id, { icon: e.target.value })}
                          placeholder="🌐"
                        />
                        <input
                          style={{ ...inputStyle, flex: 1, padding: "4px 8px" }}
                          value={link.label}
                          onChange={(e) => patchLink(link.id, { label: e.target.value })}
                          placeholder="名称"
                        />
                      </div>
                      <input
                        style={{ ...inputStyle, marginTop: 6, padding: "4px 8px" }}
                        value={link.href}
                        onChange={(e) => patchLink(link.id, { href: e.target.value })}
                        placeholder="https://"
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <label style={{ fontSize: 11, color: "#94a3b8" }}>图标颜色</label>
                        <input
                          type="color"
                          value={link.color || "#ffffff"}
                          onChange={(e) => patchLink(link.id, { color: e.target.value })}
                          style={{
                            width: 28,
                            height: 22,
                            padding: 0,
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: 4,
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: 10, color: "#64748b" }}>
                          （emoji 图标不适用颜色）
                        </span>
                      </div>
                    </div>
                  ))}
                  <button onClick={addLink} style={{ ...btnStyle, width: "100%" }}>
                    <Plus size={12} /> 添加链接
                  </button>
                </div>
              </Section>

              {/* Footer */}
              <Section
                title="页脚"
                icon={<span style={{ fontSize: 13 }}>📄</span>}
                accent="#fda4af"
                sectionId="footer"
                activeId={activeSection}
                onToggle={handleSectionToggle}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                    fontSize: 11,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.footerEnabled}
                    onChange={(e) => update({ footerEnabled: e.target.checked })}
                  />
                  显示页脚
                </label>
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: 90,
                    resize: "vertical",
                    fontFamily: "monospace",
                  }}
                  value={settings.footer}
                  onChange={(e) => update({ footer: e.target.value })}
                  placeholder='支持 HTML，例如：© 2026 · <a href="https://example.com">备案号</a>'
                />
                <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
                  支持 &lt;a&gt; / &lt;br&gt; / &lt;img&gt; / &amp;nbsp; 等。
                </div>
              </Section>

              {/* Save / Reset */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  style={{
                    ...btnStyle,
                    flex: 1,
                    background:
                      saveState === "saved"
                        ? "rgba(34,197,94,0.25)"
                        : "rgba(59,130,246,0.3)",
                  }}
                >
                  {saveState === "saving" ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> 保存中…
                    </>
                  ) : saveState === "saved" ? (
                    <>
                      <CheckCircle2 size={12} /> {saveMsg}
                    </>
                  ) : (
                    <>
                      <Save size={12} /> 保存到云端
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  style={{ ...btnStyle, background: "rgba(148,163,184,0.2)" }}
                >
                  <RotateCcw size={12} /> 重置
                </button>
              </div>
              {saveState === "error" && (
                <div style={{ marginTop: 4, fontSize: 11, color: "#fca5a5" }}>{saveMsg}</div>
              )}

              {/* DB status footer */}
              <DbStatusBlock db={db} loading={dbLoading} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* --------------------------- Password prompt ----------------------------- */
function PasswordPrompt({
  value,
  onChange,
  onSubmit,
  loading,
  error,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        width: 280,
        background: "rgba(15,23,42,0.92)",
        color: "#e2e8f0",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        padding: 16,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(251,191,36,0.18)",
            color: "#fbbf24",
            flexShrink: 0,
          }}
        >
          <Lock size={15} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
            管理后台已加密
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
            请输入密码以继续
          </div>
        </div>
        <button
          onClick={onClose}
          title="关闭"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            width: 26,
            height: 26,
            color: "#94a3b8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={13} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="管理密码"
          style={{
            ...inputStyle,
            width: "100%",
            marginBottom: 8,
          }}
        />
        {error && (
          <div style={{ fontSize: 11, color: "#fca5a5", marginBottom: 8 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !value}
          style={{
            ...btnStyle,
            width: "100%",
            background: "rgba(59,130,246,0.4)",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" /> 验证中…
            </>
          ) : (
            <>
              <Lock size={12} /> 验证并进入
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* --------------------------------- Bits ---------------------------------- */

/**
 * Collapsible section with an icon + colored accent.
 * Uses the parent's `activeSection` / `setActiveSection` to implement
 * accordion behavior (only one section open at a time). Pass the same
 * `sectionId` to all Sections and they'll coordinate via React context...
 * actually, simpler: we pass activeId + onToggle from the parent.
 */
function Section({
  title,
  icon,
  accent,
  sectionId,
  activeId,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  sectionId: string;
  activeId: string;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = activeId === sectionId;
  return (
    <div
      style={{
        marginBottom: 6,
        borderRadius: 10,
        overflow: "hidden",
        border: isOpen
          ? `1px solid ${accent}55`
          : "1px solid rgba(255,255,255,0.06)",
        background: isOpen ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "border-color .2s, background .2s",
      }}
    >
      <button
        onClick={() => onToggle(sectionId)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          color: "#e2e8f0",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontSize: 12.5,
          fontWeight: 600,
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            background: `${accent}22`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        <ChevronDown
          size={14}
          style={{
            color: "#64748b",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
            opacity: isOpen ? 1 : 0.5,
          }}
        />
      </button>
      {isOpen && (
        <div
          style={{
            padding: "4px 12px 12px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: "#cbd5e1",
          marginBottom: 3,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: "#cbd5e1",
          marginBottom: 3,
        }}
      >
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#60a5fa" }}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 10,
          color: "#cbd5e1",
          marginBottom: 3,
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 28,
            height: 24,
            padding: 0,
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <input
          style={{
            ...inputStyle,
            fontSize: 10,
            padding: "3px 4px",
            minWidth: 0,
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function DbStatusBlock({ db, loading }: { db: DbStatus; loading: boolean }) {
  let color = "#94a3b8";
  let icon = <Database size={12} />;
  let text = "检查中…";
  if (!loading && db) {
    if (db.connected) {
      color = "#86efac";
      icon = <CheckCircle2 size={12} />;
      text = `已连接${db.latencyMs != null ? ` · ${db.latencyMs}ms` : ""}`;
    } else {
      color = "#fca5a5";
      icon = <XCircle size={12} />;
      text = "未连接";
    }
  }
  return (
    <div
      style={{
        marginTop: 12,
        padding: "8px 10px",
        background: "rgba(0,0,0,0.25)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color }}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
        <strong>数据库（Upstash Redis）</strong>
        <span style={{ marginLeft: "auto", color }}>{text}</span>
      </div>
      <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 10, lineHeight: 1.5 }}>
        {db && !db.connected
          ? `原因：${db.message}。请前往 Vercel 项目 → Storage → 创建 Upstash Redis 集成，并确保环境变量 KV_REST_API_URL / KV_REST_API_TOKEN 已注入。`
          : "数据保存在 Redis Key: cloud-home:profile。每 30 秒自动刷新状态。"}
      </div>
    </div>
  );
}

/* ------------------------------- styles ---------------------------------- */
const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  fontSize: 12,
  background: "rgba(59,130,246,0.2)",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  background: "rgba(255,255,255,0.08)",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  fontSize: 12,
  outline: "none",
};
const miniBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  padding: 0,
  background: "rgba(255,255,255,0.08)",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 11,
};
