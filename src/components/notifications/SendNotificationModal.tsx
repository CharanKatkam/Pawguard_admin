import { useState } from "react";
import Modal from "../common/Modal";
import { useToast } from "../../context/ToastContext";
import notificationService from "../../services/notificationService";
import { notifyDataChanged } from "../../utils/dataSync";

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeOptions = [
  { value: "system", label: "System" },
  { value: "emergency", label: "Emergency" },
  { value: "medical", label: "Medical" },
  { value: "adoption", label: "Adoption" },
  { value: "volunteer", label: "Volunteer" },
  { value: "finance_action", label: "Finance" },
];

const SendNotificationModal = ({ isOpen, onClose }: SendNotificationModalProps) => {
  const { addToast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("system");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      addToast("Title and message are required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await notificationService.sendBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        type,
      });
      addToast("Notification sent", "success");
      notifyDataChanged();
      setTitle("");
      setMessage("");
      setType("system");
      onClose();
    } catch {
      addToast("Failed to send notification", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Broadcast Notification" maxWidth="560px">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Emergency response drill scheduled"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Message *</label>
          <textarea
            required
            rows={4}
            placeholder="Write the notification message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#94A3B8" }}>
            Notification is delivered to your notification inbox and the backend audit stream.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
          >
            {isSubmitting ? "Sending..." : "Send Notification"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SendNotificationModal;
