import { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { validateTopic, TITLE_MAX, DESC_MAX } from "../utils/topics.js";

// `topic` is null when adding. onSave returns a promise: an error message, or null on success.
export default function TopicForm({ topic, topics, onSave, onCancel }) {
  const [title, setTitle] = useState(topic?.title ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;
    const found = validateTopic({ title, description }, topics, topic?.id ?? null);
    setErrors(found);
    if (Object.keys(found).length > 0) return; // keep what the user typed
    submitting.current = true;
    setSaving(true);
    setSubmitError("");
    const err = await onSave({ title, description });
    if (err) { // save failed: keep the form open with the user's text
      setSubmitError(err);
      setSaving(false);
      submitting.current = false;
    }
  }

  return (
    <Modal title={topic ? "Edit topic" : "Add topic"} onClose={saving ? () => {} : onCancel}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label>
          Title (required)
          <input
            autoFocus
            value={title}
            maxLength={TITLE_MAX + 20}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!errors.title}
            placeholder="e.g. Docker, React, University Projects"
          />
          {errors.title && <span className="error" role="alert">{errors.title}</span>}
        </label>
        <label>
          Description (optional)
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!errors.description}
            placeholder="What kind of projects belong here?"
          />
          <span className="muted small">{description.trim().length}/{DESC_MAX}</span>
          {errors.description && <span className="error" role="alert">{errors.description}</span>}
        </label>
        {submitError && <p className="error" role="alert">{submitError}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : topic ? "Save changes" : "Add topic"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
