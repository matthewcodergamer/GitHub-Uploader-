import { Component, useEffect, useState } from 'react'

const opticsByVariant = {
  regular: {
    strength: 0.035,
    depth: 0.24,
    curvature: 0.08,
    dispersion: 0.012,
    bend: 0.18,
    bendWidth: 0.075,
    sheen: 0.16,
    sheenWidth: 0.025,
    sheenFalloff: 3.2,
    sheenAngle: -0.85,
    specular: 0.13,
    glow: 0.018,
    frost: 7,
    brightness: 0.015,
    splay: 0.01,
  },
  prominent: {
    strength: 0.05,
    depth: 0.28,
    curvature: 0.1,
    dispersion: 0.014,
    bend: 0.23,
    bendWidth: 0.08,
    sheen: 0.19,
    sheenWidth: 0.025,
    sheenFalloff: 3.2,
    sheenAngle: -0.85,
    specular: 0.15,
    glow: 0.02,
    frost: 6,
    brightness: 0.02,
    splay: 0.012,
  },
}

class GlassBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('[Crain] Liquid Glass fell back to CSS material:', error)
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

function GlassFallback({ children, className, variant, radius, style, ...props }) {
  return (
    <div
      className={`liquid-glass liquid-glass--${variant} liquid-glass--fallback ${className}`.trim()}
      style={{ borderRadius: radius, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export function LiquidGlass({
  children,
  className = '',
  variant = 'regular',
  radius = 20,
  style,
  ...props
}) {
  const [GlassComponent, setGlassComponent] = useState(null)
  const [glassFailed, setGlassFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    import('@samasante/liquid-glass')
      .then((module) => {
        if (!cancelled && module?.Glass) setGlassComponent(() => module.Glass)
      })
      .catch((error) => {
        console.warn('[Crain] Could not load Liquid Glass; using CSS fallback.', error)
        if (!cancelled) setGlassFailed(true)
      })

    return () => { cancelled = true }
  }, [])

  const fallback = (
    <GlassFallback
      className={className}
      variant={variant}
      radius={radius}
      style={style}
      {...props}
    >
      {children}
    </GlassFallback>
  )

  if (glassFailed || !GlassComponent) return fallback

  return (
    <GlassBoundary fallback={fallback}>
      <GlassComponent
        className={`liquid-glass liquid-glass--${variant} ${className}`.trim()}
        radius={radius}
        optics={opticsByVariant[variant] || opticsByVariant.regular}
        style={{ borderRadius: radius, ...style }}
        {...props}
      >
        {children}
      </GlassComponent>
    </GlassBoundary>
  )
}
