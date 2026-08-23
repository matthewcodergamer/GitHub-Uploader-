import { Glass } from '@samasante/liquid-glass'

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
