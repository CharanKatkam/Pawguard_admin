import { useState } from "react";
import Modal from "../common/Modal";
import { useToast } from "../../context/ToastContext";
import notificationService from "../../services/notificationService";
import { notifyDataChanged } from "../../utils/dataSync";

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleOptions = [
  { value: "super_admin", label: "Super Admins" },
  { value: "rescue_centre_admin", label: "Rescue Centre Admins" },
  { value: "rescue_coordinator", label: "Rescue Coordinators" },
  { value: "rescue_agent", label: "Rescue Agents" },
  { value: "veterinarian", label: "Veterinarians" },
  { value: "shelter_manager", label: "Shelter Managers" },
  { value: "adoption_coordinator", label: "Adoption Coordinators" },
  { value: "foster_coordinator", label: "Foster Coordinators" },
  { value: "volunteer_coordinator", label: "Volunteer Coordinators" },
  { value: "inventory_manager", label: "Inventory Managers" },
  { value: "finance_user", label: "Finance Users" },
];

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
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
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
        targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
      });
      addToast("Notification broadcast sent", "success");
      notifyDataChanged();
      setTitle("");
      setMessage("");
      setType("system");
      setTargetRoles([]);
      onClose();
    } catch {
      addToast("Failed to send notification", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Target Roles {targetRoles.length > 0 ? `(${targetRoles.length})` : ""}
            </label>
            <div
              style={{
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "8px 10px",
                maxHeight: "140px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {roleOptions.map((o) => (
                <label key={o.value} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(o.value)}
                    onChange={() => toggleRole(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#94A3B8" }}>
              Leave empty to send to all users.
            </p>
          </div>
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
