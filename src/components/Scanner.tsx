import { useEffect, useRef, useState } from "react";
import { invitationCode } from "../utils/invitations";
export default function Scanner({
  onCode,
}: {
  onCode: (value: string) => void;
}) {
  const [error, setError] = useState("");
  const callback = useRef(onCode);
  callback.current = onCode;
  useEffect(() => {
    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    let starting: Promise<unknown> | undefined;
    void import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode("qr-reader");
      starting = scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (text) => {
            try {
              const value = invitationCode(text);
              if (value) callback.current(value.toUpperCase());
              else setError("Scan a Crownfall invitation QR code.");
            } catch {
              setError("This QR code is not a Crownfall invitation.");
            }
          },
          () => {},
        )
        .catch(() =>
          setError(
            "Camera unavailable. Allow camera access or enter the room code.",
          ),
        );
    });
    return () => {
      cancelled = true;
      void starting?.then(async () => {
        if (scanner?.isScanning) await scanner.stop();
        scanner?.clear();
      });
    };
  }, []);
  return (
    <div className="scanner">
      <div id="qr-reader" />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
