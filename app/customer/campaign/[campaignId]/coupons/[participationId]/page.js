"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { useBackNavigationGuard } from "@/hooks/useBackNavigationGuard";
import SessionExpiredIcon from "@/components/customer/SessionExpiredIcon";
import styles from "./page.module.css";

// ── Canvas scratch overlay ────────────────────────────────────────────────────
// The canvas is drawn at 2× its 280×360 design size so the artwork and text
// stay crisp on phone screens; every measurement below is scaled by `S`.
const SCRATCH_W = 280;
const SCRATCH_H = 360;
const SCRATCH_SCALE = 2;

// Gift icon (24-unit grid) — same shape as the cards on the select screen.
const GIFT_PATHS = [
  "M3 7h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z",
  "M4 12h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z",
  "M12 7C12 7 9.5 2 7 3.5C5.5 4.5 7 7 12 7Z",
  "M12 7C12 7 14.5 2 17 3.5C18.5 4.5 17 7 12 7Z",
];

function drawScratchCover(ctx, W, H) {
  const S = W / SCRATCH_W;

  // Base — the same warm gradient as the coupon tickets.
  const base = ctx.createLinearGradient(0, 0, W * 0.6, H);
  base.addColorStop(0, "#ffcf47");
  base.addColorStop(0.52, "#ffab1f");
  base.addColorStop(1, "#ff8a00");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Diagonal stripes.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 10 * S;
  for (let x = -H; x < W; x += 20 * S) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // Gloss in the top-left corner.
  const gloss = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W * 0.7);
  gloss.addColorStop(0, "rgba(255,255,255,0.35)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, W, H);

  // Dashed inner frame.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5 * S;
  ctx.setLineDash([6 * S, 5 * S]);
  ctx.beginPath();
  ctx.roundRect(12 * S, 12 * S, W - 24 * S, H - 24 * S, 14 * S);
  ctx.stroke();
  ctx.restore();

  // Sparkles (fixed positions, so the card looks the same every time).
  const sparkles = [[0.2, 0.2, 5], [0.8, 0.16, 4], [0.86, 0.72, 5], [0.16, 0.8, 4], [0.7, 0.88, 3]];
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const [fx, fy, r] of sparkles) {
    const x = fx * W, y = fy * H, k = r * S;
    ctx.beginPath();
    ctx.moveTo(x, y - k);
    ctx.quadraticCurveTo(x, y, x + k, y);
    ctx.quadraticCurveTo(x, y, x, y + k);
    ctx.quadraticCurveTo(x, y, x - k, y);
    ctx.quadraticCurveTo(x, y, x, y - k);
    ctx.fill();
  }

  // Gift badge.
  const cx = W / 2, cy = H * 0.42, R = 40 * S;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill();
  ctx.lineWidth = 1.5 * S;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.stroke();
  ctx.save();
  const icon = 40 * S;
  ctx.translate(cx - icon / 2, cy - icon / 2);
  ctx.scale(icon / 24, icon / 24);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (const d of GIFT_PATHS) ctx.fill(new Path2D(d));
  ctx.fillStyle = "rgba(239,140,0,0.55)";
  ctx.fillRect(11.1, 7, 1.8, 15);
  ctx.restore();

  // Labels.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(150,70,0,0.35)";
  ctx.shadowBlur = 4 * S;
  ctx.shadowOffsetY = 1 * S;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${17 * S}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText("S C R A T C H   H E R E", cx, cy + R + 28 * S);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 ${11.5 * S}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText("to reveal your reward", cx, cy + R + 50 * S);
}

function initScratchOverlay(canvas, onThreshold, onStart) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const brush = 30 * (W / SCRATCH_W);

  drawScratchCover(ctx, W, H);

  let isDown = false;
  let started = false;
  let triggered = false;
  let last = null;
  let strokes = 0;

  // Share of the cover already scratched away. Sampled (every 8th pixel) —
  // reading every pixel of a 2× canvas on each move is needlessly slow.
  const clearedShare = () => {
    const { data } = ctx.getImageData(0, 0, W, H);
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 32) {
      total++;
      if (data[i] < 50) clear++;
    }
    return clear / total;
  };

  // Erase along the finger's path (not just dots at each event), so a fast
  // swipe scratches a continuous line.
  const eraseTo = (p) => {
    ctx.globalCompositeOperation = "destination-out";
    // Opaque, so a stroke clears the cover completely (the colour itself is
    // irrelevant under destination-out — only its alpha counts).
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush * 2;
    ctx.beginPath();
    ctx.moveTo((last || p).x, (last || p).y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    last = p;
    if (++strokes % 4 === 0) checkThreshold();
  };

  const checkThreshold = () => {
    if (!triggered && clearedShare() >= 0.35) {
      triggered = true;
      onThreshold();
    }
  };

  const toPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const pt = e.touches ? e.touches[0] : e;
    return {
      x: (pt.clientX - rect.left) * (W / rect.width),
      y: (pt.clientY - rect.top) * (H / rect.height),
    };
  };

  const onDown = (e) => {
    e.preventDefault();
    isDown = true;
    if (!started) {
      started = true;
      onStart?.();
    }
    last = null;
    eraseTo(toPos(e));
  };
  const onUp   = ()  => {
    if (isDown) checkThreshold(); // catch a lift between sampled checks
    isDown = false;
    last = null;
  };
  const onMove = (e) => { if (!isDown) return; e.preventDefault(); eraseTo(toPos(e)); };

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
  const backBlocked     = useBackNavigationGuard();

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
  const [scratching,     setScratching]     = useState(false);

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
            const timeRemaining = Math.max(0, Math.round(REVEAL_DURATION - elapsed));
            setTimeLeft(timeRemaining);

            // ===== CRITICAL FIX: Check if already expired =====
            // If user returns after 5 minutes have passed, show expired immediately
            if (timeRemaining === 0) {
              console.log("[Participation] Already expired - showing expired state");
              // The expired state will be shown by the countdown UI since timeLeft is 0
            }
          } else {
            // First time revealing - set full duration
            setTimeLeft(REVEAL_DURATION);
          }
        }

        const cJson = await cRes.json();

        // Filter coupons by selected range
        let filteredCoupons = [];
        if (cJson.success && cJson.data?.coupons?.length > 0) {
          const selectedRangeId = pJson.data?.billingRange?._id;
          console.error("[COUPONS PAGE] Selected range ID:", selectedRangeId);
          console.error("[COUPONS PAGE] Total coupons from API:", cJson.data.coupons.length);

          filteredCoupons = cJson.data.coupons.filter(coupon => {
            const couponRangeId = coupon.rangeId;
            const matches = String(couponRangeId) === String(selectedRangeId);
            console.error(`[COUPONS PAGE FILTER] Coupon ${coupon.id}: "${couponRangeId}" === "${selectedRangeId}" => ${matches ? "✅ MATCH" : "❌ SKIP"}`);
            return matches;
          });

          console.error("[COUPONS PAGE] Filtered coupons:", filteredCoupons.length);
        }

        setCoupons(filteredCoupons);
      } catch (_) {
        setError("Failed to load. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [participationId, campaignId]);

  // ===== CRITICAL: Show expired screen when timer reaches 0 =====
  useEffect(() => {
    if (timeLeft === 0 && phase === "revealed") {
      console.log("[Timer] Session expired - showing expired screen");
      // Optionally add visual feedback when timer expires
    }
  }, [timeLeft, phase]);

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
      const rounded = Math.round(remaining);
      setTimeLeft(rounded);
      if (rounded === 0) {
        clearInterval(iv);
        console.log("[Timer] Countdown complete - timer is now 0");
      }
    }, 100); // Faster updates for more responsive UI
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
      const res = await fetch(`/api/customer/participate/${participationId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scratchCardId: participationRef.current?.scratchCardId }),
      });
      // The reveal above is optimistic. If the server says this session was
      // retired (the customer started a newer attempt in another tab), swap
      // the reward for the expired screen — otherwise the cashier would see
      // and honour a coupon that was never recorded as won.
      if (res.status === 410) setExpired(true);
    } catch (_) {}
  }, [participationId]);

  // ── Mount scratch canvas when phase = 'scratch' ──
  useEffect(() => {
    if (phase !== "scratch" || !canvasRef.current) return;
    cleanupRef.current?.();
    cleanupRef.current = initScratchOverlay(canvasRef.current, handleThreshold, () => setScratching(true));
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

  // ── Back button pressed — block returning to the scan/participation form ──
  if (backBlocked) {
    return (
      <div className={`${styles.page} ${styles.pageDark}`}>
        <div className={styles.centeredState}>
          <div className={styles.expiredIcon}>
            <SessionExpiredIcon size={64} color="#ffc107" cutout="#0d0b13" />
          </div>
          <h2 className={styles.expiredTitle}>Session Expired</h2>
          <p className={styles.expiredDesc}>
            Your session has expired. Please scan the QR code again to continue.
          </p>
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
        {/* Fits one screen: the grid takes whatever height is left and the
            cards shrink with it, so every coupon is visible without scrolling. */}
        <div className={`${styles.body} ${styles.bodyFit}`}>
          <div className={styles.titleBlock}>
            <h1 className={styles.pageTitle}>Pick your lucky coupon</h1>
            <p className={styles.pageSubtitle}>Tap one to scratch — <em>only one</em></p>
          </div>

          {coupons.length === 0 ? (
            <p className={styles.countHint}>
              No coupons available for this range. Please contact the store.
            </p>
          ) : (
            <>
              <div className={styles.gridWrap}>
                <div
                  className={styles.grid}
                  style={{ "--rows": Math.ceil(coupons.length / 2) }}
                >
                  {coupons.map((coupon, index) => (
                    <button
                      key={coupon.id || index}
                      type="button"
                      className={styles.card}
                      style={{ "--i": index }}
                      onClick={() => {
                        setSelectedCoupon(coupon);
                        setPhase("scratch");
                      }}
                      aria-label={`Select coupon ${index + 1} of ${coupons.length}`}
                    >
                      <span className={styles.cardShine} aria-hidden="true" />
                      <span className={styles.cardMain}>
                        <span className={styles.giftCircle}><GiftSvg /></span>
                      </span>
                      <span className={styles.cardStrip}>Tap to scratch</span>
                      <span className={`${styles.notch} ${styles.notchLeft}`} aria-hidden="true" />
                      <span className={`${styles.notch} ${styles.notchRight}`} aria-hidden="true" />
                    </button>
                  ))}
                </div>

                {/* <p className={styles.countHint}>
                  <span className={styles.countPill}>🎁 {coupons.length} mystery coupons · 1 is yours</span>
                </p> */}
              </div>
            </>
          )}
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
        <div className={`${styles.body} ${styles.bodyFit}`}>
          <div className={styles.scratchBlock}>
            <div className={styles.titleBlock}>
              <h1 className={`${styles.pageTitle} ${styles.pageTitleLight}`}>Scratch to reveal your reward!</h1>
              <p className={styles.pageSubtitleLight}>Rub the card — something good is underneath</p>
            </div>

            <div className={styles.scratchStage}>
              <div className={styles.scratchCardWrap}>
                <div className={styles.scratchRevealBg}>
                  <span className={styles.wonPill}>You Won!</span>
                  {reward?.image ? (
                    <img src={reward.image} alt="Gift reward" className={styles.scratchRevealGiftImg} />
                  ) : (
                    <>
                      <div className={styles.scratchRevealGiftCircle}>
                        <RevealGiftSvg />
                      </div>
                      <div className={styles.scratchRevealValue}>{rewardDisplay}</div>
                    </>
                  )}
                  {reward?.description && (
                    <div className={styles.scratchRevealDesc}>{reward.description}</div>
                  )}
                </div>
                <canvas
                  ref={canvasRef}
                  width={SCRATCH_W * SCRATCH_SCALE}
                  height={SCRATCH_H * SCRATCH_SCALE}
                  className={styles.scratchCanvas}
                  aria-label="Scratch card — rub to reveal your reward"
                />
              </div>

              <p className={`${styles.scratchHint} ${scratching ? styles.scratchHintDone : ""}`}>
                <span className={styles.scratchHintIcon} aria-hidden="true">👆</span>
                Use your finger to scratch
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // REVEALED phase — reward ticket + 5-min countdown
  // ════════════════════════════════════════════
  const isExpiring = timeLeft <= 60 && timeLeft > 0;
  const isExpired  = timeLeft === 0;
  const minutesLeft = Math.ceil(timeLeft / 60);

  return (
    <div className={`${styles.page} ${styles.pageDark}`}>
      {storeHeader}
      {!isExpired && <div className={`${styles.body} ${styles.revealBody}`}>
        <div className={styles.celebBlock}>
          <div className={styles.celebEmoji} aria-hidden="true">🎉</div>
          <h1 className={styles.celebTitle}>You Won!</h1>
          <p className={styles.celebSub}>Here is your reward</p>
        </div>

        {/* Reward ticket — prize on top, details on the tear-off stub. */}
        <div className={`${styles.ticket} ${animReady ? styles.rewardCardIn : ""}`}>
          <div className={styles.ticketTop}>
            <span className={styles.ticketShine} aria-hidden="true" />
            {reward?.image ? (
              <img src={reward.image} alt="Gift reward" className={styles.rewardGiftImg} />
            ) : (
              <>
                <div className={styles.rewardGiftCircle}>
                  <RewardGiftSvg />
                </div>
                <div className={styles.rewardValue}>{rewardDisplay}</div>
              </>
            )}
          </div>
          <div className={styles.ticketStub}>
            {reward?.description && (
              <div className={styles.rewardDesc}>{reward.description}</div>
            )}
            {participation?.billingRange ? (
              <span className={styles.rangeChip}>
                Bill ₹{participation.billingRange.min?.toLocaleString("en-IN")} – ₹{participation.billingRange.max?.toLocaleString("en-IN")}
              </span>
            ) : (
              !reward?.description && <span className={styles.rangeChip}>{storeName}</span>
            )}
          </div>
        </div>

        {/* 5-minute countdown */}
        <div className={`${styles.countdown} ${isExpiring ? styles.countdownWarn : ""}`}>
          <div className={styles.countdownRow}>
            <div>
              <div className={styles.countdownLabel}>Show at the counter within</div>
              <div className={styles.countdownSub}>
                {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""} left to redeem
              </div>
            </div>
            <div className={`${styles.countdownTime} ${isExpiring ? styles.countdownTimeWarn : ""}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className={styles.countdownBar} aria-hidden="true">
            <span style={{ width: `${(timeLeft / REVEAL_DURATION) * 100}%` }} />
          </div>
        </div>

        <p className={styles.claimHint}>Present this screen at the store counter to claim</p>
      </div>}
      {isExpired && (
        <div className={styles.body}>
          <div className={styles.expiredBlock}>
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
      )}
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
