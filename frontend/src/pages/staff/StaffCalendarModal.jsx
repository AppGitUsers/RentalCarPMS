import Modal from '../../components/ui/Modal';
import StaffCalendar from './StaffCalendar';

export default function StaffCalendarModal({ open, onClose, staffMember }) {
  if (!staffMember) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${staffMember.full_name} — Attendance Calendar`}
      size="xl"
    >
      <StaffCalendar staffMember={staffMember} />
    </Modal>
  );
}
