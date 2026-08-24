import { useState, useEffect, useCallback } from "react";
import type React from "react";
import cmsService from "../../services/cmsService";
import type { SuccessStoryRecord, ContentStatus } from "../../types/cms";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaPaperPlane,
  FaStar,
  FaSpinner,
  FaUpload,
  FaImage,
} from "react-icons/fa";

const getErrorMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const r = err as { response?: { data?: { detail?: unknown; message?: unknown } } };
    const detail = r?.response?.data?.detail ?? r?.response?.data?.message;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
};

const CmsSuccessStoriesView = () => {
  const { addToast } = useToast();

  const [stories, setStories] = useState<SuccessStoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingStory, setEditingStory] = useState<SuccessStoryRecord | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    body: "",
    hero_image_url: "",
    dog_id: "",
    is_featured: false,
    sort_order: 0,
    status: "draft" as ContentStatus,
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, unknown> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await cmsService.getSuccessStories(params);
      setStories(Array.isArray(res.items) ? res.items : []);
    } catch (err: unknown) {
      setError(getErrorMsg(err, "Failed to load success stories from backend API."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingStory(null);
    setForm({
      title: "",
      slug: "",
      summary: "",
      body: "",
      hero_image_url: "",
      dog_id: "",
      is_featured: false,
      sort_order: 0,
      status: "draft",
    });
    setModalOpen(true);
  };

  const openEditModal = (story: SuccessStoryRecord) => {
    setModalMode("edit");
    setEditingStory(story);
    setForm({
      title: story.title || "",
      slug: story.slug || "",
      summary: story.summary || "",
      body: story.body || "",
      hero_image_url: story.hero_image_url || "",
      dog_id: story.dog_id || "",
      is_featured: story.is_featured ?? false,
      sort_order: story.sort_order ?? 0,
      status: story.status || "draft",
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

      // Directly put bytes to upload_url or use object_key
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
        hero_image_url: res.object_key || res.upload_url,
      }));
      addToast("Image uploaded successfully!", "success");
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to upload media file."), "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
      addToast("Title, Summary, and Body are required fields.", "error");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await cmsService.createSuccessStory({
          title: form.title.trim(),
          slug: form.slug.trim() || undefined,
          summary: form.summary.trim(),
          body: form.body.trim(),
          hero_image_url: form.hero_image_url.trim() || null,
          dog_id: form.dog_id.trim() || null,
          is_featured: form.is_featured,
          sort_order: form.sort_order,
          status: form.status,
        });
        addToast(`Success story "${form.title}" created.`, "success");
      } else if (editingStory) {
        await cmsService.updateSuccessStory(editingStory.id, {
          title: form.title.trim(),
          slug: form.slug.trim() || undefined,
          summary: form.summary.trim(),
          body: form.body.trim(),
          hero_image_url: form.hero_image_url.trim() || null,
          dog_id: form.dog_id.trim() || null,
          is_featured: form.is_featured,
          sort_order: form.sort_order,
          status: form.status,
        });
        addToast(`Updated story "${form.title}".`, "success");
      }
      setModalOpen(false);
      await fetchStories();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to save success story."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (story: SuccessStoryRecord) => {
    try {
      await cmsService.publishSuccessStory(story.id);
      addToast(`Published success story "${story.title}".`, "success");
      await fetchStories();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to publish story."), "error");
    }
  };

  const handleDelete = async (story: SuccessStoryRecord) => {
    if (!window.confirm(`Delete success story "${story.title}" permanently?`)) return;
    try {
      await cmsService.deleteSuccessStory(story.id);
      addToast(`Deleted story "${story.title}".`, "success");
      await fetchStories();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to delete story."), "error");
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
      {/* Header Toolbar */}
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
            Success Stories
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Manage inspirational adoption and rescue stories showcased on the public platform.
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
          <FaPlus /> New Story
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
            placeholder="Search stories by title or text..."
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

      {/* Stories Table */}
      <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Story Title</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Featured</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Status</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Created</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#475569", fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#2563EB" }}>
                  <FaSpinner className="spin" size={18} /> Loading stories...
                </td>
              </tr>
            ) : stories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                  No success stories found matching your filter criteria.
                </td>
              </tr>
            ) : (
              stories.map((story) => (
                <tr key={story.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px", color: "#0F172A", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {story.hero_image_url ? (
                        <img
                          src={story.hero_image_url}
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
                          <FaImage />
                        </div>
                      )}
                      <div>
                        <div>{story.title}</div>
                        <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 400 }}>
                          {story.summary.slice(0, 60)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {story.is_featured ? (
                      <span style={{ color: "#F59E0B", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12 }}>
                        <FaStar /> Featured
                      </span>
                    ) : (
                      <span style={{ color: "#94A3B8", fontSize: 12 }}>Standard</span>
                    )}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background:
                          story.status === "published"
                            ? "#ECFDF5"
                            : story.status === "draft"
                            ? "#FEF3C7"
                            : "#F1F5F9",
                        color:
                          story.status === "published"
                            ? "#059669"
                            : story.status === "draft"
                            ? "#D97706"
                            : "#475569",
                      }}
                    >
                      {story.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "#64748B", fontSize: 12 }}>
                    {new Date(story.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      {story.status !== "published" && (
                        <button
                          onClick={() => handlePublish(story)}
                          title="Publish story"
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
                        onClick={() => openEditModal(story)}
                        title="Edit story"
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
                        onClick={() => handleDelete(story)}
                        title="Delete story"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "create" ? "Create New Success Story" : `Edit Story — ${editingStory?.title}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Story Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. From Stray to Star: Barnaby's Journey"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Summary Excerpt *
            </label>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Short 1-2 sentence overview for cards..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Full Story Content *
            </label>
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Detailed narrative of rescue, treatment, foster care, and home placement..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Hero Image URL
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={form.hero_image_url}
                onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                />
                Feature on Homepage
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
              {submitting ? "Saving..." : "Save Story"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CmsSuccessStoriesView;
