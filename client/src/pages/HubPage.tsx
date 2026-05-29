import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  applyPlaySessionProposal,
  downloadCampaignExport,
  fetchHub,
  leaveSession,
  processPlaySessionAudio,
  rejoinCampaign,
  resolveJoinRequest,
  suggestNpc,
  updateCharacter,
  updateHub,
  updatePlaySessionProposal,
  uploadPlaySessionAudio,
} from "../api";
import { CampaignTimeline } from "../components/CampaignTimeline";
import { InviteLinkBox } from "../components/InviteLinkBox";
import { CHARACTER_TEMPLATES, getTemplate } from "../lib/characterTemplates";
import { StatusMessage } from "../components/StatusMessage";
import { useAuth } from "../context/AuthContext";
import {
  loadStoredSessionForCode,
  clearStoredSession,
  saveStoredSession,
} from "../hooks/useSessionStorage";
import {
  ROLE_LABELS,
  VISIBILITY_LABELS,
  WIKI_TYPE_LABELS,
  type CampaignVisibility,
  type HubView,
  type PlaySessionRecord,
  type NpcSuggestion,
  type SessionAiProposal,
  type CharacterTemplateId,
  type WikiEntry,
  type WikiEntryType,
} from "../types";

function AudioBlock({ url, label }: { url: string; label: string }) {
  if (!url.trim()) {
    return (
      <p className="text-sm text-[var(--color-mist)]">
        No hay audio. El master puede pegar una URL (ej. enlace a MP3).
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--color-mist)]">{label}</p>
      <audio controls className="w-full" src={url} preload="metadata">
        Tu navegador no soporta audio.
      </audio>
    </div>
  );
}

function SummaryBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-slate-border)] bg-[#121018] p-4 text-sm leading-relaxed whitespace-pre-wrap">
      {text || "Sin resumen todavía."}
    </div>
  );
}

function MasterHub({
  hub,
  onRefresh,
}: {
  hub: HubView;
  onRefresh: () => void;
}) {
  const [title, setTitle] = useState(hub.campaignTitle);
  const [summary, setSummary] = useState(hub.campaignSummary);
  const [audioUrl, setAudioUrl] = useState(hub.campaignAudioUrl);
  const [wiki, setWiki] = useState(hub.wiki ?? []);
  const [playSessions, setPlaySessions] = useState(hub.playSessions ?? []);
  const [visibility, setVisibility] = useState<CampaignVisibility>(
    hub.campaignVisibility ?? "unlisted"
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  useEffect(() => {
    setTitle(hub.campaignTitle);
    setSummary(hub.campaignSummary);
    setAudioUrl(hub.campaignAudioUrl);
    setWiki(hub.wiki ?? []);
    setPlaySessions(hub.playSessions ?? []);
    setVisibility(hub.campaignVisibility ?? "unlisted");
  }, [hub]);

  const [newWikiTitle, setNewWikiTitle] = useState("");
  const [newWikiBody, setNewWikiBody] = useState("");
  const [newWikiType, setNewWikiType] = useState<WikiEntryType>("note");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [npcLoading, setNpcLoading] = useState(false);
  const [npcSuggestion, setNpcSuggestion] = useState<NpcSuggestion | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleJoinRequest(requestId: string, action: "approve" | "reject") {
    setResolvingId(requestId);
    try {
      await resolveJoinRequest(hub.code, hub.participantId, requestId, action);
      onRefresh();
    } catch (e) {
      setMsgError(true);
      setMsg(e instanceof Error ? e.message : "Error al procesar solicitud");
    } finally {
      setResolvingId(null);
    }
  }

  async function saveCampaign() {
    setSaving(true);
    setMsg(null);
    setMsgError(false);
    try {
      await updateHub(hub.code, hub.participantId, {
        campaignTitle: title,
        campaignSummary: summary,
        campaignAudioUrl: audioUrl,
        visibility,
        wiki,
        playSessions,
      });
      setMsg("Guardado");
      onRefresh();
    } catch (e) {
      setMsgError(true);
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function addWiki() {
    if (!newWikiTitle.trim()) return;
    setWiki([
      ...wiki,
      {
        id: crypto.randomUUID(),
        type: newWikiType,
        title: newWikiTitle.trim(),
        body: newWikiBody,
        masterOnly: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewWikiTitle("");
    setNewWikiBody("");
  }

  function addPlaySession() {
    setPlaySessions([
      ...playSessions,
      {
        id: crypto.randomUUID(),
        title: `Sesión ${playSessions.length + 1}`,
        summary: "",
        audioUrl: "",
        playedAt: new Date().toISOString().slice(0, 10),
        published: false,
      },
    ]);
  }

  const pending = hub.pendingJoinRequests ?? [];

  async function handleSuggestNpc() {
    setNpcLoading(true);
    try {
      const s = await suggestNpc(hub.code, hub.participantId);
      setNpcSuggestion(s);
    } catch (e) {
      setMsgError(true);
      setMsg(e instanceof Error ? e.message : "Error IA");
    } finally {
      setNpcLoading(false);
    }
  }

  function addNpcToWiki() {
    if (!npcSuggestion) return;
    setWiki([
      ...wiki,
      {
        id: crypto.randomUUID(),
        type: "npc",
        title: npcSuggestion.title,
        body: [npcSuggestion.body, ...npcSuggestion.hooks.map((h) => `• ${h}`)].join("\n\n"),
        masterOnly: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNpcSuggestion(null);
    setMsg("NPC añadido a la wiki (guarda la campaña)");
    setMsgError(false);
  }

  return (
    <div className="space-y-8">
      <InviteLinkBox inviteUrl={hub.inviteUrl} code={hub.code} />

      {hub.timeline && hub.timeline.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Timeline</h2>
          <CampaignTimeline events={hub.timeline} />
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await downloadCampaignExport(hub.code, hub.participantId, "markdown");
            } catch (e) {
              setMsgError(true);
              setMsg(e instanceof Error ? e.message : "Error");
            } finally {
              setExporting(false);
            }
          }}
          className="rounded border border-[var(--color-slate-border)] px-3 py-1.5 text-xs"
        >
          Exportar Markdown
        </button>
        <button
          type="button"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await downloadCampaignExport(hub.code, hub.participantId, "html");
              window.print();
            } catch (e) {
              setMsgError(true);
              setMsg(e instanceof Error ? e.message : "Error");
            } finally {
              setExporting(false);
            }
          }}
          className="rounded border border-[var(--color-slate-border)] px-3 py-1.5 text-xs"
        >
          Exportar HTML / PDF
        </button>
      </section>

      {pending.length > 0 && (
        <section className="space-y-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
          <h2 className="font-display text-lg text-amber-300">
            Solicitudes de jugador ({pending.length})
          </h2>
          <ul className="space-y-2">
            {pending.map((req) => (
              <li
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-3"
              >
                <div>
                  <p className="font-medium">{req.name}</p>
                  <p className="text-xs text-[var(--color-mist)]">
                    {new Date(req.requestedAt).toLocaleString("es")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={resolvingId === req.id}
                    onClick={() => handleJoinRequest(req.id, "reject")}
                    className="rounded-lg border border-[var(--color-slate-border)] px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={resolvingId === req.id}
                    onClick={() => handleJoinRequest(req.id, "approve")}
                    className="rounded-lg bg-[var(--color-gold)] px-3 py-1.5 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"
                  >
                    {resolvingId === req.id ? "…" : "Aprobar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg text-[var(--color-gold)]">Campaña</h2>
        <input
          className="w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la campaña"
        />
        <label className="block text-sm text-[var(--color-mist)]">Resumen (público)</label>
        <textarea
          className="min-h-28 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Resumen para jugadores y observadores..."
        />
        <label className="block text-sm text-[var(--color-mist)]">URL audio campaña</label>
        <input
          className="w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2 text-sm"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://..."
        />
        <AudioBlock url={audioUrl} label="Vista previa" />
        <label className="block text-sm text-[var(--color-mist)]">Visibilidad</label>
        <select
          className="w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2 text-sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as CampaignVisibility)}
        >
          {(Object.keys(VISIBILITY_LABELS) as CampaignVisibility[]).map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Wiki</h2>
          <button
            type="button"
            disabled={npcLoading}
            onClick={() => void handleSuggestNpc()}
            className="text-xs text-[var(--color-gold)] hover:underline"
          >
            {npcLoading ? "Generando NPC…" : "+ Sugerir NPC (IA)"}
          </button>
        </div>
        {npcSuggestion && (
          <div className="rounded-lg border border-[var(--color-gold)]/30 p-3 text-sm space-y-2">
            <p className="font-medium">{npcSuggestion.title}</p>
            <p className="text-[var(--color-mist)]">{npcSuggestion.body}</p>
            <button type="button" onClick={addNpcToWiki} className="text-xs text-[var(--color-gold)]">
              Añadir a wiki
            </button>
          </div>
        )}
        <ul className="space-y-2">
          {wiki.map((w) => (
            <li
              key={w.id}
              className="rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-3"
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">
                  {WIKI_TYPE_LABELS[w.type]}: {w.title}
                </span>
                <label className="flex items-center gap-1 text-xs text-[var(--color-mist)]">
                  <input
                    type="checkbox"
                    checked={w.masterOnly}
                    onChange={(e) =>
                      setWiki(
                        wiki.map((x) =>
                          x.id === w.id ? { ...x, masterOnly: e.target.checked } : x
                        )
                      )
                    }
                  />
                  Solo master
                </label>
              </div>
              <p className="mt-1 text-sm text-[var(--color-mist)]">{w.body}</p>
              <button
                type="button"
                onClick={() => setWiki(wiki.filter((x) => x.id !== w.id))}
                className="mt-2 text-xs text-red-400/90 hover:underline"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-dashed border-[var(--color-slate-border)] p-3 space-y-2">
          <select
            className="rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 text-sm"
            value={newWikiType}
            onChange={(e) => setNewWikiType(e.target.value as WikiEntryType)}
          >
            {(Object.keys(WIKI_TYPE_LABELS) as WikiEntryType[]).map((t) => (
              <option key={t} value={t}>
                {WIKI_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 text-sm"
            placeholder="Título"
            value={newWikiTitle}
            onChange={(e) => setNewWikiTitle(e.target.value)}
          />
          <textarea
            className="w-full rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 text-sm"
            placeholder="Descripción"
            value={newWikiBody}
            onChange={(e) => setNewWikiBody(e.target.value)}
          />
          <button
            type="button"
            onClick={addWiki}
            className="text-sm text-[var(--color-gold)] hover:underline"
          >
            + Añadir entrada
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Sesiones jugadas</h2>
          <button
            type="button"
            onClick={addPlaySession}
            className="text-sm text-[var(--color-gold)]"
          >
            + Sesión
          </button>
        </div>
        {playSessions.length === 0 && (
          <p className="text-sm text-[var(--color-mist)] rounded-lg border border-dashed border-[var(--color-slate-border)] p-4">
            Pulsa <strong className="text-[var(--color-gold)]">+ Sesión</strong> para registrar una
            partida y subir el audio de esa sesión.
          </p>
        )}
        {playSessions.map((ps, i) => (
          <PlaySessionEditor
            key={ps.id}
            code={hub.code}
            participantId={hub.participantId}
            session={ps}
            onChange={(next) =>
              setPlaySessions(playSessions.map((p, j) => (j === i ? next : p)))
            }
            onHubRefresh={onRefresh}
          />
        ))}
      </section>

      <section>
        <h2 className="font-display text-lg text-[var(--color-gold)] mb-2">Mesa</h2>
        <ul className="text-sm space-y-1">
          {hub.participants?.map((p) => (
            <li key={p.id} className={p.connected === false ? "opacity-60" : ""}>
              {p.name} — {ROLE_LABELS[p.role]}
              {p.isOwner && " (dueño)"}
              {p.connected === false ? " · desconectado" : " · en línea"}
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={saveCampaign}
        className="w-full rounded-lg bg-[var(--color-gold)] py-3 font-semibold text-[var(--color-ink)]"
      >
        {saving ? "Guardando…" : "Guardar campaña"}
      </button>
      {msg && <StatusMessage message={msg} variant={msgError ? "error" : "success"} />}
    </div>
  );
}

function EditableProposal({
  proposal,
  onChange,
  onSave,
  saving,
}: {
  proposal: SessionAiProposal;
  onChange: (p: SessionAiProposal) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded border border-[var(--color-gold)]/40 bg-[#121018] p-3 space-y-3 text-sm">
      <p className="text-xs text-[var(--color-gold)] font-medium">Propuesta editable (ajusta antes de aplicar)</p>
      <div>
        <p className="text-xs text-[var(--color-mist)] mb-1">Resumen</p>
        <textarea
          className="w-full rounded border border-[var(--color-slate-border)] bg-black/30 px-2 py-1 text-sm min-h-20"
          value={proposal.summary}
          onChange={(e) => onChange({ ...proposal, summary: e.target.value })}
        />
      </div>
      {proposal.wikiEntries.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-mist)] mb-1">Wiki ({proposal.wikiEntries.length})</p>
          <ul className="space-y-1">
            {proposal.wikiEntries.map((w, i) => (
              <li key={i}>
                {WIKI_TYPE_LABELS[w.type]}: <strong>{w.title}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {proposal.characterNotes.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-mist)] mb-1">Personajes</p>
          <ul className="space-y-1">
            {proposal.characterNotes.map((c, i) => (
              <li key={i}>
                <strong>{c.playerOrCharacterName}</strong>
                {c.bioAddition && `: ${c.bioAddition.slice(0, 120)}…`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!proposal.appliedAt && (
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="text-xs text-[var(--color-gold)] hover:underline"
        >
          Guardar cambios en la propuesta
        </button>
      )}
      {proposal.appliedAt && (
        <p className="text-xs text-green-400">Aplicado al hub el {new Date(proposal.appliedAt).toLocaleString()}</p>
      )}
    </div>
  );
}

function PlaySessionEditor({
  code,
  participantId,
  session,
  onChange,
  onHubRefresh,
}: {
  code: string;
  participantId: string;
  session: PlaySessionRecord;
  onChange: (s: PlaySessionRecord) => void;
  onHubRefresh: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [pasteTranscript, setPasteTranscript] = useState("");
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiError, setAiError] = useState(false);
  const [draftProposal, setDraftProposal] = useState<SessionAiProposal | null>(
    session.aiProposal ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftProposal(session.aiProposal ?? null);
  }, [session.aiProposal]);

  async function runProcess(options: {
    audioUrl?: string;
    audioBase64?: string;
    audioMimeType?: string;
    transcript?: string;
  }) {
    setProcessing(true);
    setAiMsg(null);
    setAiError(false);
    try {
      const { hub } = await processPlaySessionAudio(code, participantId, session.id, options);
      const updated = hub.playSessions?.find((p) => p.id === session.id);
      if (updated) onChange(updated);
      setAiMsg("Listo: revisa la propuesta y pulsa «Aplicar al hub».");
      onHubRefresh();
    } catch (e) {
      setAiError(true);
      setAiMsg(e instanceof Error ? e.message : "Error al procesar");
    } finally {
      setProcessing(false);
    }
  }

  async function handleFile(file: File) {
    setProcessing(true);
    setAiMsg(null);
    setAiError(false);
    try {
      if (file.size <= 4 * 1024 * 1024) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        await runProcess({ audioBase64: btoa(binary), audioMimeType: file.type || "audio/mpeg" });
        return;
      }
      const { audioUrl, hub } = await uploadPlaySessionAudio(
        code,
        participantId,
        session.id,
        file
      );
      onChange({ ...session, audioUrl });
      const updated = hub.playSessions?.find((p) => p.id === session.id);
      if (updated) onChange(updated);
      setAiMsg(`Audio subido (${audioUrl.slice(0, 40)}…). Pulsa «Procesar URL de audio».`);
      onHubRefresh();
    } catch (e) {
      setAiError(true);
      setAiMsg(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setProcessing(false);
    }
  }

  async function saveProposalEdits() {
    if (!draftProposal) return;
    setProcessing(true);
    try {
      const hub = await updatePlaySessionProposal(
        code,
        participantId,
        session.id,
        draftProposal
      );
      const updated = hub.playSessions?.find((p) => p.id === session.id);
      if (updated) onChange(updated);
      setAiMsg("Propuesta guardada");
    } catch (e) {
      setAiError(true);
      setAiMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleApply() {
    setProcessing(true);
    setAiMsg(null);
    setAiError(false);
    try {
      const { hub } = await applyPlaySessionProposal(
        code,
        participantId,
        session.id,
        draftProposal ?? undefined
      );
      const updated = hub.playSessions?.find((p) => p.id === session.id);
      if (updated) onChange(updated);
      setAiMsg("Aplicado: resumen, wiki y fichas actualizados. Guarda la campaña si cambiaste más cosas.");
      onHubRefresh();
    } catch (e) {
      setAiError(true);
      setAiMsg(e instanceof Error ? e.message : "Error al aplicar");
    } finally {
      setProcessing(false);
    }
  }

  const status = session.transcriptStatus ?? "idle";

  return (
    <div className="rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-3 space-y-3">
      <input
        className="w-full rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 font-medium"
        value={session.title}
        onChange={(e) => onChange({ ...session, title: e.target.value })}
      />
      <textarea
        className="w-full rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 text-sm min-h-16"
        value={session.summary}
        onChange={(e) => onChange({ ...session, summary: e.target.value })}
        placeholder="Resumen de la sesión"
      />
      <input
        className="w-full rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 text-xs"
        value={session.audioUrl}
        onChange={(e) => onChange({ ...session, audioUrl: e.target.value })}
        placeholder="URL audio sesión (MP3, etc.)"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={session.published}
          onChange={(e) => onChange({ ...session, published: e.target.checked })}
        />
        Publicado (visible para jugadores y observadores)
      </label>

      <div className="border-t border-[var(--color-slate-border)] pt-3 space-y-3">
        <p className="text-sm font-medium text-[var(--color-gold)]">Audio de esta sesión</p>
        <p className="text-xs text-[var(--color-mist)]">
          1) Sube el archivo o pega una URL · 2) Procesar con IA · 3) Aplicar al hub.
          Necesitas <code className="text-[var(--color-parchment)]">OPENAI_API_KEY</code> y{" "}
          <code className="text-[var(--color-parchment)]">BLOB_READ_WRITE_TOKEN</code> en Vercel.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
          disabled={processing}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={processing}
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-[var(--color-gold)]/50 bg-[#121018] py-4 text-sm font-medium text-[var(--color-gold)] hover:border-[var(--color-gold)]"
        >
          {processing ? "Subiendo…" : "Subir archivo de audio (MP3, M4A, WAV…)"}
        </button>
        <p className="text-xs text-[var(--color-mist)]">
          Hasta 4 MB directo; archivos más grandes usan almacenamiento en la nube (Blob).
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={processing || !session.audioUrl.trim()}
            onClick={() => void runProcess({ audioUrl: session.audioUrl.trim() })}
            className="rounded border border-[var(--color-slate-border)] px-3 py-1.5 text-xs hover:border-[var(--color-gold)]"
          >
            {processing ? "Procesando…" : "Procesar URL de audio"}
          </button>
          <button
            type="button"
            disabled={processing || !pasteTranscript.trim()}
            onClick={() => void runProcess({ transcript: pasteTranscript.trim() })}
            className="rounded border border-[var(--color-slate-border)] px-3 py-1.5 text-xs hover:border-[var(--color-gold)]"
          >
            Solo analizar texto
          </button>
        </div>

        <textarea
          className="w-full rounded border border-[var(--color-slate-border)] bg-[#121018] px-2 py-1 text-xs min-h-14"
          value={pasteTranscript}
          onChange={(e) => setPasteTranscript(e.target.value)}
          placeholder="O pega aquí la transcripción (si ya la tienes de otra herramienta)"
        />

        {status === "processing" && (
          <p className="text-xs text-[var(--color-mist)]">Transcribiendo y analizando… puede tardar 1–2 min.</p>
        )}
        {session.transcriptError && (
          <p className="text-xs text-red-300">{session.transcriptError}</p>
        )}
        {session.transcript && (
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-mist)]">Ver transcripción</summary>
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[var(--color-parchment)]">
              {session.transcript.slice(0, 4000)}
              {session.transcript.length > 4000 ? "…" : ""}
            </p>
          </details>
        )}

        {draftProposal && (
          <EditableProposal
            proposal={draftProposal}
            onChange={setDraftProposal}
            onSave={() => void saveProposalEdits()}
            saving={processing}
          />
        )}

        {draftProposal && !draftProposal.appliedAt && (
          <button
            type="button"
            disabled={processing}
            onClick={() => void handleApply()}
            className="w-full rounded-lg bg-[var(--color-gold)] py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            Aplicar al hub (wiki + fichas + resumen)
          </button>
        )}

        {aiMsg && <StatusMessage message={aiMsg} variant={aiError ? "error" : "success"} />}
      </div>
    </div>
  );
}

function PlayerHub({
  hub,
  onRefresh,
}: {
  hub: HubView;
  onRefresh: () => void;
}) {
  const c = hub.myCharacter;
  const [characterName, setCharacterName] = useState(c?.characterName ?? "");
  const [bio, setBio] = useState(c?.bio ?? "");
  const [privateNotes, setPrivateNotes] = useState(c?.privateNotes ?? "");
  const [templateId, setTemplateId] = useState<CharacterTemplateId>(
    c?.templateId ?? "generic"
  );
  const [sheetData, setSheetData] = useState<Record<string, string>>(c?.sheetData ?? {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);
  const template = getTemplate(templateId);

  useEffect(() => {
    if (hub.myCharacter) {
      setCharacterName(hub.myCharacter.characterName);
      setBio(hub.myCharacter.bio);
      setPrivateNotes(hub.myCharacter.privateNotes);
      setTemplateId(hub.myCharacter.templateId ?? "generic");
      setSheetData(hub.myCharacter.sheetData ?? {});
    }
  }, [hub.myCharacter]);

  if (!c) {
    return (
      <p className="text-sm text-[var(--color-mist)]">
        No se encontró tu ficha. Pide al master que te apruebe de nuevo.
      </p>
    );
  }

  async function saveCharacter() {
    setSaving(true);
    try {
      await updateCharacter(hub.code, hub.participantId, {
        characterName,
        bio,
        privateNotes,
        templateId,
        sheetData,
      });
      setMsg("Personaje guardado");
      onRefresh();
    } catch (e) {
      setMsgError(true);
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-lg text-[var(--color-gold)]">Mi personaje</h2>
        <p className="text-xs text-[var(--color-mist)]">
          Solo tú puedes editar esta ficha. No puedes modificar la wiki ni la campaña.
        </p>
        <input
          className="w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          placeholder="Nombre del personaje"
        />
        <label className="block text-sm">
          Plantilla
          <select
            className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as CharacterTemplateId)}
          >
            {CHARACTER_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {template.fields.map((f) => (
          <label key={f.key} className="block text-sm">
            {f.label}
            {f.multiline ? (
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2 min-h-16"
                value={sheetData[f.key] ?? ""}
                onChange={(e) =>
                  setSheetData({ ...sheetData, [f.key]: e.target.value })
                }
              />
            ) : (
              <input
                className="mt-1 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
                value={sheetData[f.key] ?? ""}
                onChange={(e) =>
                  setSheetData({ ...sheetData, [f.key]: e.target.value })
                }
              />
            )}
          </label>
        ))}
        <textarea
          className="min-h-24 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Biografía / notas libres"
        />
        <textarea
          className="min-h-20 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          placeholder="Notas privadas"
        />
        <button
          type="button"
          disabled={saving}
          onClick={saveCharacter}
          className="w-full rounded-lg bg-[var(--color-gold)] py-2.5 font-semibold text-[var(--color-ink)]"
        >
          {saving ? "Guardando…" : "Guardar personaje"}
        </button>
        {msg && <StatusMessage message={msg} variant={msgError ? "error" : "success"} />}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg text-[var(--color-gold)]">Resumen de campaña</h2>
        <SummaryBlock text={hub.campaignSummary} />
        <AudioBlock url={hub.campaignAudioUrl} label="Audio de campaña" />
      </section>

      {hub.wiki && hub.wiki.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Wiki (solo lectura)</h2>
          {hub.wiki.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-3"
            >
              <p className="font-medium text-sm">
                {WIKI_TYPE_LABELS[w.type]}: {w.title}
              </p>
              <p className="text-sm text-[var(--color-mist)] mt-1">{w.body}</p>
            </div>
          ))}
        </section>
      )}

      {hub.playSessions && hub.playSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg text-[var(--color-gold)]">Sesiones publicadas</h2>
          {hub.playSessions.map((ps) => (
            <div
              key={ps.id}
              className="rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-3"
            >
              <p className="font-medium">{ps.title}</p>
              <SummaryBlock text={ps.summary} />
              {ps.audioUrl && <AudioBlock url={ps.audioUrl} label="" />}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ObserverHub({ hub }: { hub: HubView }) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--color-mist)] text-center">
        Modo oyente — solo resúmenes y audio publicados
      </p>
      <section className="space-y-2">
        <h2 className="font-display text-lg text-[var(--color-gold)]">{hub.campaignTitle}</h2>
        <SummaryBlock text={hub.campaignSummary} />
        <AudioBlock url={hub.campaignAudioUrl} label="Audiolibro de campaña" />
      </section>
      {hub.playSessions?.map((ps) => (
        <section key={ps.id} className="space-y-2">
          <h3 className="font-display text-[var(--color-parchment)]">{ps.title}</h3>
          <SummaryBlock text={ps.summary} />
          <AudioBlock url={ps.audioUrl} label="Audio de sesión" />
        </section>
      ))}
    </div>
  );
}

export function HubPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hub, setHub] = useState<HubView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);

  const stored = code ? loadStoredSessionForCode(code) : null;
  const participantId = stored?.participantId;

  const load = useCallback(async () => {
    if (!code) return;

    let activeParticipantId = participantId;

    if (user) {
      try {
        const result = await rejoinCampaign(code);
        if (result.ok && result.you && result.session) {
          const p = result.session.participants.find((x) => x.id === result.you!.participantId);
          activeParticipantId = result.you.participantId;
          saveStoredSession({
            sessionId: result.session.id,
            code: result.session.code,
            participantId: result.you.participantId,
            role: result.you.role,
            name: p?.name ?? user.displayName,
          });
        }
      } catch {
        /* usar participantId guardado */
      }
    }

    if (!activeParticipantId) {
      setHub(null);
      return;
    }

    try {
      const data = await fetchHub(code, activeParticipantId);
      setHub(data);
      setError(null);
    } catch (e) {
      setHub(null);
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, [code, participantId, user]);

  useEffect(() => {
    if (!code || participantId) {
      load();
      return;
    }
    if (!user) return;

    let cancelled = false;
    setRejoining(true);
    rejoinCampaign(code)
      .then((result) => {
        if (cancelled || !result.ok || !result.you || !result.session) return;
        const p = result.session.participants.find((x) => x.id === result.you!.participantId);
        saveStoredSession({
          sessionId: result.session.id,
          code: result.session.code,
          participantId: result.you.participantId,
          role: result.you.role,
          name: p?.name ?? user.displayName,
        });
        navigate(`/hub/${code}`, { replace: true });
      })
      .catch(() => {
        if (!cancelled) setRejoining(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, participantId, user, navigate]);

  useEffect(() => {
    if (!participantId) return;
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load, participantId]);

  async function handleLeave() {
    if (stored && code) {
      try {
        await leaveSession(code, stored.participantId);
      } catch {
        /* desconexión local aunque falle red */
      }
    }
    clearStoredSession();
    window.location.href = "/";
  }

  if (!code) {
    return <p className="text-center text-red-300">Código inválido</p>;
  }

  if (!participantId) {
    if (rejoining) {
      return (
        <p className="text-center text-[var(--color-mist)]">Reconectando a la campaña…</p>
      );
    }
    return (
      <div className="space-y-4 text-center">
        <p>No estás conectado a esta mesa ({code}).</p>
        <Link to={`/unirse`} className="text-[var(--color-gold)]">
          Unirse con código
        </Link>
        {user && (
          <Link to="/" className="block text-sm text-[var(--color-mist)]">
            Mis campañas
          </Link>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-300">{error}</p>
        {user ? (
          <Link to="/" className="inline-block text-[var(--color-gold)]">
            Ir a Mis campañas para reingresar
          </Link>
        ) : (
          <>
            <Link to="/login" className="block text-[var(--color-gold)]">
              Iniciar sesión
            </Link>
            <Link to="/" className="block text-sm text-[var(--color-mist)]">
              Inicio
            </Link>
          </>
        )}
      </div>
    );
  }

  const displayStored = code ? loadStoredSessionForCode(code) : stored;
  const effectiveRole = hub?.role ?? displayStored?.role;

  if (!hub) {
    return <p className="text-center text-[var(--color-mist)]">Cargando hub…</p>;
  }

  const hubForUi: HubView = {
    ...hub,
    role: effectiveRole ?? hub.role,
    participantId: hub.participantId || displayStored?.participantId || "",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-mist)]">Código {hub.code}</p>
          <h1 className="font-display text-2xl text-[var(--color-gold)]">{hub.campaignTitle}</h1>
          <p className="text-sm text-[var(--color-mist)]">
            Tú: {displayStored?.name ?? "—"} ·{" "}
            {effectiveRole ? ROLE_LABELS[effectiveRole] : "…"}
            {hub.isOwner && " · Dueño"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          className="rounded-lg border border-[var(--color-slate-border)] px-4 py-2 text-sm"
          title="Te desconectas pero conservas tu rol si eres dueño o jugador"
        >
          Desconectar
        </button>
      </div>

      {!effectiveRole && (
        <div className="space-y-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm">
          <p className="text-red-200">
            No se pudo cargar tu rol en la campaña. Pulsa Reintentar o vuelve a entrar desde Mis campañas.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[var(--color-gold)] hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}
      {effectiveRole === "master" && <MasterHub hub={hubForUi} onRefresh={load} />}
      {effectiveRole === "player" && <PlayerHub hub={hubForUi} onRefresh={load} />}
      {effectiveRole === "observer" && <ObserverHub hub={hubForUi} />}
    </div>
  );
}
