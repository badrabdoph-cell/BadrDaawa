"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

interface AdminActionsProps {
  onDelete?: () => Promise<void>;
  onUpdate?: () => Promise<void>;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onConvert?: () => Promise<void>;
  showDelete?: boolean;
  showUpdate?: boolean;
  showAccept?: boolean;
  showReject?: boolean;
  showConvert?: boolean;
  deleteLabel?: string;
  updateLabel?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  convertLabel?: string;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
}

export function AdminActions({
  onDelete,
  onUpdate,
  onAccept,
  onReject,
  onConvert,
  showDelete = false,
  showUpdate = false,
  showAccept = false,
  showReject = false,
  showConvert = false,
  deleteLabel = "حذف",
  updateLabel = "حفظ",
  acceptLabel = "قبول",
  rejectLabel = "رفض",
  convertLabel = "نشر",
  deleteConfirmTitle = "تأكيد الحذف",
  deleteConfirmMessage = "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
}: AdminActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    try {
      setIsLoading(true);
      setActiveAction(actionName);
      await action();
    } catch (error) {
      console.error(`Error performing ${actionName}:`, error);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await handleAction(onDelete, "delete");
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="admin-actions-group">
        {showUpdate && onUpdate && (
          <button
            className="btn btn-soft"
            onClick={() => handleAction(onUpdate, "update")}
            disabled={isLoading}
            type="button"
          >
            {activeAction === "update" && isLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                جاري...
              </>
            ) : (
              updateLabel
            )}
          </button>
        )}

        {showAccept && onAccept && (
          <button
            className="btn btn-soft"
            onClick={() => handleAction(onAccept, "accept")}
            disabled={isLoading}
            type="button"
          >
            {activeAction === "accept" && isLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                جاري...
              </>
            ) : (
              acceptLabel
            )}
          </button>
        )}

        {showReject && onReject && (
          <button
            className="btn btn-soft"
            onClick={() => handleAction(onReject, "reject")}
            disabled={isLoading}
            type="button"
          >
            {activeAction === "reject" && isLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                جاري...
              </>
            ) : (
              rejectLabel
            )}
          </button>
        )}

        {showConvert && onConvert && (
          <button
            className="btn btn-gold btn-glow"
            onClick={() => handleAction(onConvert, "convert")}
            disabled={isLoading}
            type="button"
          >
            {activeAction === "convert" && isLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                جاري...
              </>
            ) : (
              convertLabel
            )}
          </button>
        )}

        {showDelete && onDelete && (
          <>
            <button
              className="btn btn-soft danger-button"
              onClick={handleDeleteClick}
              disabled={isLoading}
              type="button"
            >
              {activeAction === "delete" && isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  جاري...
                </>
              ) : (
                <>
                  <Trash2 size={17} />
                  {deleteLabel}
                </>
              )}
            </button>

            <ConfirmDialog
              isOpen={showDeleteConfirm}
              title={deleteConfirmTitle}
              message={deleteConfirmMessage}
              confirmText="حذف"
              cancelText="إلغاء"
              isDangerous={true}
              isLoading={activeAction === "delete" && isLoading}
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </>
        )}
      </div>
    </>
  );
}
