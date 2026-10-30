import { useState } from "react";
import { Crown } from "lucide-react";

export default function BrandEmblem({
  className = "",
}: {
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const classes = `brand-emblem ${className}`;
  return failed ? (
    <Crown className={classes} aria-hidden="true" strokeWidth={1.2} />
  ) : (
    <img
      className={classes}
      src={`${import.meta.env.BASE_URL}assets/branding/crownfall-emblem.webp`}
      alt=""
      width={384}
      height={384}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
