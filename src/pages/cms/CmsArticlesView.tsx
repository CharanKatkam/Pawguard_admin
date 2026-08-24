import { useState, useEffect, useCallback } from "react";
import type React from "react";
import cmsService from "../../services/cmsService";
import type { BlogPostRecord, ContentStatus } from "../../types/cms";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaPaperPlane,
  FaSpinner,
  FaUpload,
  FaNewspaper,
} from "react-icons/fa";

const getErrorMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const r = err as { response?: { data?: { detail?: unknown; message?: unknown } } };
    const detail = r?.response?.data?.detail ?? r?.response?.data?.message;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
};

const CmsArticlesView = () => {
  const { addToast } = useToast();

  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingPost, setEditingPost] = useState<BlogPostRecord | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    cover_image_url: "",
    category: "general",
    tags: "",
    author: "PawGuard Editorial",
    status: "draft" as ContentStatus,
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, unknown> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await cmsService.getBlogPosts(params);
      setPosts(Array.isArray(res.items) ? res.items : []);
    } catch (err: unknown) {
      setError(getErrorMsg(err, "Failed to load awareness articles from backend API."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingPost(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      cover_image_url: "",
      category: "general",
      tags: "",
      author: "PawGuard Editorial",
      status: "draft",
    });
    setModalOpen(true);
  };

  const openEditModal = (post: BlogPostRecord) => {
    setModalMode("edit");
    setEditingPost(post);
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      body: post.body || "",
      cover_image_url: post.cover_image_url || "",
      category: post.category || "general",
      tags: post.tags || "",
      author: post.author || "PawGuard Editorial",
      status: post.status || "draft",
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await cmsService.requestCmsMediaUploadUrl({
        filename: file.name,
        content_type: file.type || "image/jpeg",
        size_bytes: file.size,
      });

      if (res.upload_url) {
        await fetch(res.upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });
        await cmsService.confirmCmsMediaUpload(res.file_id);
      }

      setForm((prev) => ({
        ...prev,
        cover_image_url: res.object_key || res.upload_url,
      }));
      addToast("Cover image uploaded successfully!", "success");
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to upload cover media."), "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.body.trim()) {
      addToast("Title, Excerpt, and Body text are required.", "error");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await cmsService.createBlogPost({
          title: form.title.trim(),
          slug: form.slug.trim() || undefined,
          excerpt: form.excerpt.trim(),
          body: form.body.trim(),
          cover_image_url: form.cover_image_url.trim() || null,
          category: form.category.trim() || "general",
          tags: form.tags.trim() || null,
          author: form.author.trim() || null,
          status: form.status,
        });
        addToast(`Article "${form.title}" created.`, "success");
      } else if (editingPost) {
        await cmsService.updateBlogPost(editingPost.id, {
          title: form.title.trim(),
          slug: form.slug.trim() || undefined,
          excerpt: form.excerpt.trim(),
          body: form.body.trim(),
          cover_image_url: form.cover_image_url.trim() || null,
          category: form.category.trim() || "general",
          tags: form.tags.trim() || null,
          author: form.author.trim() || null,
          status: form.status,
        });
        addToast(`Updated article "${form.title}".`, "success");
      }
      setModalOpen(false);
      await fetchPosts();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to save article."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (post: BlogPostRecord) => {
    try {
      await cmsService.publishBlogPost(post.id);
      addToast(`Published article "${post.title}".`, "success");
      await fetchPosts();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to publish article."), "error");
    }
  };

  const handleDelete = async (post: BlogPostRecord) => {
    if (!window.confirm(`Delete article "${post.title}" permanently?`)) return;
    try {
      await cmsService.deleteBlogPost(post.id);
      addToast(`Deleted article "${post.title}".`, "success");
      await fetchPosts();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to delete article."), "error");
    }
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>
            Articles & Awareness Hub
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Publish educational articles, stray welfare awareness guides, and community announcements.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#2563EB",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FaPlus /> New Article
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", minWidth: 260 }}>
          <FaSearch size={12} style={{ position: "absolute", left: 10, top: 11, color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search articles by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 30px",
              borderRadius: 6,
              border: "1px solid #CBD5E1",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "7px 12px",
            borderRadius: 6,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            color: "#334155",
            fontWeight: 600,
          }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            marginBottom: "16px",
            fontSize: "13.5px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Articles Table */}
      <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Article Title</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Category</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Author</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#475569", fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#2563EB" }}>
                  <FaSpinner className="spin" size={18} /> Loading articles...
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                  No awareness articles found.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px", color: "#0F172A", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            background: "#F1F5F9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#94A3B8",
                          }}
                        >
                          <FaNewspaper />
                        </div>
                      )}
                      <div>
                        <div>{post.title}</div>
                        <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>
                          Slug: <code>{post.slug}</code>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px", color: "#334155", fontWeight: 600 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, background: "#EFF6FF", color: "#2563EB", fontSize: 11.5 }}>
                      {post.category}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "#64748B", fontSize: 12 }}>
                    {post.author || "Editorial"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background:
                          post.status === "published"
                            ? "#ECFDF5"
                            : post.status === "draft"
                            ? "#FEF3C7"
                            : "#F1F5F9",
                        color:
                          post.status === "published"
                            ? "#059669"
                            : post.status === "draft"
                            ? "#D97706"
                            : "#475569",
                      }}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      {post.status !== "published" && (
                        <button
                          onClick={() => handlePublish(post)}
                          style={{
                            padding: "5px 9px",
                            borderRadius: 6,
                            border: "none",
                            background: "#10B981",
                            color: "#FFF",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <FaPaperPlane /> Publish
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(post)}
                        style={{
                          padding: "5px 9px",
                          borderRadius: 6,
                          border: "1px solid #CBD5E1",
                          background: "#F8FAFC",
                          color: "#334155",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        style={{
                          padding: "5px 9px",
                          borderRadius: 6,
                          border: "1px solid #FCA5A5",
                          background: "#FEF2F2",
                          color: "#991B1B",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "create" ? "Create Awareness Article" : `Edit Article — ${editingPost?.title}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Article Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Essential Rabies Vaccination & Prevention Guide"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="health, adoption, safety..."
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Author
              </label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Excerpt / Summary *
            </label>
            <textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Short summary for article cards..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Full Body Content *
            </label>
            <textarea
              rows={7}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Detailed article body..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Cover Image URL
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                placeholder="https://example.com/cover.jpg"
                style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
              <label
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#F1F5F9",
                  border: "1px solid #CBD5E1",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {uploadingImage ? <FaSpinner className="spin" /> : <FaUpload />} Upload
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              style={{ padding: "9px 18px", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {submitting ? "Saving..." : "Save Article"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CmsArticlesView;
