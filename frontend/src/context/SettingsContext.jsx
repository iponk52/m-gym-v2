import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [gymSettings, setGymSettings] = useState({
    name: 'M-GYM',
    logo_url: null,
    address: '',
    phone: '',
    email: '',
    about: ''
  });
  const [loading, setLoading] = useState(true);

  // We expose a refetch function in case Settings.jsx updates the data
  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:3000/api/settings`);
      if (res.data) {
        setGymSettings(res.data);
      }
    } catch (error) {
      console.error('Failed to load gym settings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update Favicon and Title dynamically
  useEffect(() => {
    if (gymSettings) {
      if (gymSettings.name) {
        document.title = `${gymSettings.name} Management System`;
      }
      
      if (gymSettings.logo_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = gymSettings.logo_url;
      }
    }
  }, [gymSettings]);

  return (
    <SettingsContext.Provider value={{ gymSettings, fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
