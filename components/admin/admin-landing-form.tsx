"use client";

import { useState } from "react";
import type { LandingContent } from "@/lib/site-content";

type TextKey = Exclude<keyof LandingContent, "processSteps" | "questions">;

const textFields: { key: TextKey; label: string; multiline?: boolean }[] = [
  { key: "metaTitle", label: "Judul SEO halaman" },
  { key: "metaDescription", label: "Deskripsi SEO halaman", multiline: true },
  { key: "heroKicker", label: "Pengantar hero" },
  { key: "heroTitle", label: "Judul utama" },
  { key: "heroDescription", label: "Deskripsi hero", multiline: true },
  { key: "primaryCta", label: "Teks tombol utama" },
  { key: "secondaryCta", label: "Teks tautan sekunder" },
  { key: "heroNote", label: "Catatan hero" },
  { key: "processKicker", label: "Label bagian cara kerja" },
  { key: "processTitle", label: "Judul bagian cara kerja" },
  { key: "processDescription", label: "Deskripsi bagian cara kerja", multiline: true },
  { key: "pricingKicker", label: "Label bagian harga" },
  { key: "pricingTitle", label: "Judul bagian harga" },
  { key: "pricingDescription", label: "Deskripsi bagian harga", multiline: true },
  { key: "faqKicker", label: "Label FAQ" },
  { key: "faqTitle", label: "Judul FAQ" }
];

export function AdminLandingForm({ initialContent }: { initialContent: LandingContent }) {
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/site-configuration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "landing", content })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Konten landing page gagal disimpan.");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Konten landing page gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  function changeText(key: TextKey, value: string) {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  return (
    <form className="panel admin-editor-form" onSubmit={save}>
      <h2>Teks dan metadata</h2>
      <div className="form-grid">
        {textFields.map(({ key, label, multiline }) => (
          <div className={`field${multiline ? " wide" : ""}`} key={key}>
            <label htmlFor={`landing-${key}`}>{label}</label>
            {multiline ? (
              <textarea
                id={`landing-${key}`}
                rows={3}
                value={content[key]}
                onChange={(event) => changeText(key, event.target.value)}
              />
            ) : (
              <input
                id={`landing-${key}`}
                value={content[key]}
                onChange={(event) => changeText(key, event.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <fieldset className="admin-editor-group">
        <legend>Langkah cara kerja</legend>
        {content.processSteps.map((step, index) => (
          <div className="admin-step-fields" key={index}>
            <h3>Langkah {index + 1}</h3>
            <div className="field">
              <label htmlFor={`step-title-${index}`}>Judul langkah</label>
              <input
                id={`step-title-${index}`}
                value={step.title}
                onChange={(event) => {
                  const processSteps = content.processSteps.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, title: event.target.value } : item
                  );
                  setContent((current) => ({ ...current, processSteps }));
                  setSaved(false);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor={`step-description-${index}`}>Deskripsi langkah</label>
              <textarea
                id={`step-description-${index}`}
                rows={2}
                value={step.description}
                onChange={(event) => {
                  const processSteps = content.processSteps.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description: event.target.value } : item
                  );
                  setContent((current) => ({ ...current, processSteps }));
                  setSaved(false);
                }}
              />
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="admin-editor-group">
        <legend>Pertanyaan dan jawaban</legend>
        {content.questions.map((item, index) => (
          <div className="admin-step-fields" key={index}>
            <div className="row">
              <h3>Pertanyaan {index + 1}</h3>
              <button
                className="button button-secondary button-small"
                type="button"
                disabled={content.questions.length <= 1}
                onClick={() => {
                  setContent((current) => ({
                    ...current,
                    questions: current.questions.filter((_, itemIndex) => itemIndex !== index)
                  }));
                  setSaved(false);
                }}
              >
                Hapus
              </button>
            </div>
            <div className="field">
              <label htmlFor={`question-${index}`}>Pertanyaan</label>
              <input
                id={`question-${index}`}
                value={item.question}
                onChange={(event) => {
                  const questions = content.questions.map((question, itemIndex) =>
                    itemIndex === index ? { ...question, question: event.target.value } : question
                  );
                  setContent((current) => ({ ...current, questions }));
                  setSaved(false);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor={`answer-${index}`}>Jawaban</label>
              <textarea
                id={`answer-${index}`}
                rows={3}
                value={item.answer}
                onChange={(event) => {
                  const questions = content.questions.map((question, itemIndex) =>
                    itemIndex === index ? { ...question, answer: event.target.value } : question
                  );
                  setContent((current) => ({ ...current, questions }));
                  setSaved(false);
                }}
              />
            </div>
          </div>
        ))}
        <button
          className="button button-secondary"
          type="button"
          disabled={content.questions.length >= 12}
          onClick={() => {
            setContent((current) => ({
              ...current,
              questions: [...current.questions, { question: "", answer: "" }]
            }));
            setSaved(false);
          }}
        >
          Tambah pertanyaan
        </button>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="form-success" role="status">Perubahan landing page sudah disimpan.</p>}
      <button className="button button-accent" type="submit" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan landing page"}
      </button>
    </form>
  );
}
