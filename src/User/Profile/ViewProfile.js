import React, { useState, useEffect } from 'react';
import Spinner from '../../Essentials/Spinner';

const ViewProfile = ({ setProfileSet, setViewProfile, profileUpdated, token }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const startTime = Date.now();

      try {
        const response = await fetch('http://localhost:5000/api/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          console.error('Failed to fetch profile');
        }
      } catch (error) {
        console.error('Network error:', error);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 3000 - elapsed);
        setTimeout(() => setLoading(false), remaining);
      }
    };

    fetchProfile();
  }, [token, profileUpdated]);

  const handleEditClick = () => {
    setProfileSet(true);
    setViewProfile(false);
  };

  if (loading) {
    return <Spinner />;
  }

  if (!profile) {
    return <div className='profile-card'>No profile data available.</div>;
  }

  return (
    <div className="profile-card">
      <h2>My Profile</h2>
      <p><strong>Name:</strong> {profile.user.firstName} {profile.user.lastName}</p>
      <p><strong>Email:</strong> {profile.user.email}</p>
      <p><strong>Phone:</strong> {profile.phone || 'N/A'}</p>
      <p><strong>Age:</strong> {profile.age || 'N/A'}</p>
      <p><strong>Gender:</strong> {profile.gender || 'N/A'}</p>
      <p><strong>Hometown:</strong> {profile.hometown || 'N/A'}</p>
      <p><strong>Interests:</strong> {profile.interests || 'N/A'}</p>
      <button onClick={handleEditClick}>Edit</button>
    </div>
  );
};

export default ViewProfile;
