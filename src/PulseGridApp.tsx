import { useEffect, useMemo, useRef, useState } from 'react'

type Theme = 'light' | 'dark'

function BezelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bezel-outer ${className}`}>
      <div className="bezel-inner">
        {children}
      </div>
    </div>
  )
}

function PillButton({
  children,
  primary = false,
  onClick,
  href,
}: {
  children: React.ReactNode
  primary?: boolean
  onClick?: () => void
  href?: string
}) {
  const El = href ? 'a' : 'button'
  const isExternal = href?.startsWith('http') || href?.startsWith('#')

  const commonProps = {
    className: `btn-island ${primary ? 'btn-island-primary' : ''} group`,
    onClick,
    ...(href ? { href } : {}),
    ...(isExternal && href ? { target: href.startsWith('#') ? undefined : '_blank', rel: 'noopener noreferrer' } : {}),
  }

  return (
    <El {...commonProps}>
      <span>{children}</span>
      <span className="btn-icon-wrapper">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7 17L17 7M17 7H10M17 7V14"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </El>
  )
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  return reduced
}

// Scroll Intersection Reveal Hook
function useIntersectionReveal() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      return
    }
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced])

  return { ref, visible: reduced || visible }
}

export default function PulseGridApp() {
  usePrefersReducedMotion()
  const [theme, setTheme] = useState<Theme>('dark')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'react' | 'css'>('react')

  // Physics Spring Sandbox States
  const [stiffness, setStiffness] = useState(120) // Physical K (matches initial 'wobbly' preset)
  const [damping, setDamping] = useState(7) // Physical C (matches initial 'wobbly' preset)
  const [sandboxPreset, setSandboxPreset] = useState<'snappy' | 'wobbly' | 'cinematic'>('wobbly')



  // Cursor Tracking Orb position
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const gridContainerRef = useRef<HTMLDivElement | null>(null)

  // Theme effect
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  const handlePresetSelect = (preset: 'snappy' | 'wobbly' | 'cinematic') => {
    setSandboxPreset(preset)
    if (preset === 'snappy') {
      setStiffness(240)
      setDamping(18)
    } else if (preset === 'wobbly') {
      setStiffness(120)
      setDamping(7)
    } else if (preset === 'cinematic') {
      setStiffness(60)
      setDamping(14)
    }
  }

  // Toast auto-dismissal
  useEffect(() => {
    if (!toast.open) return
    const t = setTimeout(() => setToast({ open: false, message: '' }), 3000)
    return () => clearTimeout(t)
  }, [toast.open])

  // Custom live spring engine logic (Canvas-based)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mousePos = useRef({ x: 150, y: 100 })
  const springPos = useRef({ x: 150, y: 100 })
  const springVelocity = useRef({ x: 0, y: 0 })

  // Grid of nodes for physical stretch lattice
  const latticePoints = useRef(
    Array.from({ length: 9 }, (_, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      return {
        homeX: 50 + col * 100,
        homeY: 40 + row * 60,
        x: 50 + col * 100,
        y: 40 + row * 60,
        vx: 0,
        vy: 0,
      }
    })
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const tick = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 1. Calculate main physical spring target
      const mass = 1
      const forceX = (mousePos.current.x - springPos.current.x) * (stiffness / 100)
      const forceY = (mousePos.current.y - springPos.current.y) * (stiffness / 100)
      const accelX = forceX / mass
      const accelY = forceY / mass

      // Apply velocity and drag
      const dampingFactor = 1 - damping / 100
      springVelocity.current.x = (springVelocity.current.x + accelX) * dampingFactor
      springVelocity.current.y = (springVelocity.current.y + accelY) * dampingFactor
      springPos.current.x += springVelocity.current.x
      springPos.current.y += springVelocity.current.y

      // 2. Draw spring connection line
      ctx.beginPath()
      ctx.moveTo(mousePos.current.x, mousePos.current.y)
      ctx.lineTo(springPos.current.x, springPos.current.y)
      ctx.strokeStyle = theme === 'light' ? 'rgba(109, 40, 217, 0.15)' : 'rgba(139, 92, 246, 0.25)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // 3. Draw mouse target cursor anchor
      ctx.beginPath()
      ctx.arc(mousePos.current.x, mousePos.current.y, 6, 0, Math.PI * 2)
      ctx.fillStyle = theme === 'light' ? '#10b981' : '#10b981'
      ctx.fill()

      // 4. Update and draw the grid lattice points with spring physics
      latticePoints.current.forEach((point) => {
        // Points are attracted to their home positions, but get pulled by the main spring anchor
        const dxToSpring = springPos.current.x - point.x
        const dyToSpring = springPos.current.y - point.y
        const dist = Math.sqrt(dxToSpring * dxToSpring + dyToSpring * dyToSpring)

        // Pull force from main circle based on closeness
        const pull = Math.max(0, 120 - dist) * 0.008

        const pullX = dxToSpring * pull
        const pullY = dyToSpring * pull

        // Home attraction spring
        const homeForceX = (point.homeX - point.x) * 0.15
        const homeForceY = (point.homeY - point.y) * 0.15

        point.vx = (point.vx + homeForceX + pullX) * 0.82
        point.vy = (point.vy + homeForceY + pullY) * 0.82
        point.x += point.vx
        point.y += point.vy

        // Draw connections
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = theme === 'light' ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.18)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
        ctx.lineTo(point.homeX, point.homeY)
        ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // 5. Draw main animated physical circle
      ctx.beginPath()
      ctx.arc(springPos.current.x, springPos.current.y, 18, 0, Math.PI * 2)
      ctx.fillStyle = theme === 'light' ? '#6d28d9' : '#8b5cf6'
      ctx.fill()
      ctx.shadowBlur = 15
      ctx.shadowColor = theme === 'light' ? 'rgba(109, 40, 217, 0.3)' : 'rgba(139, 92, 246, 0.5)'

      // Inner gloss ring
      ctx.beginPath()
      ctx.arc(springPos.current.x, springPos.current.y, 16, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.shadowBlur = 0 // Reset

      animationId = requestAnimationFrame(tick)
    }

    tick()

    return () => cancelAnimationFrame(animationId)
  }, [stiffness, damping, theme])

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleCanvasClick = () => {
    // Add an impulse burst
    springVelocity.current = {
      x: (Math.random() - 0.5) * 45,
      y: (Math.random() - 0.5) * 45,
    }
  }

  // Live Generated Code snippet
  const generatedCode = useMemo(() => {
    if (modalTab === 'react') {
      return `import React from 'react';
import { motion } from 'framer-motion';

// PulseGrid Spring Node
export function PhysicalNode({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{
        scale: active ? 1.05 : 1,
        y: active ? -4 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: ${stiffness},
        damping: ${damping},
        mass: 1
      }}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: '#8b5cf6',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
      }}
    />
  );
}`
    } else {
      return `/* Easing Physics transition representation */
.physics-spring {
  transition: transform 700ms cubic-bezier(${((stiffness / 300) * 0.4).toFixed(2)}, 1.15, ${((damping / 40) * 0.8).toFixed(2)}, 1);
  will-change: transform;
}

.physics-spring:active {
  transform: scale(0.97);
}`
    }
  }, [stiffness, damping, modalTab])

  // Custom scroll interpolation triggers
  const { ref: heroRef, visible: heroVisible } = useIntersectionReveal()
  const { ref: sandboxRef, visible: sandboxVisible } = useIntersectionReveal()
  const { ref: bentoRef, visible: bentoVisible } = useIntersectionReveal()


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setToast({ open: true, message: 'Code copied to clipboard!' })
  }



  return (
    <div style={{ position: 'relative' }}>
      {/* Background Orbs */}
      <div className="orb-container">
        <div className="orb-purple" />
        <div className="orb-emerald" />
      </div>

      {/* Tactile grain noise */}
      <div className="noise" />

      {/* Detached Glass Floating Navigation Island */}
      <nav className="nav-island" aria-label="Enterprise Navigation">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: 'var(--accent-purple)',
              boxShadow: '0 0 10px var(--accent-purple)',
            }}
          />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            PulseGrid
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 99,
              background: 'var(--accent-emerald-glow)',
              color: 'var(--accent-emerald)',
              border: '1px solid var(--border-color)',
            }}
          >
            ENT
          </span>
        </div>

        <div className="nav-links">
          <a href="#playground" className="nav-link">
            Spring Sandbox
          </a>
          <a href="#bento" className="nav-link">
            Visual Spec
          </a>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Theme mode toggle */}
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="btn-island"
            style={{ padding: '8px 12px', minWidth: 44 }}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? 'Paper' : 'Ink'}
          </button>

          <PillButton primary onClick={() => setModalOpen(true)}>
            Get Spec
          </PillButton>

          {/* Morphing Hamburger */}
          <button
            type="button"
            className="hamburger"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((m) => !m)}
            aria-label="Toggle navigation menu"
          >
            <span
              className="hamburger-line"
              style={{
                transform: mobileOpen ? 'translateY(6px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="hamburger-line"
              style={{
                opacity: mobileOpen ? 0 : 1,
              }}
            />
            <span
              className="hamburger-line"
              style={{
                transform: mobileOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>
      </nav>

      {/* Screen-filling mobile overlay */}
      <div className="menu-overlay" data-open={mobileOpen ? 'true' : 'false'}>
        <a
          href="#playground"
          className="h2"
          style={{ textDecoration: 'none', transitionDelay: '50ms' }}
          onClick={() => {
            setMobileOpen(false)
            const el = document.getElementById('playground')
            el?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          Spring Sandbox
        </a>
        <a
          href="#bento"
          className="h2"
          style={{ textDecoration: 'none', transitionDelay: '100ms' }}
          onClick={() => {
            setMobileOpen(false)
            const el = document.getElementById('bento')
            el?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          Visual Spec
        </a>

      </div>

      <main style={{ marginTop: 120 }}>
        {/* HERO SECTION */}
        <section
          className="section"
          ref={heroRef}
          data-visible={heroVisible ? 'true' : 'false'}
          style={{ paddingBottom: 60 }}
        >
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="eyebrow-badge">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent-purple)',
                  boxShadow: '0 0 8px var(--accent-purple)',
                }}
              />
              PULSEGRID ENTERPRISE · V1.4
            </div>

            <h1 className="h1" style={{ maxWidth: '900px', margin: '0 auto 24px', letterSpacing: '-0.04em' }}>
              Unify Design Intent &amp; Engineering Speed.
            </h1>

            <p
              style={{
                fontSize: 'clamp(17px, 2vw, 20px)',
                lineHeight: 1.6,
                maxWidth: '650px',
                margin: '0 auto 40px',
                color: 'var(--text-secondary)',
              }}
            >
              The spatial interaction platform for world-class digital experiences. Test spring parameters, inspect tactile physics, and export pristine, optimized frontend code.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
                flexWrap: 'wrap',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <PillButton
                primary
                onClick={() => {
                  const el = document.getElementById('playground')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Launch Sandbox
              </PillButton>
              <PillButton onClick={() => setModalOpen(true)}>Inspect Code</PillButton>
            </div>
          </div>
        </section>

        {/* INTERACTIVE SPRING SANDBOX */}
        <section
          id="playground"
          className="section"
          ref={sandboxRef}
          data-visible={sandboxVisible ? 'true' : 'false'}
          style={{ paddingTop: 60, paddingBottom: 60 }}
        >
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 50 }}>
              <div className="eyebrow-badge">SPRING DYNAMICS PHYSICS</div>
              <h2 className="h2" style={{ marginBottom: 12 }}>
                Calibrate physical springs.
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                Drag your cursor inside the canvas below. Tweak **Stiffness** and **Damping** sliders to see real-world kinetic tension wobbly feedbacks.
              </p>
            </div>

            <div className="bento-grid">
              {/* Controls and Canvas */}
              <div className="bento-6">
                <BezelCard>
                  <div className="sandbox-controls">
                    <div className="control-field">
                      <label
                        className="label"
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}
                      >
                        <span>Stiffness (K)</span>
                        <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--accent-purple)' }}>
                          {stiffness}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="350"
                        value={stiffness}
                        onChange={(e) => setStiffness(Number(e.target.value))}
                        className="range-input"
                        aria-label="Stiffness (K)"
                      />
                    </div>
                    <div className="control-field">
                      <label
                        className="label"
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}
                      >
                        <span>Damping (C)</span>
                        <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--accent-emerald)' }}>{damping}</span>
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="40"
                        value={damping}
                        onChange={(e) => setDamping(Number(e.target.value))}
                        className="range-input"
                        aria-label="Damping (C)"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {(['snappy', 'wobbly', 'cinematic'] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        style={{
                          background: sandboxPreset === preset ? 'var(--accent-purple-glow)' : 'transparent',
                          color: sandboxPreset === preset ? 'var(--accent-purple)' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 99,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 200ms var(--ease-out)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Physics Canvas Enclosure */}
                  <div className="physics-canvas" onMouseMove={handleCanvasMouseMove} onClick={handleCanvasClick}>
                    <canvas ref={canvasRef} width="320" height="198" style={{ width: '100%', height: '100%' }} />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                      }}
                    >
                      Interactive Spring Grid. Click to launch force pulse.
                    </div>
                  </div>
                </BezelCard>
              </div>

              {/* Code Generator & Copy Spec */}
              <div className="bento-6">
                <BezelCard>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setModalTab('react')}
                        style={{
                          background: modalTab === 'react' ? 'var(--surface-color)' : 'transparent',
                          color: modalTab === 'react' ? 'var(--text-primary)' : 'var(--text-muted)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        React Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab('css')}
                        style={{
                          background: modalTab === 'css' ? 'var(--surface-color)' : 'transparent',
                          color: modalTab === 'css' ? 'var(--text-primary)' : 'var(--text-muted)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        CSS Transition
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedCode)}
                      style={{
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        transition: 'all 200ms var(--ease-out)',
                      }}
                    >
                      Copy Snippet
                    </button>
                  </div>

                  <div className="code-display" style={{ height: '240px' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{generatedCode}</pre>
                  </div>
                </BezelCard>
              </div>
            </div>
          </div>
        </section>

        {/* ASYMMETRICAL BENTO SHOWCASE */}
        <section
          id="bento"
          className="section"
          ref={bentoRef}
          data-visible={bentoVisible ? 'true' : 'false'}
          style={{ paddingTop: 60, paddingBottom: 60 }}
        >
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 50 }}>
              <div className="eyebrow-badge">PLATFORM SPECIFICATIONS</div>
              <h2 className="h2" style={{ marginBottom: 12 }}>
                Asymmetric Masonry Bento.
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                Double-Bezel hardware envelopes stacked in Z-axis and structural compartments. Hover tiles to check micro-interactions.
              </p>
            </div>

            <div className="bento-grid">
              {/* Card 1: Magnetic Click Physics */}
              <div className="bento-4">
                <BezelCard>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)' }}>MICRO-KINETICS</span>
                  <h3 className="h3" style={{ marginTop: 8, marginBottom: 12 }}>
                    Magnetic active press feedback.
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Hover this button and click to execute the precise `scale(0.97)` spring transition prescribed in Emil Kowalski's guidelines.
                  </p>
                  <PillButton primary onClick={() => setToast({ open: true, message: 'Spring recoil triggered successfully!' })}>
                    Trigger Recoil
                  </PillButton>
                </BezelCard>
              </div>

              {/* Card 2: Mouse tracking orb mesh */}
              <div className="bento-8">
                <BezelCard>
                  <div
                    ref={gridContainerRef}
                    onMouseMove={(e) => {
                      if (!gridContainerRef.current) return
                      const rect = gridContainerRef.current.getBoundingClientRect()
                      setCursorPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      })
                    }}
                    style={{
                      height: '100%',
                      minHeight: '200px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'none',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-emerald)' }}>SPATIAL FLUIDITY</span>
                      <h3 className="h3" style={{ marginTop: 8, marginBottom: 8 }}>
                        Vector mouse interpolation tracking.
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Hover this grid container. The background glowing mesh orbs dynamically follow your pointer with calculated drag inertia.
                      </p>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        left: cursorPos.x - 40,
                        top: cursorPos.y - 40,
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, var(--accent-purple-glow) 0%, rgba(139,92,246,0) 70%)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        pointerEvents: 'none',
                        transition: 'transform 100ms ease-out',
                      }}
                    />

                    <div style={{ fontSize: 11, fontFamily: 'var(--mono-font)', color: 'var(--text-muted)' }}>
                      Track coordinates: X: {cursorPos.x.toFixed(0)}, Y: {cursorPos.y.toFixed(0)}
                    </div>
                  </div>
                </BezelCard>
              </div>

              {/* Card 3: Screen reader diagnostics (UX Checklist compliance) */}
              <div className="bento-6">
                <BezelCard>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>ACCESSIBILITY MAPPING</span>
                  <h3 className="h3" style={{ marginTop: 8, marginBottom: 12 }}>
                    A11y diagnostics compliance.
                  </h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      { label: 'Color Contrast Ratio', val: '7.8:1 (AAA Pass)' },
                      { label: 'Prefers-Reduced-Motion API', val: 'Auto-detect active' },
                      { label: 'Aria Semantic Focus Rings', val: 'System-mapped' },
                    ].map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--border-color)',
                          paddingBottom: 6,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </BezelCard>
              </div>

              {/* Card 4: Platform assets specs */}
              <div className="bento-6">
                <BezelCard>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>SPATIAL SPEC</span>
                  <h3 className="h3" style={{ marginTop: 8, marginBottom: 12 }}>
                    Tension-driven layout dynamics.
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    PulseGrid orchestrates visual assets dynamically. Double-bezels establish standard geometric gutters of 24px and incremental 8dp spacing layers out of the box.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      Padding 28px
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      Breakpoint 900px
                    </span>
                  </div>
                </BezelCard>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ENTERPRISE FOOTER */}
      <footer className="section" style={{ borderTop: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
        <div className="container">
          <div className="bento-grid">
            <div className="bento-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--accent-purple)' }} />
                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>PulseGrid</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: '400px', marginBottom: 24 }}>
                Unifying spatial interaction and frontend execution on $150k+ agency-level craftsmanship standards. Designed by Vanguard UI Architects.
              </p>
            </div>

            <div className="bento-6" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <PillButton primary onClick={() => setModalOpen(true)}>
                  Export Spec
                </PillButton>
                <PillButton onClick={() => {
                  const el = document.getElementById('playground')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}>
                  Sandbox
                </PillButton>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                &copy; 2026 PulseGrid Enterprise. No cookies, no trackers.
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* CODE EXPORTER SPEC MODAL */}
      <div className="modal-overlay" data-open={modalOpen ? 'true' : 'false'} onClick={(e) => {
        if (e.target === e.currentTarget) setModalOpen(false)
      }}>
        <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Export Motion Spec">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className="h3">Export Motion Spec</h3>
            <button
              type="button"
              className="btn-island"
              style={{ minWidth: 44, padding: '8px 12px' }}
              onClick={() => setModalOpen(false)}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Fully optimized, hardware-accelerated code matching your current spring parameters (Stiffness: **{stiffness}**, Damping: **{damping}**).
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setModalTab('react')}
              style={{
                background: modalTab === 'react' ? 'var(--surface-color)' : 'transparent',
                color: modalTab === 'react' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                padding: '8px 16px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              React Code
            </button>
            <button
              type="button"
              onClick={() => setModalTab('css')}
              style={{
                background: modalTab === 'css' ? 'var(--surface-color)' : 'transparent',
                color: modalTab === 'css' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                padding: '8px 16px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              CSS Variables
            </button>
          </div>

          <div className="code-display" style={{ height: '220px', marginBottom: 24 }}>
            <pre style={{ margin: 0 }}>{generatedCode}</pre>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-island btn-island-primary"
              onClick={() => {
                copyToClipboard(generatedCode)
                setModalOpen(false)
              }}
            >
              Copy &amp; Dismiss
            </button>
            <button type="button" className="btn-island" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Tactile Toast Notification */}
      {toast.open && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%) scale(1)',
            zIndex: 9999,
            background: 'rgba(5, 5, 5, 0.85)',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(20px)',
            color: 'var(--text-primary)',
            padding: '12px 24px',
            borderRadius: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
            fontSize: 13,
            fontWeight: 700,
            animation: 'fadeIn 200ms var(--ease-out)',
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
