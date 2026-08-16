import React, { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "550px",
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "12px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          width: "min(100%, calc(100vw - 24px))",
          maxWidth: maxWidth,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#F8FAFC",
            gap: "12px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
              color: "#0F172A",
              wordBreak: "break-word",
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748B",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              flexShrink: 0,
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            flex: 1,
            wordBreak: "break-word",
          }}
        >
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #E2E8F0",
              background: "#F8FAFC",
              display: "flex",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
