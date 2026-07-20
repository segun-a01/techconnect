import { useState, useEffect } from "react";
import { Heart, HeartFill, ChatDots } from "react-bootstrap-icons";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggle from "../components/ThemeToggle";

function Home() {
  // ---------- STATE: all the "memory" this page needs to keep track of ----------
  const [posts, setPosts] = useState([]); // every post in the feed
  const [content, setContent] = useState(""); // text typed in the composer box
  const [imageFile, setImageFile] = useState(null); // the actual image file chosen
  const [imagePreview, setImagePreview] = useState(null); // temporary preview shown before posting
  const [uploading, setUploading] = useState(false); // true while a post is being submitted
  const [user, setUser] = useState(null); // the currently logged-in user (or null)
  const [loading, setLoading] = useState(true); // true while the page is first loading data
  const [commentText, setCommentText] = useState({}); // draft comment text, per post id
  const [openComments, setOpenComments] = useState({}); // which posts have their comments expanded
  const [following, setFollowing] = useState([]); // list of user IDs the current user follows

  // ---------- RUNS ONCE WHEN THE PAGE LOADS ----------
  // Loads: who's logged in -> who they follow -> all posts
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Only fetch follow data if someone is actually logged in
      if (user) {
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        setFollowing(followData?.map((f) => f.following_id) || []);
      }

      await fetchPosts();
      setLoading(false);
    };
    init();
  }, []);

  // ---------- LOAD ALL POSTS FROM THE DATABASE ----------
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id, content, type, media_url, media_type, tags, created_at, user_id,
        profiles ( username, avatar_url ),
        likes ( id, user_id ),
        comments ( id, content, created_at, profiles ( username ) )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("FETCH POSTS ERROR:", error.message);
    } else {
      setPosts(data);
    }
  };

  // ---------- WHEN SOMEONE PICKS AN IMAGE FILE ----------
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file)); // shows a live preview before posting
  };

  // ---------- CREATE A NEW POST (with optional image + auto-detected hashtags) ----------
  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;

    // Auto-detect hashtags like #react, #supabase from the post text
    const matches = content.match(/#(\w+)/g) || [];
    const tags = matches.map((t) => t.slice(1).toLowerCase());

    setUploading(true);
    let media_url = null;

    // If there's an image, upload it to Supabase Storage first
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post_image")
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError.message);
        alert("Upload failed: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post_image")
        .getPublicUrl(filePath);

      media_url = urlData.publicUrl;
    }

    // Save the post itself to the database
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content,
      media_url,
      media_type: "image",
      tags,
    });

    if (error) {
      console.error("POST ERROR:", error.message);
      alert("Post failed: " + error.message);
    } else {
      // Reset the composer back to empty after a successful post
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      fetchPosts(); // reload the feed so the new post shows up
    }

    setUploading(false);
  };

  // ---------- LIKE / UNLIKE A POST ----------
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

  // ---------- FOLLOW / UNFOLLOW ANOTHER USER ----------
  const toggleFollow = async (targetUserId) => {
    if (!user || targetUserId === user.id) return; // can't follow yourself

    const isFollowing = following.includes(targetUserId);

    if (isFollowing) {
      // Already following them -> remove the row -> unfollow
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowing(following.filter((id) => id !== targetUserId));
    } else {
      // Not following them yet -> add a new row -> follow
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetUserId });
      setFollowing([...following, targetUserId]);
    }
  };

  // ---------- POST A NEW COMMENT ----------
  const handleComment = async (postId) => {
    if (!user || !commentText[postId]?.trim()) return;
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: commentText[postId],
    });
    if (!error) {
      setCommentText({ ...commentText, [postId]: "" });
      fetchPosts();
    }
  };

  // ---------- WHILE DATA IS STILL LOADING ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // ---------- THE ACTUAL PAGE ----------
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Page title + theme switch (switch only shows on mobile, sidebar has it on desktop) */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">TechConnect Feed</h1>
          <ThemeToggle className="lg:hidden" />
        </div>

        {/* Post composer — only shown if logged in */}
        {user ? (
          <form
            onSubmit={handlePost}
            className="bg-[var(--color-surface)] p-4 rounded-lg mb-6"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are you building?"
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 outline-none focus:border-[#7C6FF0] resize-none"
              rows={3}
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                className="mt-2 rounded-lg max-h-60 object-cover"
              />
            )}

            <div className="flex items-center justify-between mt-2">
              <label className="cursor-pointer text-sm bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded px-4 py-2 font-semibold disabled:opacity-50">
                📷 Add image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded px-4 py-2 font-semibold disabled:opacity-50"
              >
                {uploading ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mb-6 text-[var(--color-muted)]">
            <a href="/login" className="text-[#7C6FF0] underline">
              Log in
            </a>{" "}
            to post something.
          </p>
        )}

        {/* The feed itself — one card per post */}
        <div className="flex flex-col gap-4">
          {posts.map((post) => {
            const liked = user && post.likes.some((l) => l.user_id === user.id);
            const isOpen = openComments[post.id];

            return (
              <div
                key={post.id}
                className="bg-[var(--color-surface)] p-4 rounded-lg"
              >
                {/* Post header: avatar, username, date, follow button */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#7C6FF0] flex items-center justify-center font-bold text-sm">
                    {post.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="font-semibold">
                    {post.profiles?.username || "Unknown"}
                  </span>
                  <span className="text-[var(--color-muted)] text-sm">
                    {new Date(post.created_at).toLocaleString()}
                  </span>

                  {/* Follow button — hidden on your own posts */}
                  {user && post.user_id !== user.id && (
                    <button
                      onClick={() => toggleFollow(post.user_id)}
                      className={`ml-auto text-xs px-3 py-1 rounded-full border transition ${
                        following.includes(post.user_id)
                          ? "border-[var(--color-border)] text-[var(--color-muted)]"
                          : "bg-[#7C6FF0] border-[#7C6FF0] text-white"
                      }`}
                    >
                      {following.includes(post.user_id)
                        ? "Following"
                        : "Follow"}
                    </button>
                  )}
                </div>

                {post.content && <p className="mb-3">{post.content}</p>}

                {post.media_url && (
                  <img
                    src={post.media_url}
                    alt="post"
                    className="rounded-lg mb-3 w-full max-h-96 object-cover"
                  />
                )}

                {/* Like + comment count row */}
                <div className="flex items-center gap-4 text-sm text-[var(--color-muted)] border-t border-[var(--color-border)] pt-2">
                  <button
                    onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 rounded-full transition-shadow duration-200 hover:bg-red-400/10 hover:text-red-400 hover:shadow-sm ${liked ? "text-red-400" : ""}`}
                  >
                    {liked ? <HeartFill size={16} /> : <Heart size={16} />}{" "}
                    {post.likes.length}
                  </button>
                  <button
                    onClick={() =>
                      setOpenComments({ ...openComments, [post.id]: !isOpen })
                    }
                    className="flex items-center gap-1.5 hover:bg-[#7C6FF0]/10 rounded-full hover:text-[#7C6FF0]"
                  >
                    <ChatDots size={16} /> {post.comments.length}
                  </button>
                </div>

                {/* Expandable comment thread */}
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

                    {user && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={commentText[post.id] || ""}
                          onChange={(e) =>
                            setCommentText({
                              ...commentText,
                              [post.id]: e.target.value,
                            })
                          }
                          placeholder="Write a comment..."
                          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm outline-none focus:border-[#7C6FF0]"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          className="bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded px-3 py-1 text-sm font-semibold"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {posts.length === 0 && (
            <p className="text-[var(--color-muted)] text-center">
              No posts yet — be the first!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
