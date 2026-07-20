import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Heart, HeartFill, ChatDots } from "react-bootstrap-icons";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggle from "../components/ThemeToggle";

const SUGGESTED_TAGS = [
  "react",
  "supabase",
  "career",
  "ai",
  "webdev",
  "javascript",
];

function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [following, setFollowing] = useState([]);

  // Loads: who's logged in -> who they already follow -> a list of other users to suggest -> all posts
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Who am I already following?
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = followData?.map((f) => f.following_id) || [];
        setFollowing(followingIds);

        // Pull other real users from the database (this always reflects
        // whoever has signed up, including brand new accounts)
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, username, bio")
          .neq("id", user.id)
          .limit(10);

        setSuggestedUsers(allProfiles || []);
      }

      await fetchPosts();
      setLoading(false);
    };
    init();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id, content, type, media_url, media_type, tags, created_at,
        profiles ( username, avatar_url ),
        likes ( id, user_id ),
        comments ( id, content, created_at, profiles ( username ) )
      `,
      )
      .order("created_at", { ascending: false });

    if (!error) setPosts(data);
  };

  const toggleLike = async (post) => {
    if (!user) return;
    const alreadyLiked = post.likes.some((l) => l.user_id === user.id);
    if (alreadyLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: user.id });
    }
    fetchPosts();
  };

  // Follow / unfollow — the person stays visible in the list either way,
  // only the button label/style changes to reflect the current state
  const toggleFollow = async (targetUserId) => {
    if (!user || targetUserId === user.id) return;

    const isFollowing = following.includes(targetUserId);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowing(following.filter((id) => id !== targetUserId));
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetUserId });
      setFollowing([...following, targetUserId]);
    }
  };

  const tagsInUse = [...new Set(posts.flatMap((p) => p.tags || []))];
  const tagsToShow = tagsInUse.length > 0 ? tagsInUse : SUGGESTED_TAGS;

  const filteredPosts = posts.filter((p) => {
    const matchesTag = activeTag ? p.tags?.includes(activeTag) : true;

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term
      ? p.content?.toLowerCase().includes(term) ||
        p.profiles?.username?.toLowerCase().includes(term)
      : true;

    return matchesTag && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Title + mobile theme toggle */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Explore</h1>
          <ThemeToggle className="lg:hidden" />
        </div>

        {/* Who to Follow */}
        {user && suggestedUsers.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-xl mb-6 overflow-hidden">
            <h2 className="font-bold px-4 pt-4 pb-2">Who to follow</h2>
            <div className="flex flex-col">
              {suggestedUsers.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg)]/40 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-[#7C6FF0] flex items-center justify-center font-bold text-white shrink-0">
                    {person.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{person.username}</p>
                    {person.bio && (
                      <p className="text-[var(--color-muted)] text-xs truncate">
                        {person.bio}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleFollow(person.id)}
                    className={`text-sm font-semibold px-4 py-1.5 rounded-full transition shrink-0 border ${
                      following.includes(person.id)
                        ? "border-[var(--color-border)] text-[var(--color-muted)]"
                        : "bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)] hover:opacity-90"
                    }`}
                  >
                    {following.includes(person.id) ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-4">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search posts or people..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full pl-10 pr-4 py-2.5 outline-none focus:border-[#7C6FF0] transition"
          />
        </div>

        {/* Tag filter bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-sm border transition ${
              activeTag === null
                ? "bg-[#7C6FF0] text-white border-[#7C6FF0]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[#7C6FF0]"
            }`}
          >
            All
          </button>
          {tagsToShow.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1 rounded-full text-sm border transition ${
                activeTag === tag
                  ? "bg-[#7C6FF0] text-white border-[#7C6FF0]"
                  : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[#7C6FF0]"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Filtered feed */}
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => {
            const liked = user && post.likes.some((l) => l.user_id === user.id);

            return (
              <div
                key={post.id}
                className="bg-[var(--color-surface)] p-4 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#7C6FF0] flex items-center justify-center font-bold text-sm text-white">
                    {post.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="font-semibold">
                    {post.profiles?.username || "Unknown"}
                  </span>
                  <span className="text-[var(--color-muted)] text-sm">
                    {new Date(post.created_at).toLocaleString()}
                  </span>
                </div>

                {post.content && <p className="mb-3">{post.content}</p>}

                {post.media_url && (
                  <img
                    src={post.media_url}
                    alt="post"
                    className="rounded-lg mb-3 w-full max-h-96 object-cover"
                  />
                )}

                <div className="flex items-center gap-4 text-sm text-[var(--color-muted)] border-t border-[var(--color-border)] pt-2">
                  <button
                    onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200
                      hover:bg-red-400/10 hover:text-red-400 hover:shadow-sm
                      ${liked ? "text-red-400" : ""}`}
                  >
                    {liked ? <HeartFill size={16} /> : <Heart size={16} />}{" "}
                    {post.likes.length}
                  </button>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-[#7C6FF0]/10 hover:text-[#7C6FF0] hover:shadow-sm">
                    <ChatDots size={16} /> {post.comments.length}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredPosts.length === 0 && (
            <p className="text-[var(--color-muted)] text-center">
              No posts with #{activeTag} yet — be the first!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Explore;
