import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Are you sure?', description, confirmLabel = 'Confirm',
  variant = 'danger', loading,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && <p className="text-sm text-navy-500">{description}</p>}
      <div className="flex items-center justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
