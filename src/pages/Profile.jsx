import { useState, useEffect } from "react";
// import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Heart, ChatDots } from "react-bootstrap-icons";

function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState({});
  const navigate = useNavigate();

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      setBio(profileData?.bio || "");

      const { data: postData } = await supabase
        .from("posts")
        .select(
          `
    id, content, media_url, media_type, created_at,
    likes(id),
    comments ( id, content, created_at, profiles ( username ) )
  `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPosts(postData || []);
      setLoading(false);
    };

    init();
  }, [navigate]);

  const saveBio = async () => {
    await supabase.from("profiles").update({ bio }).eq("id", user.id);
    setProfile({ ...profile, bio });
    setEditing(false);
  };

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
        {/* Profile header */}
        <div className="bg-[var(--color-surface)] p-6 rounded-lg mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#7C6FF0] flex items-center justify-center font-bold text-2xl">
              {profile?.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.username}</h1>
              <p className="text-[var(--color-muted)] text-sm">{user?.email}</p>
            </div>
          </div>

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 outline-none focus:border-[#7C6FF0] resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveBio}
                  className="bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded px-3 py-1 text-sm font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-[var(--color-muted)] text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[var(--color-text)] mb-2 ">
                {profile?.bio || "No bio yet."}
              </p>
              <button
                onClick={() => setEditing(true)}
                className=" text-sm underline border-1 py-1 px-3 rounded-sm bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded px-4 py-2 font-semibold disabled:opacity-50 "
              >
                Edit bio
              </button>
            </div>
          )}
        </div>

        {/* User's posts */}
        <h2 className="text-lg font-semibold mb-3">Your Posts</h2>

        <div className="flex flex-col gap-4">
          {posts.map((post) => {
            const isOpen = openComments[post.id];

            return (
              <div
                key={post.id}
                className="bg-[var(--color-surface)] p-4 rounded-lg"
              >
                <p className="mb-2">{post.content}</p>
                {post.media_url && (
                  <img
                    src={post.media_url}
                    alt="post"
                    className="rounded-lg mb-2 w-full max-h-80 object-cover"
                  />
                )}
                <div className="flex gap-4 text-sm text-[var(--color-muted)] items-center">
                  <span className="flex  items-center gap-1.5">
                    <Heart size={18} /> {post.likes.length}
                  </span>
                  <button
                    onClick={() =>
                      setOpenComments({
                        ...openComments,
                        [post.id]: !openComments[post.id],
                      })
                    }
                    className="flex items-center gap-1.5 hover:text-[#7C6FF0] transition"
                  >
                    <ChatDots size={18} /> {post.comments.length}
                  </button>
                  <span className="ml-auto">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>

                {isOpen && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3 flex flex-col gap-2">
                    {post.comments.map((c) => (
                      <div key={c.id} className="text-sm">
                        <span className="font-semibold">
                          {c.profiles?.username || "Unknown"}:{" "}
                        </span>
                        <span className="text-[var(--color-text)]">
                          {c.content}
                        </span>
                      </div>
                    ))}
                    {post.comments.length === 0 && (
                      <p className="text-[var(--color-muted)] text-sm">
                        No comments yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {posts.length === 0 && (
            <p className="text-[var(--color-muted)] text-center">
              You haven't posted anything yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
