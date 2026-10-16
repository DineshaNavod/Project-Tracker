import { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { STATUSES, LIMITS, validateProject, parseTechnologies } from "../utils/projects.js";
import { newId } from "../utils/topics.js";

// `project` is null when adding. `defaultTopicId` preselects a topic when adding.
export default function ProjectForm({ project, defaultTopicId, topics, onSave, onCancel }) {
  const startTopic = project?.topicId ?? defaultTopicId ?? "";
  const [values, setValues] = useState({
    topicId: topics.some((t) => t.id === startTopic) ? startTopic : "",
    title: project?.title ?? "",
    caption: project?.caption ?? "",
    description: project?.description ?? "",
    technologies: (project?.technologies ?? []).join(", "),
    status: project?.status ?? "Planned",
    links: (project?.links ?? []).map((l) => ({ ...l })),
  });
  const [errors, setErrors] = useState({});
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (key, value) => setValues((p) => ({ ...p, [key]: value }));
  const setLink = (id, key, value) =>
    setValues((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, [key]: value } : l)) }));
  const addLink = () => {
    setErrors((e) => ({ ...e, links: undefined }));
    setValues((p) => ({ ...p, links: [...p.links, { id: newId(), title: "", url: "" }] }));
  };
  const removeLink = (id) => {
    setErrors((e) => ({ ...e, links: undefined }));
    setValues((p) => ({ ...p, links: p.links.filter((l) => l.id !== id) }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return; // ignore double clicks
    const { errors: found, cleaned } = validateProject(values, topics);
    setErrors(found);
    if (Object.keys(found).some((k) => found[k])) return; // keep what the user typed
    submitting.current = true;
    setSaving(true);
    setSubmitError("");
    const err = await onSave(cleaned); // error message, or null on success
    if (err) { // save failed: keep the form open with everything the user typed
      setSubmitError(err);
      setSaving(false);
      submitting.current = false;
    }
  }

  const techs = parseTechnologies(values.technologies);

  return (
    <Modal title={project ? "Edit project" : "Add project"} onClose={saving ? () => {} : onCancel} wide>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label>
          Topic (required)
          <select value={values.topicId} onChange={(e) => set("topicId", e.target.value)} aria-invalid={!!errors.topicId}>
            <option value="">Choose a topic</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {errors.topicId && <span className="error" role="alert">{errors.topicId}</span>}
        </label>
        <label>
          Title (required)
          <input autoFocus value={values.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title}
            placeholder="e.g. Dockerised blog platform" />
          {errors.title && <span className="error" role="alert">{errors.title}</span>}
        </label>
        <label>
          Status
          <select value={values.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Caption (optional short summary)
          <input value={values.caption} onChange={(e) => set("caption", e.target.value)} aria-invalid={!!errors.caption} />
          {errors.caption && <span className="error" role="alert">{errors.caption}</span>}
        </label>
        <label>
          Description (optional)
          <textarea rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} aria-invalid={!!errors.description} />
          <span className="muted small">{values.description.trim().length}/{LIMITS.description}</span>
          {errors.description && <span className="error" role="alert">{errors.description}</span>}
        </label>
        <label>
          Technologies used (optional, separate with commas)
          <input value={values.technologies} onChange={(e) => set("technologies", e.target.value)} aria-invalid={!!errors.technologies}
            placeholder="React, Node.js, Docker" />
          {techs.length > 0 && (
            <span className="chips">{techs.map((t) => <span className="chip" key={t}>{t}</span>)}</span>
          )}
          {errors.technologies && <span className="error" role="alert">{errors.technologies}</span>}
        </label>

        <fieldset className="links">
          <legend>Useful links (optional)</legend>
          {values.links.length === 0 && <p className="muted small">No links yet. Add GitHub, Docker Hub, a live site, a demo video or anything else.</p>}
          {values.links.map((l, i) => {
            const le = errors.links?.[i] ?? {};
            return (
              <div className="link-row" key={l.id}>
                <div>
                  <input aria-label={`Link ${i + 1} title`} placeholder="Title, e.g. GitHub" value={l.title}
                    onChange={(e) => setLink(l.id, "title", e.target.value)} aria-invalid={!!le.title} />
                  {le.title && <span className="error" role="alert">{le.title}</span>}
                </div>
                <div>
                  <input aria-label={`Link ${i + 1} URL`} placeholder="https://..." inputMode="url" value={l.url}
                    onChange={(e) => setLink(l.id, "url", e.target.value)} aria-invalid={!!le.url} />
                  {le.url && <span className="error" role="alert">{le.url}</span>}
                </div>
                <button type="button" className="btn btn-danger" onClick={() => removeLink(l.id)} aria-label={`Remove link ${i + 1}`}>Remove</button>
              </div>
            );
          })}
          <button type="button" className="btn" onClick={addLink}>Add link</button>
        </fieldset>

        {submitError && <p className="error" role="alert">{submitError}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Add project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
