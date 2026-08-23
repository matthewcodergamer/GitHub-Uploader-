import { Glass } from '@samasante/liquid-glass'

// Keep the material clear enough to read as glass. The CSS supplies only a
// translucent tint; the package supplies frost, live-DOM optics and edge light.
const opticsByVariant = {
  regular: {
    strength: 0.028,
    depth: 0.18,
    curvature: 0.06,
    dispersion: 0.008,
    bend: 0.14,
    bendWidth: 0.06,
    sheen: 0.10,
    sheenWidth: 0.016,
    sheenFalloff: 4.2,
    sheenAngle: -0.85,
    specular: 0.09,
    glow: 0.006,
    frost: 2.5,
    brightness: 0,
    splay: 0.006,
  },
  prominent: {
    strength: 0.038,
    depth: 0.22,
    curvature: 0.075,
    dispersion: 0.009,
    bend: 0.18,
    bendWidth: 0.065,
    sheen: 0.12,
    sheenWidth: 0.017,
    sheenFalloff: 4.1,
    sheenAngle: -0.85,
    specular: 0.10,
    glow: 0.008,
    frost: 2.8,
    brightness: 0,
    splay: 0.007,
  },
}

export function LiquidGlass({
  children,
  className = '',
  variant = 'regular',
  radius = 20,
  style,
  ...props
}) {
  return (
    <Glass
      className={`liquid-glass liquid-glass--${variant} ${className}`.trim()}
      radius={radius}
      optics={opticsByVariant[variant] || opticsByVariant.regular}
      style={{ borderRadius: radius, ...style }}
      {...props}
    >
      {children}
    </Glass>
  )
}
