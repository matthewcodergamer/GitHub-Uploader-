export function CrainAppIcon() {
  return (
    <div className="crain-app-icon" aria-hidden="true">
      <svg viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="folderTop" x1="8" y1="18" x2="48" y2="39" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34C8FF" />
            <stop offset=".46" stopColor="#0A9CFF" />
            <stop offset="1" stopColor="#0877ED" />
          </linearGradient>
          <linearGradient id="folderFace" x1="28" y1="24" x2="28" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#17B6FF" />
            <stop offset="1" stopColor="#0A84FF" />
          </linearGradient>
        </defs>

        {/* Files visibly entering the existing iOS folder. */}
        <path d="M16 6.5h12l5 5V29H16a3 3 0 0 1-3-3V9.5a3 3 0 0 1 3-3Z" fill="#FFFFFF" />
        <path d="M28 6.8v5h5" stroke="#9AB6CF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17.5 16h10M17.5 19.8h8" stroke="#6E879C" strokeWidth="1.2" strokeLinecap="round" opacity=".78" />

        <path d="M24 9.5h11l4.5 4.5v15.5H24a2.8 2.8 0 0 1-2.8-2.8V12.3A2.8 2.8 0 0 1 24 9.5Z" fill="#7FB7FF" opacity=".92" />
        <path d="M35 9.8v4.6h4.3" stroke="#D6EAFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Keep the v15 blue iOS folder silhouette. */}
        <path d="M8.5 24.5c0-2 1.6-3.6 3.6-3.6h10c1.1 0 2.2.5 2.9 1.4l2.1 2.5h16.8c2 0 3.6 1.6 3.6 3.6v2.2h-39V24.5Z" fill="url(#folderTop)" />
        <path d="M7.6 29.1c0-2 1.6-3.6 3.6-3.6h33.6c2 0 3.6 1.6 3.6 3.6v12.4c0 2.4-1.9 4.3-4.3 4.3H11.9c-2.4 0-4.3-1.9-4.3-4.3V29.1Z" fill="url(#folderFace)" />
        <path d="M10.5 28.5h35" stroke="white" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
