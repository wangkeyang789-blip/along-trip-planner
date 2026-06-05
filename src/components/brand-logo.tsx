import Link from "next/link";

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Link className="brand-logo" href="/" aria-label="同路首页">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-dot" />
      </span>
      {!compact && (
        <span className="brand-word">
          同路
          <small>ALONG</small>
        </span>
      )}
    </Link>
  );
}
