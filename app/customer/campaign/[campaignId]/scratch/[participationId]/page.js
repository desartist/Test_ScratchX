"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import styles from "./scratch.module.css";

/**
 * Initialises the golden scratch overlay on a canvas element.
 * Returns a cleanup function (removes all event listeners).
 * @param {HTMLCanvasElement} canvas
 * @param {() => void} onThreshold  - called once when 35 % is scratched
 */
function initScratchOverlay(canvas, onThreshold) {
  if (!canvas) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;

  // Golden gradient fill
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#ffc107");
  grad.addColorStop(1, "#ff9800");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle glossy blobs
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * W,
      Math.random() * H,
      Math.random() * 18 + 6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // "SCRATCH HERE" hint
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦  SCRATCH HERE  ✦", W / 2, H / 2);

  let isDown = false;
  let triggered = false;

  const eraseAt = (x, y) => {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Check threshold (sample every call – cheap because canvas is small)
    const { data } = ctx.getImageData(0, 0, W, H);
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 50) transparent++;
    }
    if (!triggered && transparent / (W * H) >= 0.35) {
      triggered = true;
      onThreshold();
    }
  };

  const toCanvasPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * sx,
        y: (e.touches[0].clientY - rect.top) * sy,
      };
    }
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  };

  const onDown  = (e) => { isDown = true; e.preventDefault(); };
  const onUp    = ()  => { isDown = false; };
  const onMove  = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const p = toCanvasPos(e);
    eraseAt(p.x, p.y);
  };

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

/** Format the reward for big display (reward_type values from ScratchCardRecord) */
function formatReward(reward) {
  if (!reward) return "🎁 Special Reward";
  const type  = reward.type  || "";
  const value = reward.value;
  if (type === "cashback"  || type === "Percentage")  return `${value}% OFF`;
  if (type === "discount"  || type === "Fixed Amount") return value ? `₹${value} OFF` : (reward.rewardName || "Discount");
  if (type === "freeItem"  || type === "Gift")        return reward.image ? null : (reward.rewardName || "🎁 Free Gift");
  if (type === "voucher")                              return value ? `₹${value} Voucher` : (reward.rewardName || "Voucher");
  if (value)                                           return `₹${value} OFF`;
  return reward.rewardName || "🎁 Special Reward";
}

export default function ScratchCardPage() {
  const params = useParams();
  const router = useRouter();
  const canvasRef  = useRef(null);
  const cleanupRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  const campaignId      = params?.campaignId;
  const participationId = params?.participationId;

  const [participation, setParticipation] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [revealed,      setRevealed]      = useState(false);
  const [animReady,     setAnimReady]     = useState(false);
  const [isReturning,   setIsReturning]   = useState(false);
  // Countdown timer (seconds remaining). null = not applicable.
  const [secondsLeft,   setSecondsLeft]   = useState(null);
  const timerRef = useRef(null);

  // ── Start countdown from a DB expiry timestamp ──
  const startTimer = useCallback((expiresAt) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Fetch participation once ──
  useEffect(() => {
    if (!participationId) {
      setError("Participation ID not found");
      setLoading(false);
      return;
    }
    fetch(`/api/customer/participation/${participationId}`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.success) {
          setError(result.error || "Failed to load scratch card");
          return;
        }
        const data = result.data;
        setParticipation(data);
        const alreadyDone = data.status === "revealed" || data.status === "redeemed";
        if (alreadyDone) {
          setIsReturning(true);
          setRevealed(true);
          setTimeout(() => setAnimReady(true), 80);
          // Restore timer from DB — only if not yet redeemed and not expired
          if (data.status !== "redeemed" && data.rewardClaimExpiresAt) {
            startTimer(data.rewardClaimExpiresAt);
          }
        }
      })
      .catch((err) => setError("Failed to load: " + err.message))
      .finally(() => setLoading(false));
  }, [participationId, startTimer]);

  // ── Called by initScratchOverlay when threshold reached ──
  const handleThreshold = useCallback(async () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    // Immediately flip to reward view
    setRevealed(true);

    // Big confetti burst
    confetti({
      particleCount: 220,
      spread: 100,
      origin: { y: 0.55 },
      colors: ["#ffc107", "#ff9800", "#ff4757", "#2ed573", "#1e90ff", "#a29bfe"],
    });
    setTimeout(() => {
      confetti({ particleCount: 90, spread: 130, angle: 60,  origin: { x: 0.05, y: 0.5 } });
      confetti({ particleCount: 90, spread: 130, angle: 120, origin: { x: 0.95, y: 0.5 } });
    }, 350);

    // Animate reward card in
    setTimeout(() => setAnimReady(true), 80);

    // Reveal API call — read rewardClaimExpiresAt to start accurate timer
    try {
      const res = await fetch(`/api/customer/participate/${participationId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scratchCardId: participation?.scratchCardId }),
      });
      const revealData = await res.json();
      if (revealData?.data?.rewardClaimExpiresAt) {
        startTimer(revealData.data.rewardClaimExpiresAt);
      }
    } catch (err) {
      console.error("Reveal API error (non-fatal):", err);
    }
  }, [participationId, participation, startTimer]);

  // ── Mount scratch overlay ──
  useEffect(() => {
    if (!canvasRef.current || loading || revealed) return;
    cleanupRef.current?.();
    cleanupRef.current = initScratchOverlay(canvasRef.current, handleThreshold);
    return () => cleanupRef.current?.();
  }, [loading, revealed, handleThreshold]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredState}>
          <div className={styles.spinner} />
          <p className={styles.stateText}>Loading your scratch card…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !participation) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredState}>
          <span className={styles.errorEmoji}>⚠️</span>
          <h2 className={styles.errorTitle}>Oops!</h2>
          <p className={styles.stateText}>{error || "Could not load scratch card"}</p>
          <button className={styles.actionBtn} onClick={() => router.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const reward       = participation.reward   || {};
  const campaign     = participation.campaign || {};
  const store        = participation.store    || {};
  const storeName    = store.storeName || "Store";
  const storeInitials = storeName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const rewardDisplay = formatReward(reward);

  // ── Reward / Celebration view ──
  if (revealed) {
    const handleCopy = () => {
      if (reward.couponCode) {
        navigator.clipboard.writeText(reward.couponCode).catch(() => {});
      }
    };

    const isExpiredClaim = participation?.status !== "redeemed" &&
      participation?.rewardClaimExpiresAt &&
      new Date(participation.rewardClaimExpiresAt) < new Date() &&
      secondsLeft === 0;

    const timerMins  = secondsLeft !== null ? String(Math.floor(secondsLeft / 60)).padStart(2, "0") : null;
    const timerSecs  = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, "0") : null;

    return (
      <div className={`${styles.page} ${styles.pageWarm}`}>
        {/* Store header */}
        <div className={styles.storeHeader}>
          <div className={styles.storeAvatar}>{storeInitials}</div>
          <div>
            <div className={styles.storeName}>{storeName}</div>
            {campaign.campaignName && (
              <div className={styles.campaignTag}>{campaign.campaignName}</div>
            )}
          </div>
        </div>

        {/* Returning customer notice */}
        {isReturning && (
          <div style={{ margin: "0 20px 8px", padding: "10px 16px", background: "rgba(255,255,255,0.25)", borderRadius: 10, textAlign: "center", fontSize: "0.85rem", color: "#010f44", fontWeight: 600 }}>
            ✔ You already revealed this reward
          </div>
        )}

        {/* Celebration hero */}
        <div className={styles.celebHero}>
          <div className={styles.celebEmoji}>🎉</div>
          <h1 className={styles.celebTitle}>You Won!</h1>
          <p className={styles.celebSub}>Congratulations on your reward</p>
        </div>

        {/* Redemption countdown timer */}
        {timerMins !== null && participation?.status !== "redeemed" && (
          <div style={{ textAlign: "center", margin: "0 20px 12px" }}>
            {isExpiredClaim ? (
              <div style={{ padding: "10px 16px", background: "#fee2e2", borderRadius: 10, color: "#991b1b", fontWeight: 700, fontSize: "0.9rem" }}>
                ⏰ Redemption window expired
              </div>
            ) : (
              <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.3)", borderRadius: 10, fontWeight: 700, fontSize: "1rem", color: "#010f44" }}>
                ⏱ Redeem within: {timerMins}:{timerSecs}
              </div>
            )}
          </div>
        )}
        {participation?.status === "redeemed" && (
          <div style={{ textAlign: "center", margin: "0 20px 12px", padding: "10px 16px", background: "rgba(39,174,96,0.2)", borderRadius: 10, fontWeight: 700, color: "#1a6e3c", fontSize: "0.9rem" }}>
            ✅ Reward redeemed
          </div>
        )}

        {/* Reward card */}
        <div
          className={`${styles.rewardCard} ${animReady ? styles.rewardCardIn : ""}`}
        >
          <div className={styles.rewardTop}>
            <div className={styles.rewardGiftCircle}>
              <RewardGiftSvg />
            </div>
            {reward.image ? (
              <img src={reward.image} alt="Gift reward" className={styles.rewardGiftImg} />
            ) : (
              <div className={styles.rewardValue}>{rewardDisplay}</div>
            )}
            {reward.rewardName && rewardDisplay !== reward.rewardName && (
              <div className={styles.rewardName}>{reward.rewardName}</div>
            )}
            {reward.description && (
              <div className={styles.rewardDesc}>{reward.description}</div>
            )}
          </div>

          {reward.couponCode && (
            <div className={styles.couponZone}>
              <div className={styles.couponLabel}>Your Coupon Code</div>
              <div className={styles.couponRow}>
                <code className={styles.couponCode}>{reward.couponCode}</code>
                <button className={styles.copyBtn} onClick={handleCopy}>
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Store info */}
        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>Store</span>
            <span className={styles.infoVal}>{storeName}</span>
          </div>
          {store.city && (
            <div className={styles.infoRow}>
              <span className={styles.infoLbl}>Location</span>
              <span className={styles.infoVal}>
                {store.city}
                {store.state ? `, ${store.state}` : ""}
              </span>
            </div>
          )}
          {reward.expiryDate && (
            <div className={styles.infoRow}>
              <span className={styles.infoLbl}>Valid Until</span>
              <span className={styles.infoVal}>
                {new Date(reward.expiryDate).toLocaleDateString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <p className={styles.claimHint}>
          {participation?.status === "redeemed"
            ? "This reward has been redeemed. Thank you!"
            : isExpiredClaim
              ? "The redemption window has passed. Please contact the store."
              : "Show this screen to the cashier within the timer to claim your reward"}
        </p>
      </div>
    );
  }

  // ── Scratch view ──
  return (
    <div className={styles.page}>
      {/* Store header */}
      <div className={styles.storeHeader}>
        <div className={styles.storeAvatar}>{storeInitials}</div>
        <div>
          <div className={styles.storeName}>{storeName}</div>
          {campaign.campaignName && (
            <div className={styles.campaignTag}>{campaign.campaignName}</div>
          )}
        </div>
      </div>

      {/* Scratch title */}
      <div className={styles.scratchTitleBlock}>
        <h1 className={styles.scratchTitle}>Scratch Your Coupon</h1>
        <p className={styles.scratchSub}>Reveal your reward</p>
      </div>

      {/* Card + canvas */}
      <div className={styles.cardShell}>
        {/* Golden background visible through the scratch layer */}
        <div className={styles.revealBg}>
          <div className={styles.revealBgCircle}>
            <RevealGiftSvg />
          </div>
          <div className={styles.revealBgText}>YOU WON</div>
        </div>

        {/* Scratch overlay canvas — sits on top */}
        <canvas
          ref={canvasRef}
          width={300}
          height={400}
          className={styles.scratchCanvas}
        />
      </div>

      <p className={styles.hint}>Scratch the card to reveal your reward!</p>
      <p className={styles.hint2}>Use finger or mouse to scratch</p>
    </div>
  );
}

function RevealGiftSvg() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
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
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="5" rx="1" fill="rgba(255,255,255,0.9)" />
      <rect x="4" y="12" width="16" height="10" rx="1" fill="rgba(255,255,255,0.85)" />
      <line x1="12" y1="7" x2="12" y2="22" stroke="rgba(239,158,27,0.55)" strokeWidth="2" />
      <path d="M12 7C12 7 9.5 2 7 3.5C5.5 4.5 7 7 12 7Z" fill="rgba(255,255,255,0.8)" />
      <path d="M12 7C12 7 14.5 2 17 3.5C18.5 4.5 17 7 12 7Z" fill="rgba(255,255,255,0.8)" />
    </svg>
  );
}
