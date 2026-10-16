import { useRef, useState } from "react";
import Modal from "./Modal.jsx";

// onConfirm returns a promise: an error message, or null on success.
export default function ConfirmDeleteProject({ project, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);

  async function handleConfirm() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    const err = await onConfirm();
    if (err) { setError(err); setBusy(false); working.current = false; }
  }

  return (
    <Modal title="Delete this project?" onClose={busy ? () => {} : onCancel}>
      <p>“{project.title}” and its links will be deleted permanently and cannot be recovered.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn" onClick={onCancel} autoFocus disabled={busy}>Cancel</button>
        <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete project"}</button>
      </div>
    </Modal>
  );
}
