import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  startDirectConversation,
  type Conversation,
  type Message,
  type MessagingParticipant,
} from '../services/messagingService';
import { listDirectory, type CurrentUser } from '../services/userService';
import Modal from '../components/ui/Modal';

const FILTERS = ['Tout', 'Non lus', 'Groupes'];
const POLL_INTERVAL_MS = 4_000;

// Motif de fond très discret, à la façon du papier peint de WhatsApp Web —
// encodé en ligne pour rester autonome (aucune requête externe).
const CHAT_BACKGROUND_PATTERN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='6' cy='6' r='1' fill='%23000000' fill-opacity='0.045'/%3E%3Ccircle cx='34' cy='18' r='1' fill='%23000000' fill-opacity='0.045'/%3E%3Ccircle cx='50' cy='46' r='1' fill='%23000000' fill-opacity='0.045'/%3E%3Ccircle cx='16' cy='40' r='1' fill='%23000000' fill-opacity='0.045'/%3E%3Ccircle cx='44' cy='4' r='1' fill='%23000000' fill-opacity='0.045'/%3E%3C/svg%3E";

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yesterday)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function lastMessagePreview(conversation: Conversation): string {
  const message = conversation.last_message;
  if (!message) return conversation.kind === 'GROUP' ? 'Aucun message pour le moment' : 'Démarrez la conversation';
  if (message.text) return message.text;
  if (message.attachment) return '📎 Document';
  return '';
}

function attachmentName(url: string): string {
  try {
    return decodeURIComponent(url.split('/').pop() ?? url);
  } catch {
    return url;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Met en évidence les mentions `@Prénom Nom` correspondant à un participant
 * du groupe — comparaison sur le texte brut, aucun modèle dédié côté serveur
 * (`Message.text` reste un simple champ texte). */
function renderMessageText(text: string, participants: MessagingParticipant[]): ReactNode {
  const names = participants
    .map((p) => `${p.first_name} ${p.last_name}`.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (names.length === 0) return text;
  const pattern = new RegExp(`@(${names.join('|')})`, 'g');
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <span className="font-semibold text-[#0a84c7]" key={index}>
        @{part}
      </span>
    ) : (
      part
    ),
  );
}

export default function MessageriePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const meLabel = user ? `${user.first_name} ${user.last_name}`.trim() : 'Moi';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [activeFilter, setActiveFilter] = useState('Tout');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const draftInputRef = useRef<HTMLInputElement>(null);

  // Mentions "@" façon WhatsApp — uniquement dans les groupes. `mentionStart`
  // est l'index du "@" dans `draft`, `mentionQuery` ce qui a été tapé après.
  // `null` == menu fermé.
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionHighlight, setMentionHighlight] = useState(0);

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [colleagues, setColleagues] = useState<CurrentUser[]>([]);
  const [newChatSearch, setNewChatSearch] = useState('');

  function refreshConversations() {
    return listConversations().then((data) => {
      // La conversation actuellement ouverte est considérée lue en
      // permanence côté UI, même si le serveur n'a pas encore vu le dernier
      // `mark-read` — évite un badge qui clignote pendant le polling.
      setConversations(data.map((c) => (c.id === activeId ? { ...c, unread_count: 0 } : c)));
      return data;
    });
  }

  useEffect(() => {
    setIsLoadingConversations(true);
    const requestedId = Number(searchParams.get('conversation'));
    refreshConversations()
      .then((data) => {
        const target = data.find((c) => c.id === requestedId) ?? data[0];
        if (target) selectConversation(target.id);
      })
      .finally(() => setIsLoadingConversations(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pas de WebSocket dans cette version — on rafraîchit périodiquement la
  // liste des conversations et le fil ouvert. Passera à un vrai push (Django
  // Channels) dans une v2 si besoin.
  useEffect(() => {
    const timer = setInterval(refreshConversations, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const timer = setInterval(() => {
      listMessages(activeId).then((data) => {
        setMessages((prev) => (prev.length === data.length && prev.at(-1)?.id === data.at(-1)?.id ? prev : data));
        markConversationRead(activeId).then(() => {
          setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread_count: 0 } : c)));
        });
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [activeId]);

  function selectConversation(id: number) {
    setActiveId(id);
    setIsLoadingMessages(true);
    setDraft('');
    closeMentionMenu();
    listMessages(id)
      .then(setMessages)
      .finally(() => setIsLoadingMessages(false));
    markConversationRead(id).then(() => {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
    });
  }

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  function closeMentionMenu() {
    setMentionStart(null);
    setMentionQuery(null);
    setMentionHighlight(0);
  }

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null || !activeConversation || activeConversation.kind !== 'GROUP') return [];
    const query = mentionQuery.toLowerCase();
    return activeConversation.participants
      .filter((p) => p.id !== user?.id)
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [mentionQuery, activeConversation, user]);

  function handleDraftChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    const cursor = event.target.selectionStart ?? value.length;
    setDraft(value);

    if (activeConversation?.kind === 'GROUP') {
      const atIndex = value.lastIndexOf('@', cursor - 1);
      const precededByBoundary = atIndex === 0 || (atIndex > 0 && /\s/.test(value[atIndex - 1]));
      if (atIndex !== -1 && precededByBoundary) {
        const fragment = value.slice(atIndex + 1, cursor);
        const stillMatches =
          fragment.trim() === '' ||
          activeConversation.participants.some((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(fragment.toLowerCase()));
        if (!fragment.includes('\n') && !fragment.includes('@') && fragment.length <= 40 && stillMatches) {
          setMentionStart(atIndex);
          setMentionQuery(fragment);
          setMentionHighlight(0);
          return;
        }
      }
    }
    closeMentionMenu();
  }

  function selectMention(participant: MessagingParticipant) {
    if (mentionStart === null) return;
    const cursor = draftInputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, mentionStart);
    const after = draft.slice(cursor);
    const mentionText = `@${participant.first_name} ${participant.last_name} `;
    setDraft(`${before}${mentionText}${after}`);
    closeMentionMenu();
    requestAnimationFrame(() => {
      const el = draftInputRef.current;
      if (!el) return;
      const pos = before.length + mentionText.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (mentionCandidates.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionHighlight((prev) => (prev + 1) % mentionCandidates.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionHighlight((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectMention(mentionCandidates[mentionHighlight]);
    } else if (event.key === 'Escape') {
      closeMentionMenu();
    }
  }

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations
      .filter((c) => !query || c.display_name.toLowerCase().includes(query))
      .filter((c) => {
        if (activeFilter === 'Non lus') return c.unread_count > 0;
        if (activeFilter === 'Groupes') return c.kind === 'GROUP';
        return true;
      });
  }, [conversations, search, activeFilter]);

  const dayGroups = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    for (const message of messages) {
      const label = formatDayLabel(message.created_at);
      const last = groups.at(-1);
      if (last && last.label === label) last.items.push(message);
      else groups.push({ label, items: [message] });
    }
    return groups;
  }, [messages]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversation || isSending) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;
    closeMentionMenu();
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('conversation', String(activeConversation.id));
      formData.append('text', text);
      if (pendingFile) formData.append('attachment', pendingFile);
      const created = await sendMessage(formData);
      setMessages((prev) => [...prev, created]);
      setDraft('');
      setPendingFile(null);
      refreshConversations();
    } finally {
      setIsSending(false);
    }
  }

  function openNewChat() {
    setIsNewChatOpen(true);
    setNewChatSearch('');
    if (colleagues.length === 0) {
      listDirectory().then(setColleagues);
    }
  }

  async function handleStartChat(colleague: CurrentUser) {
    const conversation = await startDirectConversation(colleague.id);
    setConversations((prev) => (prev.some((c) => c.id === conversation.id) ? prev : [conversation, ...prev]));
    setIsNewChatOpen(false);
    selectConversation(conversation.id);
  }

  const filteredColleagues = colleagues.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(newChatSearch.trim().toLowerCase()),
  );

  if (isLoadingConversations) {
    return <p className="font-body-sm text-body-sm text-secondary p-6">Chargement de la messagerie...</p>;
  }

  return (
    <div className="-m-6 md:-m-8 h-[calc(100vh-64px)] flex overflow-hidden bg-white">
      {/* Colonne gauche — liste des conversations */}
      <div className="w-[360px] shrink-0 bg-white border-r border-black/10 flex flex-col">
        <div className="h-16 shrink-0 flex items-center justify-between px-4 bg-[#f0f2f5] border-b border-black/5">
          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            {user?.profile_picture ? (
              <img alt={meLabel} className="w-full h-full object-cover" src={user.profile_picture} />
            ) : (
              getInitials(meLabel)
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 transition-colors"
              onClick={openNewChat}
              title="Nouvelle discussion"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">chat_add_on</span>
            </button>
          </div>
        </div>

        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-[#54656f]">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              className="w-full bg-[#f0f2f5] rounded-lg py-[7px] pl-10 pr-3 text-sm text-on-surface placeholder:text-[#667781] focus:outline-none transition-all"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une discussion"
              type="text"
              value={search}
            />
          </div>
        </div>

        <div className="px-3 pb-2 flex items-center gap-2 shrink-0">
          {FILTERS.map((filter) => (
            <button
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeFilter === filter ? 'bg-[#d9fdd3] text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-black/5'
              }`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.map((conversation) => {
            const isActive = activeConversation?.id === conversation.id;
            const avatarUrl = conversation.kind === 'DIRECT' ? conversation.other_participant?.profile_picture : null;
            return (
              <button
                className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-black/[0.03] transition-colors ${
                  isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                }`}
                key={conversation.id}
                onClick={() => selectConversation(conversation.id)}
                type="button"
              >
                {conversation.kind === 'GROUP' ? (
                  <div className="w-12 h-12 rounded-full bg-[#dfe5e7] text-[#54656f] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">tag</span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img alt={conversation.display_name} className="w-full h-full object-cover" src={avatarUrl} />
                    ) : (
                      getInitials(conversation.display_name)
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-on-surface truncate">{conversation.display_name}</p>
                    {conversation.last_message && (
                      <span className={`text-[11px] shrink-0 ${conversation.unread_count > 0 ? 'text-[#008069] font-bold' : 'text-[#667781]'}`}>
                        {formatTime(conversation.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[13px] text-[#667781] truncate">
                      {conversation.last_message?.sender === user?.id && (
                        <span className="material-symbols-outlined text-[15px] align-text-bottom text-[#53bdeb]">done_all</span>
                      )}
                      {lastMessagePreview(conversation)}
                    </p>
                    {conversation.unread_count > 0 && (
                      <span className="min-w-[19px] h-[19px] px-1 flex items-center justify-center bg-[#008069] text-white text-[10px] font-bold rounded-full shrink-0">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredConversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-secondary">Aucune conversation ne correspond.</p>
          )}
        </div>
      </div>

      {/* Fil de discussion */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 shrink-0 flex items-center gap-3 px-4 bg-[#f0f2f5] border-b border-black/5">
            {activeConversation.kind === 'GROUP' ? (
              <div className="w-10 h-10 rounded-full bg-[#dfe5e7] text-[#54656f] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">tag</span>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                {activeConversation.other_participant?.profile_picture ? (
                  <img
                    alt={activeConversation.display_name}
                    className="w-full h-full object-cover"
                    src={activeConversation.other_participant.profile_picture}
                  />
                ) : (
                  getInitials(activeConversation.display_name)
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface truncate">{activeConversation.display_name}</p>
              <p className="text-[12px] text-[#667781] truncate">
                {activeConversation.kind === 'GROUP'
                  ? `${activeConversation.participants.length} membres`
                  : activeConversation.other_participant?.email}
              </p>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-16 py-4"
            style={{ backgroundColor: '#eae6df', backgroundImage: `url("${CHAT_BACKGROUND_PATTERN}")` }}
          >
            {isLoadingMessages ? (
              <p className="text-center text-xs text-secondary">Chargement...</p>
            ) : (
              <div className="max-w-3xl mx-auto">
                {dayGroups.map((group) => (
                  <div key={group.label}>
                    <div className="flex justify-center mb-3 mt-1">
                      <span className="bg-white/90 text-[#54656f] text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                        {group.label}
                      </span>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {group.items.map((message) => {
                        const fromMe = message.sender === user?.id;
                        return (
                          <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`} key={message.id}>
                            <div className={`max-w-[65%] flex flex-col ${fromMe ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`px-2.5 py-1.5 shadow-sm text-sm leading-relaxed ${
                                  fromMe ? 'bg-[#d9fdd3] text-on-surface rounded-lg rounded-tr-none' : 'bg-white text-on-surface rounded-lg rounded-tl-none'
                                }`}
                              >
                                {!fromMe && activeConversation.kind === 'GROUP' && (
                                  <p className="text-[12.5px] font-bold text-primary mb-0.5">{message.sender_name}</p>
                                )}
                                {message.attachment && (
                                  <a
                                    className="flex items-center gap-2 bg-black/5 rounded-lg px-2.5 py-2 mb-1 hover:bg-black/10 transition-colors"
                                    href={message.attachment}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">description</span>
                                    <span className="text-xs font-medium truncate">{attachmentName(message.attachment)}</span>
                                  </a>
                                )}
                                {message.text && (
                                  <span>
                                    {activeConversation.kind === 'GROUP'
                                      ? renderMessageText(message.text, activeConversation.participants)
                                      : message.text}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-0.5 float-right ml-2 mt-1 translate-y-1">
                                  <span className="text-[10.5px] text-[#667781]">{formatTime(message.created_at)}</span>
                                  {fromMe && <span className="material-symbols-outlined text-[15px] text-[#53bdeb]">done_all</span>}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-xs text-[#667781] mt-8">Aucun message pour le moment — lancez la discussion.</p>
                )}
              </div>
            )}
          </div>

          <form className="relative flex items-center gap-2 px-4 py-2.5 bg-[#f0f2f5] border-t border-black/5 shrink-0" onSubmit={handleSend}>
            {mentionCandidates.length > 0 && (
              <div className="absolute left-16 right-4 bottom-full mb-2 z-20 bg-white border border-outline-variant rounded-lg shadow-lg py-1.5 max-h-56 overflow-y-auto">
                {mentionCandidates.map((participant, index) => (
                  <button
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      index === mentionHighlight ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                    }`}
                    key={participant.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectMention(participant);
                    }}
                    onMouseEnter={() => setMentionHighlight(index)}
                    type="button"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {participant.profile_picture ? (
                        <img alt="" className="w-full h-full object-cover" src={participant.profile_picture} />
                      ) : (
                        getInitials(`${participant.first_name} ${participant.last_name}`)
                      )}
                    </div>
                    <span className="text-sm font-semibold text-on-surface truncate">
                      {participant.first_name} {participant.last_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <label
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
              title="Joindre un document"
            >
              <span className="material-symbols-outlined text-[22px]">attach_file</span>
              <input className="hidden" onChange={(event) => setPendingFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            <div className="flex-1 min-w-0">
              {pendingFile && (
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 mb-1.5 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[15px] text-primary shrink-0">description</span>
                  <span className="truncate flex-1">{pendingFile.name}</span>
                  <button className="text-secondary hover:text-error transition-colors shrink-0" onClick={() => setPendingFile(null)} type="button">
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </div>
              )}
              <input
                className="w-full bg-white rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-all"
                onBlur={() => setTimeout(closeMentionMenu, 100)}
                onChange={handleDraftChange}
                onKeyDown={handleDraftKeyDown}
                placeholder="Tapez un message"
                ref={draftInputRef}
                type="text"
                value={draft}
              />
            </div>
            <button
              className="w-10 h-10 shrink-0 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#017561] transition-colors disabled:opacity-40"
              disabled={(!draft.trim() && !pendingFile) || isSending}
              type="submit"
            >
              <span className="material-symbols-outlined text-[19px]">send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-secondary text-sm">
          Sélectionnez une discussion pour commencer.
        </div>
      )}

      <Modal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} title="Nouvelle discussion">
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-outline">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              autoFocus
              className="w-full bg-surface-container border border-outline-variant rounded py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-primary-container transition-all"
              onChange={(event) => setNewChatSearch(event.target.value)}
              placeholder="Rechercher un collègue..."
              type="text"
              value={newChatSearch}
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredColleagues.map((colleague) => (
              <button
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-container-low transition-colors text-left"
                key={colleague.id}
                onClick={() => handleStartChat(colleague)}
                type="button"
              >
                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                  {colleague.profile_picture ? (
                    <img alt="" className="w-full h-full object-cover" src={colleague.profile_picture} />
                  ) : (
                    getInitials(`${colleague.first_name} ${colleague.last_name}`)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {colleague.first_name} {colleague.last_name}
                  </p>
                  <p className="text-xs text-secondary truncate">{colleague.role_display}</p>
                </div>
              </button>
            ))}
            {filteredColleagues.length === 0 && (
              <p className="py-6 text-center text-xs text-secondary">Aucun collègue ne correspond.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
