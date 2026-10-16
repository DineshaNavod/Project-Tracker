import { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { getProjectCount } from "../utils/topics.js";

// onConfirm returns a promise: an error message, or null on success.
export default function ConfirmDeleteTopic({ topic, projects, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  const count = getProjectCount(topic.id, projects);

  async function handleConfirm() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    const err = await onConfirm();
    if (err) { setError(err); setBusy(false); working.current = false; }
  }

  if (count > 0) {
    return (
      <Modal title="Topic can't be deleted yet" onClose={onCancel}>
        <p>
          “{topic.title}” still contains {count} {count === 1 ? "project" : "projects"}.
          Move or delete them first, then delete the topic.
        </p>
        <div className="actions"><button className="btn" onClick={onCancel}>OK</button></div>
      </Modal>
    );
  }

  return (
    <Modal title="Delete this topic?" onClose={busy ? () => {} : onCancel}>
      <p>“{topic.title}” has no projects. It will be deleted permanently and cannot be recovered.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn" onClick={onCancel} autoFocus disabled={busy}>Cancel</button>
        <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete topic"}</button>
      </div>
    </Modal>
  );
}
