import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Crown } from "lucide-react";
import { WORLD_ART, worldArtUrl, type WorldArtName } from "../game/world-art";
export function WorldImage({
  name,
  className = "",
  decorative = false,
  eager = false,
}: {
  name: WorldArtName;
  className?: string;
  decorative?: boolean;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className={`${className} art-fallback`} aria-hidden="true">
        <Crown size={34} />
      </div>
    );
  return (
    <img
      className={className}
      src={worldArtUrl(name)}
      alt={decorative ? "" : WORLD_ART[name].alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
export function WorldBackground() {
  const { pathname } = useLocation();
  const chamber =
    pathname.startsWith("/room/") || pathname.startsWith("/game/");
  const name = chamber ? "council-background" : "realm-background";
  return (
    <div
      className={`world-backdrop ${chamber ? "chamber-backdrop" : "realm-backdrop"}`}
      aria-hidden="true"
    >
      <picture key={name}>
        <source
          media="(max-width: 600px)"
          srcSet={`${import.meta.env.BASE_URL}assets/world/${name}-mobile.webp`}
        />
        <WorldImage name={name} decorative eager />
      </picture>
    </div>
  );
}
export function CrownRelic() {
  return (
    <div className="crown-scene crown-relic" aria-hidden="true">
      <WorldImage name="crown-relic" decorative eager />
      <span className="artifact-label">
        THE FATE OF THE REALM IS IN YOUR HANDS
      </span>
    </div>
  );
}
