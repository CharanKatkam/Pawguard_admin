interface PawGuardLogoProps {
  size?: number;
  badgeBg?: string;
  iconColor?: string;
}

const PawGuardLogo = ({
  size = 34,
  badgeBg = "#2563EB",
  iconColor = "#FFFFFF",
}: PawGuardLogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "block" }}
    >
      {/* Background Rounded Card */}
      <rect width="36" height="36" rx="10" fill={badgeBg} />

      {/* Shield Outline */}
      <path
        d="M18 6L9 10V16.5C9 22.2 12.8 27.5 18 29C23.2 27.5 27 22.2 27 16.5V10L18 6Z"
        fill={badgeBg}
        stroke={iconColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Paw Center Pad */}
      <path
        d="M18 19C16.3 19 15 20.3 15 22C15 23.3 16 24.5 18 24.5C20 24.5 21 23.3 21 22C21 20.3 19.7 19 18 19Z"
        fill={iconColor}
      />

      {/* Paw Toes */}
      <circle cx="13.5" cy="17.5" r="1.3" fill={iconColor} />
      <circle cx="16.2" cy="14.5" r="1.3" fill={iconColor} />
      <circle cx="19.8" cy="14.5" r="1.3" fill={iconColor} />
      <circle cx="22.5" cy="17.5" r="1.3" fill={iconColor} />
    </svg>
  );
};

export default PawGuardLogo;
