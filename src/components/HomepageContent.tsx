"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { getFontOption, type ProfileSettings } from "@/lib/types";

interface Props {
  settings: ProfileSettings;
}

/**
 * Renders the visible homepage content (avatar + nickname + signature + links + footer)
 * overlaid on top of the cloud background. Faithful to the original layout:
 *  - avatar fixed-centered horizontally at top:16%
 *  - signature centered at top:36%
 *  - links centered at top:41% (max-width 800px, flex-wrap)
 *  - copyright pinned to bottom
 * All positions/sizes/effects are driven by settings.
 */
export default function HomepageContent({ settings }: Props) {
  return (
    <>
      <AvatarBlock settings={settings} />
      <SignatureBlock settings={settings} />
      <LinksBlock settings={settings} />
      {settings.footerEnabled && <FooterBlock settings={settings} />}
    </>
  );
}

/* --------------------------------- Avatar --------------------------------- */
function AvatarBlock({ settings }: { settings: ProfileSettings }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const avatarUrl = settings.avatarUrl || "";

  // Fallback to a soft emoji placeholder if no avatar set.
  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
         <circle cx="80" cy="80" r="78" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
         <text x="80" y="98" font-size="64" text-anchor="middle" fill="#fff" font-family="serif">☁</text>
       </svg>`
    );

  const effectClass = `avatar-fx avatar-fx--${settings.avatarEffect}`;
  const size = settings.avatarSize;

  return (
    <div
      className="img-content"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: `${settings.avatarPosY}%`,
        margin: "0 auto",
        transform: `translateX(${settings.avatarPosX}%)`,
        width: size,
        height: size,
        maxWidth: size,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        className={effectClass}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid #fff",
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {settings.avatarEffect === "pulse-ring" && (
          <span className="avatar-ring" aria-hidden />
        )}
        <img
          src={avatarUrl || placeholder}
          alt={settings.nickname || "avatar"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            borderRadius: "50%",
          }}
        />
      </div>

      {settings.nicknameVisible && settings.nickname && (
        <NicknameBadge
          nickname={settings.nickname}
          avatarSize={size}
          cssFamily={getFontOption(settings.fontFamilyId).cssFamily}
        />
      )}
    </div>
  );
}

/**
 * Nickname shown below the avatar. Positioned absolutely beneath the avatar
 * circle so it doesn't disturb the avatar's own transform animation.
 * Uses the user-selected page font (passed in as cssFamily).
 */
function NicknameBadge({
  nickname,
  avatarSize,
  cssFamily,
}: {
  nickname: string;
  avatarSize: number;
  cssFamily: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: avatarSize + 14,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        fontSize: Math.max(14, Math.round(avatarSize * 0.22)),
        fontFamily: cssFamily,
        fontWeight: "bold",
        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
        letterSpacing: "0.08em",
        pointerEvents: "none",
      }}
    >
      {nickname}
    </div>
  );
}

/* ------------------------------- Signature -------------------------------- */
function SignatureBlock({ settings }: { settings: ProfileSettings }) {
  const size = settings.signatureSize;
  const isTyping = settings.signatureEffect === "typing";

  // The typewriter effect requires a MONOSPACE font so that each `steps(N)`
  // increment reveals exactly one character. For all other effects (none,
  // fade, wave, rainbow) we use the user-selected page font — which inherits
  // from the <main> container via the font selector in the admin panel.
  // So we only set an explicit font-family when typing is active.
  const pageFontFamily = getFontOption(settings.fontFamilyId).cssFamily;
  const signatureFontFamily = isTyping
    ? "'Courier New', Courier, monospace"
    : pageFontFamily;

  // For the typewriter effect we MEASURE the actual rendered text width in
  // pixels, then apply the animation via INLINE STYLE (not via CSS class).
  // This is necessary because CSS `animation-timing-function: steps(var(--x))`
  // does NOT work — the Web Animations engine cannot resolve var() inside
  // steps(), so the timing function silently falls back to "linear". By
  // writing `steps(13, end)` as a literal string in inline style, we avoid
  // the var() issue entirely.
  const sigRef = useRef<HTMLParagraphElement | null>(null);
  const [measured, setMeasured] = useState<{ w: number; steps: number } | null>(null);
  const text = settings.signature || "";
  const graphemes = Array.from(text);

  useLayoutEffect(() => {
    if (!isTyping) {
      setMeasured(null);
      return;
    }
    if (typeof document === "undefined") return;
    // Measure using a hidden span with the SAME font as the signature will
    // use (monospace, since typing requires it).
    const span = document.createElement("span");
    span.style.cssText = `position:absolute; visibility:hidden; white-space:nowrap; font-family: 'Courier New', Courier, monospace; font-size: ${size}px; letter-spacing: 0.05em; font-variant-east-asian: full-width;`;
    span.textContent = text;
    document.body.appendChild(span);
    const w = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    setMeasured({ w: Math.ceil(w), steps: graphemes.length || 1 });
  }, [isTyping, text, size, graphemes.length]);

  return (
    <div
      className="p-content"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: `${settings.signaturePosY}%`,
        transform: `translateX(${settings.signaturePosX}%)`,
        margin: "0 auto",
        padding: 15,
        width: "60%",
        maxWidth: 600,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <p
        ref={sigRef}
        className={`sig-fx sig-fx--${settings.signatureEffect}`}
        style={{
          color: "#fff",
          fontFamily: signatureFontFamily,
          fontSize: size,
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
          textAlign: isTyping ? "left" : "center",
          margin: 0,
          letterSpacing: "0.05em",
          lineHeight: 1.5,
          // When typing effect is active AND we've measured the text, apply
          // the animation via inline style with a LITERAL steps() value AND
          // a literal target width. We cannot use var() inside steps() (the
          // Web Animations engine can't resolve it), and var() inside the
          // keyframe's width value also doesn't animate correctly in
          // Chromium. So we generate a UNIQUE keyframe name per signature
          // length and inject it via a <style> tag (outside this <p>, see
          // below), with the measured width baked in as a literal px value.
          //
          // Keyframe design: 0% width=0, 85% width=full, 100% width=full.
          // This gives a "hold" at the end so the full text is visible for
          // 15% of the duration before the alternate-direction erase begins.
          // Combined with steps(N, end), each of the N steps reveals one
          // more character width (full/N per step), and the 85-100% hold
          // keeps the last character visible long enough to read.
          ...(isTyping && measured
            ? ({
                animation: `sig-typing-${measured.steps} 5s steps(${measured.steps}, end) infinite alternate, sig-blink 0.7s step-end infinite`,
              } as React.CSSProperties)
            : {}),
        }}
      >
        {settings.signature}
      </p>
      {isTyping && measured && (
        <style>{`
          @keyframes sig-typing-${measured.steps} {
            0% { width: 0; }
            85% { width: ${measured.w}px; }
            100% { width: ${measured.w}px; }
          }
        `}</style>
      )}
    </div>
  );
}

/* --------------------------------- Links ---------------------------------- */
function LinksBlock({ settings }: { settings: ProfileSettings }) {
  return (
    <div
      className="tp-content"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: "41%",
        margin: "0 auto",
        padding: 15,
        width: "80%",
        maxWidth: 800,
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        fontFamily: getFontOption(settings.fontFamilyId).cssFamily,
        fontWeight: "bold",
        zIndex: 5,
      }}
    >
      {settings.links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "12%",
            minWidth: 110,
            margin: "15px 2%",
            padding: "8px 12px",
            borderRadius: 8,
            color: "#fff",
            fontSize: 16,
            lineHeight: "30px",
            textDecoration: "none",
            background: "rgba(0,68,255,0)",
            transition: "all .3s",
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderRadius = "0";
            e.currentTarget.style.background = "rgba(144,0,255,.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderRadius = "8px";
            e.currentTarget.style.background = "rgba(0,68,255,0)";
          }}
        >
          {link.icon?.startsWith("icon-") ? (
            <i
              className={`iconfont ${link.icon}`}
              style={{ color: link.color || "#fff", marginRight: 6, fontSize: 20 }}
            />
          ) : (
            <span style={{ marginRight: 6, fontSize: 20 }}>{link.icon}</span>
          )}
          &nbsp;{link.label}
        </a>
      ))}

      <style jsx global>{`
        @media screen and (max-width: 1200px) {
          .tp-content a { width: 40% !important; margin: 12px 5% !important; }
        }
        @media screen and (max-width: 980px) {
          .tp-content a { width: 40% !important; }
        }
        @media screen and (max-width: 650px) {
          .tp-content a { width: 80% !important; }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------- Footer ---------------------------------- */
function FooterBlock({ settings }: { settings: ProfileSettings }) {
  return (
    <div
      className="copyright"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 12,
        color: "#737373",
        lineHeight: "20px",
        padding: "6px 0",
        zIndex: 5,
        pointerEvents: "auto",
      }}
      // Footer is user-trusted HTML; rendered via dangerouslySetInnerHTML to keep
      // full backward compatibility with the original site's markup.
      dangerouslySetInnerHTML={{ __html: settings.footer || "" }}
    />
  );
}
