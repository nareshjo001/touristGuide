import React, { useEffect, useState } from 'react';
// import heritagePlaces from '../Essentials/HeritagePlaces';
import Placecard from './Placecard';
import filterByDistricts from '../Essentials/essentials';
import './Dashboard.css';

import { motion } from "framer-motion";

const Dashboard = () => {
  const [filter, setFilter] = useState('default');
  const [heritagePlaces, setHeritagePlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect (() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/places');
        if (!response.ok) {
          throw new Error('Failed to fetch places');
        }
        const data = await response.json();
        setHeritagePlaces(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchPlaces();
  }, []);

  const getFilteredPlaces = () => {
    let filtered = heritagePlaces;

    if (filter === 'District') {
      const grouped = filterByDistricts(filtered);
      return Object.entries(grouped).map(([district, places]) => [
        district,
        places.filter(place =>
          place.name.toLowerCase().startsWith(searchQuery.toLowerCase())
        ),
      ]).filter(([_, places]) => places.length > 0);
    } else if (filter !== 'default') {
      filtered = filtered.filter(place => place.type === filter);
    }

    if (searchQuery) {
      filtered = filtered.filter(place =>
        place.name.toLowerCase().startsWith(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredPlaces = getFilteredPlaces();

  if (loading) {
    return <div className='loading'>Loading...</div>;
  }
  if (error) {
    return <div className='error'>Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">

      <div className="dashboard-header">
        <h3>Heritage Places</h3>

        <div className="filters">
          <input
          type="text"
          className="search"
          placeholder="Search Places"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="dashboard-filter">
            <select className="filter-by" id="filter-by" onChange={(e) => setFilter(e.target.value)}>
              <option value="default">Filter By</option>
              <option value="District">Districts</option>
              <option value="Temple">Temples</option>
              <option value="Palace">Palaces</option>
              <option value="Memorial">Memorials</option>
            </select>
          </div>
        </div>

      </div>

      { filter !== 'District' && filter !== 'default' &&
        <h3 className="filtered-text">Filtered by {filter}</h3>
      }

      <div className="dashboard-main">
        {filter === 'District' ? (
          filteredPlaces.map(([district, groupList]) => (
            <div key={district} className="district-group">
              <h3 className="district-heading">{district}</h3>
              <div className="district-places">
                {groupList.map((place, index) => (
                  <motion.div
                    key={place.name}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.1,
                      ease: [0.25, 1, 0.5, 1]
                    }}
                  >
                    <Placecard place={place} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        ) : (
          filteredPlaces.map((place, index) => (
            <motion.div
              key={place.name}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.25, 1, 0.5, 1]
              }}
            >
              <Placecard place={place} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;