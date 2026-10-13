/**
 * hullam_animation.js - Generative Wave Animation Engine
 * Inspired by harmonic spline ribbons and CorelDRAW vector blends
 * for ÁA Pixel Stúdió (aapixelstudio.com)
 */

/**
 * Global Configuration Constants for Hullam Wave Animation
 * All parameters can be tuned here or overridden when instantiating HullamWaveAnimation.
 */
export const HULLAM_CONFIG = {
  // Geometry & Ribbons
  lineCountDesktop: 10,
  lineCountMobile: 2,
  lineWidthDesktop: 1.2,
  lineWidthMobile: 1.2,
  opacity: 1.85,
  stepsDesktop: 200,
  stepsMobile: 80,

  // Base Animation Physics
  speed: 0.0018,
  amplitude: 1.0,

  // Scroll Warp Parameters (Tunable scroll-reactive dynamics)
  warp: 0.5, // Master tunable scroll-warp intensity (0 = disabled, 1.0 = standard organic, >1 = pronounced)
  warpTwist: 0.8, // Ribbon twisting strength between boundary curves during scroll
  warpAmplitude: 0.35, // Amplitude breathing ratio modulated by scroll
  warpVelocity: 0.25, // Dynamic impulse from scrolling momentum
  warpFrequency: 0.0016, // Spatial frequency along scroll progress

  // Mouse Interactivity
  interactive: true,
  mouseInfluence: 0.2,
  mouseRadiusDesktop: 360,
  mouseRadiusMobile: 180,
  mouseForce: 35,
};

// Expose on window for easy in-browser console tuning
if (typeof window !== "undefined") {
  window.HULLAM_CONFIG = HULLAM_CONFIG;
}

export class HullamWaveAnimation {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Track user-specified overrides vs config defaults
    this.userOptions = { ...options };

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    this.options = {
      lineCount:
        options.lineCount ??
        (isMobile
          ? HULLAM_CONFIG.lineCountMobile
          : HULLAM_CONFIG.lineCountDesktop),
      lineWidth:
        options.lineWidth ??
        (isMobile
          ? HULLAM_CONFIG.lineWidthMobile
          : HULLAM_CONFIG.lineWidthDesktop),
      opacity: options.opacity ?? HULLAM_CONFIG.opacity,
      speed: options.speed ?? HULLAM_CONFIG.speed,
      amplitude: options.amplitude ?? HULLAM_CONFIG.amplitude,
      interactive: options.interactive ?? HULLAM_CONFIG.interactive,
      mouseInfluence: options.mouseInfluence ?? HULLAM_CONFIG.mouseInfluence,

      // Tunable scroll warp parameters
      warp: options.warp ?? HULLAM_CONFIG.warp,
      warpTwist: options.warpTwist ?? HULLAM_CONFIG.warpTwist,
      warpAmplitude: options.warpAmplitude ?? HULLAM_CONFIG.warpAmplitude,
      warpVelocity: options.warpVelocity ?? HULLAM_CONFIG.warpVelocity,
      warpFrequency: options.warpFrequency ?? HULLAM_CONFIG.warpFrequency,

      ...options,
    };

    this.time = 0;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.animationFrameId = null;

    // Mouse tracking with smooth spring interpolation
    this.mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      active: false,
    };
    this.scroll = { y: 0, targetY: 0, velocity: 0 };

    this.dpr =
      typeof window !== "undefined"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1;
    this.width = 0;
    this.height = 0;

    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.render = this.render.bind(this);

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener("resize", this.handleResize);

    if (this.options.interactive) {
      window.addEventListener("mousemove", this.handleMouseMove, {
        passive: true,
      });
      window.addEventListener("touchmove", this.handleTouchMove, {
        passive: true,
      });
      window.addEventListener("mouseleave", this.handleMouseLeave);
      window.addEventListener("scroll", this.handleScroll, { passive: true });
    }

    this.start();
  }

  handleResize() {
    const rect = this.canvas.parentElement
      ? this.canvas.parentElement.getBoundingClientRect()
      : this.canvas.getBoundingClientRect();

    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    const isMobile = this.width < 768;
    if (this.userOptions.lineCount === undefined) {
      this.options.lineCount = isMobile
        ? HULLAM_CONFIG.lineCountMobile
        : HULLAM_CONFIG.lineCountDesktop;
    }
    if (this.userOptions.lineWidth === undefined) {
      this.options.lineWidth = isMobile
        ? HULLAM_CONFIG.lineWidthMobile
        : HULLAM_CONFIG.lineWidthDesktop;
    }

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.targetX = e.clientX - rect.left;
    this.mouse.targetY = e.clientY - rect.top;
    this.mouse.active = true;
  }

  handleTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.targetX = e.touches[0].clientX - rect.left;
      this.mouse.targetY = e.touches[0].clientY - rect.top;
      this.mouse.active = true;
    }
  }

  handleMouseLeave() {
    this.mouse.active = false;
    this.mouse.targetX = -1000;
    this.mouse.targetY = -1000;
  }

  handleScroll() {
    const currentY = window.scrollY || window.pageYOffset;
    this.scroll.velocity = (currentY - this.scroll.targetY) * 0.05;
    this.scroll.targetY = currentY;
  }

  // Runtime tunable helpers
  setWarp(value) {
    this.options.warp = Number(value);
  }

  setWarpTwist(value) {
    this.options.warpTwist = Number(value);
  }

  setWarpAmplitude(value) {
    this.options.warpAmplitude = Number(value);
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.render);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("mouseleave", this.handleMouseLeave);
    window.removeEventListener("scroll", this.handleScroll);
  }

  // Smooth cubic Catmull-Rom spline evaluator
  getSplinePoint(pts, t) {
    const n = pts.length - 1;
    const p = Math.max(0, Math.min(n, t * n));
    const i1 = Math.floor(p);
    const i0 = Math.max(0, i1 - 1);
    const i2 = Math.min(n, i1 + 1);
    const i3 = Math.min(n, i1 + 2);
    const u = p - i1;

    const u2 = u * u;
    const u3 = u2 * u;

    const x =
      0.5 *
      (2 * pts[i1].x +
        (-pts[i0].x + pts[i2].x) * u +
        (2 * pts[i0].x - 5 * pts[i1].x + 4 * pts[i2].x - pts[i3].x) * u2 +
        (-pts[i0].x + 3 * pts[i1].x - 3 * pts[i2].x + pts[i3].x) * u3);

    const y =
      0.5 *
      (2 * pts[i1].y +
        (-pts[i0].y + pts[i2].y) * u +
        (2 * pts[i0].y - 5 * pts[i1].y + 4 * pts[i2].y - pts[i3].y) * u2 +
        (-pts[i0].y + 3 * pts[i1].y - 3 * pts[i2].y + pts[i3].y) * u3);

    return { x, y };
  }

  // Get color along the brand gradient: Pink -> Coral -> Gold -> Yellow
  getColor(alpha, curveFraction, time) {
    // Dynamic palette shifting subtly over time
    const tShift = Math.sin(time * 0.5) * 0.1;
    const p = Math.max(0, Math.min(1, alpha + tShift));

    // Brand color stops:
    // 0.0: Vivid Magenta #e5127d rgb(229, 18, 125)
    // 0.35: Rose Pink rgb(240, 50, 95)
    // 0.65: Coral Orange rgb(255, 110, 60)
    // 1.0: Golden Sun Yellow rgb(255, 200, 30)
    let r, g, b;
    if (p < 0.35) {
      const k = p / 0.35;
      r = Math.round(229 + (240 - 229) * k);
      g = Math.round(18 + (50 - 18) * k);
      b = Math.round(125 + (95 - 125) * k);
    } else if (p < 0.65) {
      const k = (p - 0.35) / 0.3;
      r = Math.round(240 + (255 - 240) * k);
      g = Math.round(50 + (110 - 50) * k);
      b = Math.round(95 + (60 - 95) * k);
    } else {
      const k = (p - 0.65) / 0.35;
      r = 255;
      g = Math.round(110 + (200 - 110) * k);
      b = Math.round(60 + (30 - 60) * k);
    }

    // Alpha fade at ends of the curve and edges of the bundle
    const bundleEdgeFade = Math.sin(alpha * Math.PI); // 0 at edges, 1 in center
    const curveEndFade = Math.sin(curveFraction * Math.PI); // fades gracefully at top and bottom
    const opacity = (
      this.options.opacity *
      (0.35 + 0.65 * bundleEdgeFade) *
      (0.4 + 0.6 * curveEndFade)
    ).toFixed(3);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  render(now) {
    if (!this.isRunning) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.time += dt * this.options.speed * 60;

    // Smooth mouse lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    // Smooth scroll lerp & velocity decay
    this.scroll.y += (this.scroll.targetY - this.scroll.y) * 0.06;
    this.scroll.velocity *= 0.92;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const isMobile = w < 768;
    const t = this.time;
    const baseAmp = this.options.amplitude;

    // --- Tunable Scroll Warp Dynamics ---
    const warp = this.options.warp ?? HULLAM_CONFIG.warp;
    const warpTwist = this.options.warpTwist ?? HULLAM_CONFIG.warpTwist;
    const warpAmp = this.options.warpAmplitude ?? HULLAM_CONFIG.warpAmplitude;
    const warpVel = this.options.warpVelocity ?? HULLAM_CONFIG.warpVelocity;
    const warpFreq = this.options.warpFrequency ?? HULLAM_CONFIG.warpFrequency;

    const scrollY = this.scroll.y;
    const scrollAngle = scrollY * warpFreq;
    const scrollOffset = (scrollY * 0.0003) % (Math.PI * 2);

    // 1. Amplitude modulation via scroll & scroll velocity momentum
    const velocityImpulse =
      Math.min(Math.abs(this.scroll.velocity || 0) * 0.04, 0.4) * warpVel;
    const scrollAmpFactor =
      1.0 + (Math.sin(scrollAngle) * warpAmp + velocityImpulse) * warp;
    const effectiveAmp = baseAmp * scrollAmpFactor;

    // 2. Twisting modulation between boundary curves
    const twistRad = scrollAngle * 1.8 * warpTwist * warp;
    const twistPhase1 = t * 0.7 + twistRad * 0.4;
    const twistPhase2 = t * 0.5 - twistRad * 0.6;
    const twistXShift = Math.sin(twistRad) * 30 * warp;
    const twistYShift = Math.cos(twistRad * 0.8) * 20 * warp;

    // Primary control points for the dual-guide blend ribbons
    // Curve 1 (magenta boundary)
    const c1 = isMobile
      ? [
          { x: w * 0.92, y: -40 + Math.sin(twistPhase1 * 1.1) * 20 },
          {
            x:
              w * 0.7 +
              Math.cos(twistPhase1 * 0.8) * 25 * effectiveAmp +
              twistXShift * 0.4,
            y: h * 0.18 + Math.sin(twistPhase1 * 0.9) * 25 + twistYShift * 0.3,
          },
          {
            x:
              w * 0.15 +
              Math.sin(twistPhase1 * 1.2) * 30 * effectiveAmp +
              twistXShift,
            y: h * 0.38 + Math.cos(twistPhase1 * 0.7) * 20 - twistYShift * 0.4,
          },
          {
            x:
              w * 0.35 +
              Math.cos(twistPhase1 * 0.9) * 25 * effectiveAmp -
              twistXShift * 0.8,
            y: h * 0.58 + Math.sin(twistPhase1 * 1.1) * 25 + twistYShift * 0.5,
          },
          {
            x:
              w * 0.85 +
              Math.sin(twistPhase1 * 0.7) * 30 * effectiveAmp +
              twistXShift * 0.6,
            y: h * 0.78 + Math.cos(twistPhase1 * 0.8) * 30 - twistYShift * 0.3,
          },
          {
            x: w * 0.5 + Math.cos(twistPhase1 * 1.2) * 20 * effectiveAmp,
            y: h * 1.05,
          },
        ]
      : [
          { x: w * 0.96, y: -60 + Math.sin(twistPhase1) * 20 },
          {
            x:
              w * 0.78 +
              Math.cos(twistPhase1 * 0.86) * 35 * effectiveAmp +
              twistXShift * 0.4,
            y: h * 0.14 + Math.sin(twistPhase1 * 0.71) * 25 + twistYShift * 0.3,
          },
          {
            x:
              w * 0.18 +
              Math.sin(twistPhase1 * 1.14) * 45 * effectiveAmp +
              twistXShift,
            y: h * 0.34 + Math.cos(twistPhase1) * 30 - twistYShift * 0.5,
          },
          {
            x:
              w * 0.32 +
              Math.cos(twistPhase1 * 0.71) * 40 * effectiveAmp -
              twistXShift * 0.8,
            y: h * 0.55 + Math.sin(twistPhase1 * 0.86) * 35 + twistYShift * 0.6,
          },
          {
            x:
              w * 0.86 +
              Math.sin(twistPhase1 * 1.28) * 40 * effectiveAmp +
              twistXShift * 0.7,
            y: h * 0.75 + Math.cos(twistPhase1 * 1.14) * 35 - twistYShift * 0.4,
          },
          {
            x: w * 0.58 + Math.cos(twistPhase1) * 30 * effectiveAmp,
            y: h * 1.05,
          },
        ];

    // Curve 2 (gold/yellow boundary, slightly shifted and twisted)
    const c2 = isMobile
      ? [
          { x: w * 0.8, y: -50 + Math.cos(twistPhase2 * 1.1) * 20 },
          {
            x:
              w * 0.88 +
              Math.sin(twistPhase2 * 1.3) * 20 * effectiveAmp -
              twistXShift * 0.5,
            y: h * 0.22 + Math.cos(twistPhase2 * 1.4) * 20 - twistYShift * 0.3,
          },
          {
            x:
              w * 0.3 +
              Math.cos(twistPhase2 * 0.9) * 25 * effectiveAmp -
              twistXShift * 0.8,
            y: h * 0.44 + Math.sin(twistPhase2 * 1.1) * 25 + twistYShift * 0.6,
          },
          {
            x:
              w * 0.6 +
              Math.sin(twistPhase2 * 1.4) * 30 * effectiveAmp +
              twistXShift * 0.7,
            y: h * 0.64 + Math.cos(twistPhase2 * 1.2) * 25 - twistYShift * 0.4,
          },
          {
            x:
              w * 0.55 +
              Math.cos(twistPhase2 * 1.1) * 25 * effectiveAmp -
              twistXShift * 0.6,
            y: h * 0.84 + Math.sin(twistPhase2 * 0.9) * 25 + twistYShift * 0.3,
          },
          {
            x: w * 0.85 + Math.sin(twistPhase2 * 1.2) * 20 * effectiveAmp,
            y: h * 1.05,
          },
        ]
      : [
          { x: w * 0.84, y: -70 + Math.cos(twistPhase2) * 25 },
          {
            x:
              w * 0.94 +
              Math.sin(twistPhase2 * 1.4) * 30 * effectiveAmp -
              twistXShift * 0.5,
            y: h * 0.2 + Math.cos(twistPhase2 * 1.2) * 30 - twistYShift * 0.4,
          },
          {
            x:
              w * 0.35 +
              Math.cos(twistPhase2 * 1.8) * 40 * effectiveAmp -
              twistXShift * 0.9,
            y: h * 0.44 + Math.sin(twistPhase2 * 1.6) * 30 + twistYShift * 0.7,
          },
          {
            x:
              w * 0.7 +
              Math.sin(twistPhase2 * 1.2) * 45 * effectiveAmp +
              twistXShift * 0.8,
            y: h * 0.65 + Math.cos(twistPhase2 * 0.8) * 35 - twistYShift * 0.5,
          },
          {
            x:
              w * 0.48 +
              Math.cos(twistPhase2 * 1.6) * 35 * effectiveAmp -
              twistXShift * 0.6,
            y: h * 0.86 + Math.sin(twistPhase2 * 1.4) * 30 + twistYShift * 0.4,
          },
          {
            x: w * 0.88 + Math.sin(twistPhase2) * 30 * effectiveAmp,
            y: h * 1.05,
          },
        ];

    const N = this.options.lineCount;
    const steps = isMobile
      ? HULLAM_CONFIG.stepsMobile
      : HULLAM_CONFIG.stepsDesktop;
    const mouseActive =
      this.mouse.active && this.mouse.x >= 0 && this.mouse.y >= 0;
    const mouseRadius = isMobile
      ? HULLAM_CONFIG.mouseRadiusMobile
      : HULLAM_CONFIG.mouseRadiusDesktop;
    const mouseForce = HULLAM_CONFIG.mouseForce * this.options.mouseInfluence;

    ctx.lineWidth = this.options.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw all interpolated blend lines
    for (let i = 0; i < N; i++) {
      const alpha = i / (N - 1); // 0 to 1 across the bundle

      // Secondary harmonic micro-wave for organic flow
      const linePhase = i * 0.12 + scrollOffset + twistRad * 0.2;
      const microAmp = Math.sin(t * 1.2 + linePhase) * 6 * scrollAmpFactor;

      ctx.beginPath();

      for (let s = 0; s <= steps; s++) {
        const u = s / steps; // 0 to 1 along the curve
        const p1 = this.getSplinePoint(c1, u);
        const p2 = this.getSplinePoint(c2, u);

        // Ribbon twist along its length modulated by scrolling
        const localTwist = Math.sin(u * Math.PI + twistRad) * 0.12 * warp;
        const warpedAlpha = Math.max(0, Math.min(1, alpha + localTwist));

        // Interpolation between boundary curves with scroll-twist
        let px = (1 - warpedAlpha) * p1.x + warpedAlpha * p2.x;
        let py = (1 - warpedAlpha) * p1.y + warpedAlpha * p2.y;

        // Apply harmonic ripple
        const harmonic = Math.sin(u * 14 + linePhase + t * 0.8) * microAmp;
        px += harmonic * 0.8;
        py += harmonic * 0.4;

        // Interactive mouse deflection
        if (mouseActive) {
          const dx = px - this.mouse.x;
          const dy = py - this.mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouseRadius && dist > 1) {
            const factor = Math.cos((dist / mouseRadius) * (Math.PI / 2));
            const push = factor * mouseForce;
            px += (dx / dist) * push;
            py += (dy / dist) * push;
          }
        }

        if (s === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.strokeStyle = this.getColor(alpha, 0.5, this.time);
      ctx.stroke();
    }

    this.animationFrameId = requestAnimationFrame(this.render);
  }
}
