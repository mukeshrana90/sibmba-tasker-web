import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import "../Assets/css/logistics-face-camera.css";

const NO_CAMERA = "No camera was found on this device. Use a phone or computer with a camera, then try again.";

/** Plain-language reason for a getUserMedia failure. */
export function cameraErrorMessage(err) {
  switch (err?.name) {
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return NO_CAMERA;
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "The camera is being used by another app. Close that app, then try again.";
    default:
      return "We couldn't open the camera. Check that it's connected, then try again.";
  }
}

/** Live camera capture for face photos: no file picker, by design. */
export default function LogisticsFaceCamera({ show, onHide, onCapture, title = "Take a face photo" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState("starting");
  const [error, setError] = useState("");
  const [shot, setShot] = useState(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    setShot((old) => {
      if (old?.url) URL.revokeObjectURL(old.url);
      return null;
    });
    setError("");
    setPhase("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't open the camera. Try Chrome or Safari on a device with a camera.");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("live");
    } catch (err) {
      setError(cameraErrorMessage(err));
      setPhase("error");
    }
  }, [stop]);

  useEffect(() => {
    if (show) start();
    else stop();
    return stop;
  }, [show, start, stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("We couldn't take that photo. Try again.");
          setPhase("error");
          return;
        }
        stop();
        setShot({ blob, url: URL.createObjectURL(blob) });
        setPhase("captured");
      },
      "image/jpeg",
      0.9
    );
  };

  const use = () => {
    onCapture(new File([shot.blob], "face-photo.jpg", { type: "image/jpeg" }));
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName="log-face-camera" data-testid="face-camera">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {phase === "error" ? (
          <div className="log-face-camera__error" role="alert" data-testid="face-camera-error">
            <p>{error}</p>
            <button type="button" className="logistics-cta logistics-cta--primary" onClick={start} data-testid="face-camera-retry">
              Try again
            </button>
          </div>
        ) : (
          <div className="log-face-camera__frame">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              hidden={phase === "captured"}
              data-testid="face-camera-video"
            />
            {shot ? <img src={shot.url} alt="Captured face" data-testid="face-camera-preview" /> : null}
          </div>
        )}
        {phase === "live" || phase === "starting" ? (
          <p className="log-hint">Face the camera in good light, with your whole face in the frame.</p>
        ) : null}
      </Modal.Body>
      {phase === "error" ? null : (
        <Modal.Footer>
          {phase === "captured" ? (
            <>
              <button type="button" className="logistics-cta logistics-cta--ghost" onClick={start} data-testid="face-camera-retake">
                Retake
              </button>
              <button type="button" className="logistics-cta logistics-cta--primary" onClick={use} data-testid="face-camera-use">
                Use photo
              </button>
            </>
          ) : (
            <button type="button" className="logistics-cta logistics-cta--primary" onClick={capture} disabled={phase !== "live"} data-testid="face-camera-capture">
              Take photo
            </button>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
}
