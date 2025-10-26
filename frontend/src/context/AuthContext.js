import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);

  // On app load, check if user info is in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }
  }, []);

  // Login function (to be called from your Login component)
  const login = (userData) => {
    // userData is the object from your /api/users/login response
    localStorage.setItem('userInfo', JSON.stringify(userData));
    setUserInfo(userData);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('userInfo');
    setUserInfo(null);
  };

  return (
    <AuthContext.Provider value={{ userInfo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};