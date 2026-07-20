import { useState, useEffect, useRef } from "react";
// import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function Chat() {
  const [user, setUser] = useState(null);
  const [people, setPeople] = useState([]);
  const [activePerson, setActivePerson] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  // Loads the current user, then loads everyone who should appear in the chat list:
  // - anyone this user follows, PLUS
  // - anyone this user already has a message conversation with (even if not followed)
  // This way, if A messages B, B still sees A in their chat list even without following back.
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);

      // 1. Get everyone this user follows
      const { data: followData, error: followError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followError) {
        console.error("FETCH FOLLOWED USERS ERROR:", followError.message);
      }

      // 2. Get every message this user has sent or received, to find conversation partners
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (messageError) {
        console.error("FETCH CONVERSATIONS ERROR:", messageError.message);
      }

      // 3. Build one combined, de-duplicated list of user IDs from both sources
      const followedIds = followData?.map((f) => f.following_id) || [];

      const conversationIds =
        messageData?.map((m) =>
          m.sender_id === user.id ? m.receiver_id : m.sender_id,
        ) || [];

      const combinedIds = [...new Set([...followedIds, ...conversationIds])];

      if (combinedIds.length === 0) {
        setPeople([]);
        return;
      }

      // 4. Fetch profile info (username) for everyone in that combined list
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", combinedIds);

      if (profilesError) {
        console.error("FETCH PROFILES ERROR:", profilesError.message);
      } else {
        setPeople(profiles || []);
      }
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (!user || !activePerson) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${activePerson.id}),and(sender_id.eq.${activePerson.id},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${user.id}-${activePerson.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new;
          const isRelevant =
            (m.sender_id === user.id && m.receiver_id === activePerson.id) ||
            (m.sender_id === activePerson.id && m.receiver_id === user.id);
          if (isRelevant) setMessages((prev) => [...prev, m]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, activePerson]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activePerson) return;

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activePerson.id,
      content: text,
    });

    setText("");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] lg:h-screen bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden">
      {/* Contacts list — full width on mobile when no chat open, hidden once a chat is open */}
      <div
        className={`
          w-full lg:w-72 border-r border-[var(--color-border)] flex-col
          ${activePerson ? "hidden lg:flex" : "flex"}
        `}
      >
        <div className="p-4 font-bold text-lg border-b border-[var(--color-border)]">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePerson(p)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface)] transition text-left"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-[#7C6FF0] flex items-center justify-center font-bold text-white">
                  {p.username?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2DD4A7] border-2 border-[var(--color-bg)]" />
              </div>
              <span className="font-medium">{p.username}</span>
            </button>
          ))}
          {people.length === 0 && (
            <p className="text-[var(--color-muted)] text-sm p-4">
              No conversations yet. Follow someone from the Home feed, or wait
              for someone to message you.
            </p>
          )}
        </div>
      </div>

      {/* Conversation panel — full width on mobile when a chat is open */}
      <div
        className={`flex-1 flex-col ${activePerson ? "flex" : "hidden lg:flex"}`}
      >
        {activePerson ? (
          <>
            <div className="border-b border-[var(--color-border)] p-3 flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                onClick={() => setActivePerson(null)}
                className="lg:hidden text-xl px-1"
              >
                ←
              </button>
              <div className="w-9 h-9 rounded-full bg-[#7C6FF0] flex items-center justify-center font-bold text-white text-sm">
                {activePerson.username?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="font-semibold">{activePerson.username}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                      mine
                        ? "bg-[#7C6FF0] text-white self-end rounded-br-sm"
                        : "bg-[var(--color-surface)] self-start rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="p-3 border-t border-[var(--color-border)] flex gap-2"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-4 py-2 outline-none focus:border-[#7C6FF0]"
              />
              <button
                type="submit"
                className="bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded-full px-4 py-2 font-semibold text-white shrink-0"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-muted)]">
            Select someone to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
