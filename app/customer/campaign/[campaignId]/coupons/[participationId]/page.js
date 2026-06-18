"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import styles from "./page.module.css";

// ── Canvas scratch overlay ────────────────────────────────────────────────────
function initScratchOverlay(canvas, onThreshold) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#ffc107");
  grad.addColorStop(1, "#ff9800");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let i = 0; i < 22; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 18 + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦  SCRATCH HERE  ✦", W / 2, H / 2);

  let isDown = false;
  let triggered = false;

  const eraseAt = (x, y) => {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    const { data } = ctx.getImageData(0, 0, W, H);
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 50) transparent++;
    if (!triggered && transparent / (W * H) >= 0.35) {
      triggered = true;
      onThreshold();
    }
  };

  const toPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const onDown = (e) => { isDown = true; e.preventDefault(); };
  const onUp   = ()  => { isDown = false; };
  const onMove = (e) => { if (!isDown) return; e.preventDefault(); const p = toPos(e); eraseAt(p.x, p.y); };

  canvas.addEventListener("mousedown",  onDown);
  canvas.addEventListener("mousemove",  onMove);
  canvas.addEventListener("mouseup",    onUp);
  canvas.addEventListener("mouseleave", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove",  onMove, { passive: false });
  canvas.addEventListener("touchend",   onUp);

  return () => {
    canvas.removeEventListener("mousedown",  onDown);
    canvas.removeEventListener("mousemove",  onMove);
    canvas.removeEventListener("mouseup",    onUp);
    canvas.removeEventListener("mouseleave", onUp);
    canvas.removeEventListener("touchstart", onDown);
    canvas.removeEventListener("touchmove",  onMove);
    canvas.removeEventListener("touchend",   onUp);
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatReward(reward) {
  if (!reward) return "Special Reward";
  const { type, value } = reward;
  if (type === "cashback"  || type === "Percentage")  return `${value}% OFF`;
  if (type === "discount"  || type === "Fixed Amount") return value ? `₹${value} OFF` : (reward.rewardName || "Discount");
  if (type === "freeItem"  || type === "Gift")         return reward.image ? null : (reward.rewardName || "Free Gift");
  if (type === "voucher")                              return value ? `₹${value} Voucher` : (reward.rewardName || "Voucher");
  if (value) return `₹${value} OFF`;
  return reward.rewardName || "Special Reward";
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CouponPage() {
  const params          = useParams();
  const campaignId      = params.campaignId;
  const participationId = params.participationId;

  const REVEAL_DURATION  = 300; // seconds — 5-min window to show cashier

  const [participation,  setParticipation]  = useState(null);
  const [coupons,        setCoupons]        = useState([]);
  // phase: 'select' → 'scratch' → 'revealed'
  const [phase,          setPhase]          = useState("select");
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [expired,        setExpired]        = useState(false);
  const [timeLeft,       setTimeLeft]       = useState(REVEAL_DURATION);
  const [animReady,      setAnimReady]      = useState(false);

  const canvasRef        = useRef(null);
  const cleanupRef       = useRef(null);
  const hasTriggeredRef  = useRef(false);
  const participationRef = useRef(null);
  const revealedAtRef    = useRef(null);

  // ── Load data ──
  useEffect(() => {
    if (!participationId || !campaignId) return;
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`/api/customer/participation/${participationId}`),
          fetch(`/api/customer/campaign/${campaignId}/coupons`),
        ]);
        const pJson = await pRes.json();
        if (!pJson.success) {
          if (pJson.expired) { setExpired(true); return; }
          setError(pJson.error || "Failed to load"); return;
        }
        setParticipation(pJson.data);
        participationRef.current = pJson.data;

        if (pJson.data.status === "revealed" || pJson.data.status === "redeemed") {
          setPhase("revealed");
          setTimeout(() => setAnimReady(true), 80);
          // Restore persisted reveal time so refresh doesn't reset countdown
          const storageKey = `reveal_ts_${participationId}`;
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const elapsed = (Date.now() - parseInt(saved, 10)) / 1000;
            setTimeLeft(Math.max(0, Math.round(REVEAL_DURATION - elapsed)));
          }
        }

        const cJson = await cRes.json();
        setCoupons(
          cJson.success && cJson.data?.coupons?.length > 0
            ? cJson.data.coupons
            : Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1) }))
        );
      } catch (_) {
        setError("Failed to load. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [participationId, campaignId]);

  // ── Countdown timer (persists across refreshes via localStorage) ──
  useEffect(() => {
    if (phase !== "revealed") return;
    const storageKey = `reveal_ts_${participationId}`;
    // Use persisted timestamp if available, otherwise stamp now (fresh reveal)
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, String(Date.now()));
    }
    revealedAtRef.current = parseInt(localStorage.getItem(storageKey), 10);
    const iv = setInterval(() => {
      const remaining = Math.max(0, REVEAL_DURATION - (Date.now() - revealedAtRef.current) / 1000);
      setTimeLeft(Math.round(remaining));
      if (remaining === 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, participationId]);

  // ── Scratch threshold ──
  const handleThreshold = useCallback(async () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    // Persist the reveal timestamp so refresh doesn't reset the countdown
    const storageKey = `reveal_ts_${participationId}`;
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, String(Date.now()));
    }
    setPhase("revealed");
    setTimeout(() => setAnimReady(true), 80);

    confetti({
      particleCount: 220, spread: 100, origin: { y: 0.55 },
      colors: ["#ffc107","#ff9800","#ff4757","#2ed573","#1e90ff","#a29bfe"],
    });
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 130, angle: 60,  origin: { x: 0.05, y: 0.5 } });
      confetti({ particleCount: 80, spread: 130, angle: 120, origin: { x: 0.95, y: 0.5 } });
    }, 350);

    try {
      await fetch(`/api/customer/participate/${participationId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scratchCardId: participationRef.current?.scratchCardId }),
      });
    } catch (_) {}
  }, [participationId]);

  // ── Mount scratch canvas when phase = 'scratch' ──
  useEffect(() => {
    if (phase !== "scratch" || !canvasRef.current) return;
    cleanupRef.current?.();
    cleanupRef.current = initScratchOverlay(canvasRef.current, handleThreshold);
    return () => cleanupRef.current?.();
  }, [phase, handleThreshold]);

  // ── Derived ──
  const storeName     = participation?.store?.storeName || "Store";
  const campaignName  = participation?.campaign?.campaignName || "";
  const storeInitials = storeName.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const reward        = participation?.reward || null;
  const rewardDisplay = formatReward(reward);

  // ── Loading ──
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredState}>
          <div className={styles.spinner} />
          <p className={styles.stateText}>Loading your coupons…</p>
        </div>
      </div>
    );
  }

  // ── Expired session ──
  if (expired) {
    return (
      <div className={`${styles.page} ${styles.pageDark}`}>
        <div className={styles.centeredState}>
          <div className={styles.expiredIcon}>⏰</div>
          <h2 className={styles.expiredTitle}>Session Expired</h2>
          <p className={styles.expiredDesc}>
            Your reward session has timed out. Each scratch session is valid for 5 minutes after revealing your reward.
          </p>
          <div className={styles.expiredHint}>
            Please visit the store again to get a new coupon.
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredState}>
          <span className={styles.errorEmoji}>⚠️</span>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.stateText}>{error}</p>
        </div>
      </div>
    );
  }

  // ── Shared store header ──
  const storeHeader = (
    <div className={styles.storeHeader}>
      <div className={styles.storeAvatar}>{storeInitials}</div>
      <div className={styles.storeText}>
        <div className={styles.storeName}>{storeName}</div>
        {campaignName && <div className={styles.campaignTag}>{campaignName}</div>}
      </div>
    </div>
  );

  // ════════════════════════════════════════════
  // SELECT phase — mystery cards, no values shown
  // ════════════════════════════════════════════
  if (phase === "select") {
    return (
      <div className={styles.page}>
        {storeHeader}
        <div className={styles.body}>
          <div className={styles.titleBlock}>
            <h1 className={styles.pageTitle}>Pick your lucky coupon</h1>
            <p className={styles.pageSubtitle}>Tap one to scratch — <em>only one</em></p>
          </div>

          <div className={styles.grid}>
            {coupons.map((coupon, index) => (
              <button
                key={coupon.id || index}
                type="button"
                className={styles.card}
                onClick={() => {
                  setSelectedCoupon(coupon);
                  setPhase("scratch");
                }}
                aria-label="Select coupon"
              >
                <span className={`${styles.dot} ${styles.dot1}`} />
                <span className={`${styles.dot} ${styles.dot2}`} />
                <span className={`${styles.dot} ${styles.dot3}`} />
                <span className={`${styles.dot} ${styles.dot4}`} />
                <span className={`${styles.dot} ${styles.dot5}`} />
                <div className={styles.cardContent}>
                  <div className={styles.giftCircle}><GiftSvg /></div>
                </div>
              </button>
            ))}
          </div>

          <p className={styles.countHint}>{coupons.length} coupons available</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // SCRATCH phase — selected card large + canvas
  // ════════════════════════════════════════════
  if (phase === "scratch") {
    return (
      <div className={`${styles.page} ${styles.pageDark}`}>
        {storeHeader}
        <div className={styles.body}>
          <div className={styles.scratchBlock}>
            <p className={styles.scratchTitle}>Scratch to reveal your reward!</p>
            <div className={styles.scratchCardWrap}>
              <div className={styles.scratchRevealBg}>
                <div className={styles.scratchRevealGiftCircle}>
                  <RevealGiftSvg />
                </div>
                {reward?.image ? (
                  <img src={reward.image} alt="Gift reward" className={styles.scratchRevealGiftImg} />
                ) : (
                  <div className={styles.scratchRevealValue}>{rewardDisplay}</div>
                )}
                {reward?.description && (
                  <div className={styles.scratchRevealDesc}>{reward.description}</div>
                )}
                <div className={styles.scratchRevealLabel}>You Won!</div>
              </div>
              <canvas
                ref={canvasRef}
                width={280}
                height={370}
                className={styles.scratchCanvas}
              />
            </div>
            <p className={styles.scratchHint}>Use finger or mouse to scratch</p>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // REVEALED phase — reward + 5-min countdown
  // ════════════════════════════════════════════
  const isExpiring = timeLeft <= 60 && timeLeft > 0;
  const isExpired  = timeLeft === 0;

  return (
    <div className={`${styles.page} ${styles.pageDark}`}>
      {storeHeader}
      <div className={styles.body}>
        <div className={styles.celebBlock}>
          <div className={styles.celebEmoji}>🎉</div>
          <h1 className={styles.celebTitle}>You Won!</h1>
          <p className={styles.celebSub}>Here is your reward</p>
        </div>

        {/* Reward card */}
        <div className={`${styles.rewardCard} ${animReady ? styles.rewardCardIn : ""}`}>
          <div className={styles.rewardTop}>
            <div className={styles.rewardGiftCircle}>
              <RewardGiftSvg />
            </div>
            {reward?.image ? (
              <img src={reward.image} alt="Gift reward" className={styles.rewardGiftImg} />
            ) : (
              <div className={styles.rewardValue}>{rewardDisplay}</div>
            )}
            {reward?.description && (
              <div className={styles.rewardDesc}>{reward.description}</div>
            )}
          </div>
        </div>

        {/* 5-minute countdown */}
        <div className={`${styles.countdown} ${isExpiring ? styles.countdownWarn : ""} ${isExpired ? styles.countdownDead : ""}`}>
          <div className={styles.countdownLabel}>
            {isExpired ? "Session Expired" : "Show to cashier before"}
          </div>
          <div className={`${styles.countdownTime} ${isExpiring ? styles.countdownTimeWarn : ""} ${isExpired ? styles.countdownTimeDead : ""}`}>
            {isExpired ? "00:00" : formatTime(timeLeft)}
          </div>
          <div className={styles.countdownSub}>
            {isExpired
              ? "Ask the cashier for assistance"
              : `${Math.ceil(timeLeft / 60)} minute${Math.ceil(timeLeft / 60) !== 1 ? "s" : ""} remaining to redeem`}
          </div>
        </div>

        <p className={styles.claimHint}>Present this screen at the store counter to claim</p>
      </div>
    </div>
  );
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function GiftSvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="5" rx="1" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      <rect x="4" y="12" width="16" height="10" rx="1" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <line x1="12" y1="7" x2="12" y2="22" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <path d="M12 7C12 7 9.5 2 7 3.5C5.5 4.5 7 7 12 7Z" fill="rgba(255,255,255,0.55)" />
      <path d="M12 7C12 7 14.5 2 17 3.5C18.5 4.5 17 7 12 7Z" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}


function RevealGiftSvg() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="5" rx="1" fill="rgba(255,255,255,0.45)" />
      <rect x="4" y="12" width="16" height="10" rx="1" fill="rgba(255,255,255,0.38)" />
      <line x1="12" y1="7" x2="12" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <path d="M12 7C12 7 9.5 2 7 3.5C5.5 4.5 7 7 12 7Z" fill="rgba(255,255,255,0.5)" />
      <path d="M12 7C12 7 14.5 2 17 3.5C18.5 4.5 17 7 12 7Z" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

function RewardGiftSvg() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="5" rx="1" fill="rgba(255,255,255,0.92)" />
      <rect x="4" y="12" width="16" height="10" rx="1" fill="rgba(255,255,255,0.86)" />
      <line x1="12" y1="7" x2="12" y2="22" stroke="rgba(239,158,27,0.6)" strokeWidth="2" />
      <path d="M12 7C12 7 9.5 2 7 3.5C5.5 4.5 7 7 12 7Z" fill="rgba(255,255,255,0.82)" />
      <path d="M12 7C12 7 14.5 2 17 3.5C18.5 4.5 17 7 12 7Z" fill="rgba(255,255,255,0.82)" />
    </svg>
  );
}
