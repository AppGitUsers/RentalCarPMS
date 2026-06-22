import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function SessionExpiredModal() {
  const { sessionExpired, setSessionExpired } = useAuth();
  const navigate = useNavigate();

  if (!sessionExpired) return null;

  const handleReLogin = () => {
    setSessionExpired(false);
    navigate('/login', { replace: true });
  };

  return (
    <Modal open={sessionExpired} onClose={handleReLogin} title="Session Expired">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-sm text-navy-600 mb-5">
          For security, you've been signed out after 24 hours. Please sign in again to continue.
        </p>
        <Button onClick={handleReLogin} className="w-full">Sign In Again</Button>
      </div>
    </Modal>
  );
}
