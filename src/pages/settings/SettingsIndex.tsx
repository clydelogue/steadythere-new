import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to organization settings by default
const SettingsIndex = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/settings/organization', { replace: true });
  }, [navigate]);

  return null;
};

export default SettingsIndex;
