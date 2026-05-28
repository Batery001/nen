import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchHub, leaveSession, resolveJoinRequest, updateCharacter, updateHub } from "../api";
import { loadStoredSession, clearStoredSession } from "../hooks/useSessionStorage";
import {
  ROLE_LABELS,
  WIKI_TYPE_LABELS,
  type HubView,
  type PlaySessionRecord,
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [newWikiTitle, setNewWikiTitle] = useState("");
  const [newWikiBody, setNewWikiBody] = useState("");
  const [newWikiType, setNewWikiType] = useState<WikiEntryType>("note");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleJoinRequest(requestId: string, action: "approve" | "reject") {
    setResolvingId(requestId);
    try {
      await resolveJoinRequest(hub.code, hub.participantId, requestId, action);
      onRefresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al procesar solicitud");
    } finally {
      setResolvingId(null);
    }
  }

  async function saveCampaign() {
    setSaving(true);
    setMsg(null);
    try {
      await updateHub(hub.code, hub.participantId, {
        campaignTitle: title,
        campaignSummary: summary,
        campaignAudioUrl: audioUrl,
        wiki,
        playSessions,
      });
      setMsg("Guardado");
      onRefresh();
    } catch (e) {
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

  return (
    <div className="space-y-8">
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
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg text-[var(--color-gold)]">Wiki</h2>
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
        {playSessions.map((ps, i) => (
          <PlaySessionEditor
            key={ps.id}
            session={ps}
            onChange={(next) =>
              setPlaySessions(playSessions.map((p, j) => (j === i ? next : p)))
            }
          />
        ))}
      </section>

      <section>
        <h2 className="font-display text-lg text-[var(--color-gold)] mb-2">Mesa</h2>
        <ul className="text-sm space-y-1">
          {hub.participants?.map((p) => (
            <li key={p.id}>
              {p.name} — {ROLE_LABELS[p.role]}
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
      {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}

function PlaySessionEditor({
  session,
  onChange,
}: {
  session: PlaySessionRecord;
  onChange: (s: PlaySessionRecord) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-slate-border)] bg-[var(--color-slate-panel)] p-3 space-y-2">
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
        placeholder="URL audio sesión"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={session.published}
          onChange={(e) => onChange({ ...session, published: e.target.checked })}
        />
        Publicado (visible para jugadores y observadores)
      </label>
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
  const c = hub.myCharacter!;
  const [characterName, setCharacterName] = useState(c.characterName);
  const [bio, setBio] = useState(c.bio);
  const [privateNotes, setPrivateNotes] = useState(c.privateNotes);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveCharacter() {
    setSaving(true);
    try {
      await updateCharacter(hub.code, hub.participantId, {
        characterName,
        bio,
        privateNotes,
      });
      setMsg("Personaje guardado");
      onRefresh();
    } catch (e) {
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
        <textarea
          className="min-h-24 w-full rounded-lg border border-[var(--color-slate-border)] bg-[#121018] px-3 py-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Biografía / ficha pública"
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
        {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
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
  const [hub, setHub] = useState<HubView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stored = loadStoredSession();

  const load = useCallback(async () => {
    if (!code || !stored) return;
    try {
      const data = await fetchHub(code, stored.participantId);
      setHub(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, [code, stored]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLeave() {
    if (stored && code) {
      try {
        await leaveSession(code, stored.participantId);
      } catch {
        /* ignore */
      }
    }
    clearStoredSession();
    window.location.href = "/";
  }

  if (!stored) {
    return (
      <div className="text-center">
        <p>No estás conectado a esta mesa.</p>
        <Link to="/unirse" className="text-[var(--color-gold)]">
          Unirse
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-300">{error}</p>
        <Link to="/" className="mt-4 inline-block text-[var(--color-gold)]">
          Inicio
        </Link>
      </div>
    );
  }

  if (!hub) {
    return <p className="text-center text-[var(--color-mist)]">Cargando hub…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-mist)]">Código {hub.code}</p>
          <h1 className="font-display text-2xl text-[var(--color-gold)]">{hub.campaignTitle}</h1>
          <p className="text-sm text-[var(--color-mist)]">
            Tú: {stored.name} · {ROLE_LABELS[hub.role]}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          className="rounded-lg border border-[var(--color-slate-border)] px-4 py-2 text-sm"
        >
          Salir
        </button>
      </div>

      {hub.role === "master" && <MasterHub hub={hub} onRefresh={load} />}
      {hub.role === "player" && <PlayerHub hub={hub} onRefresh={load} />}
      {hub.role === "observer" && <ObserverHub hub={hub} />}
    </div>
  );
}
