// src/pages/Home.tsx
import { useState } from 'react';

const Home = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError(null);
      },
      (err) => {
        setError('Failed to get location: ' + err.message);
        setLocation(null);
      }
    );
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>📍 Get My Location sai satish</h1>
      <button onClick={handleGetLocation} style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
        Get Location
      </button>

      {location && (
        <div>
          <p>Latitude: {location.lat}</p>
          <p>Longitude: {location.lng}</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Home;
