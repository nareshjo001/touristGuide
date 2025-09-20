import React, { useState, useEffect } from 'react';
import menu from '../images/menu.png';
import './UserPage.css';
import UserDashBoard from './UserDashBoard';
import SetProfile from './Profile/SetProfile';
import ViewProfile from './Profile/ViewProfile';
import Chatbot from '../chatbot/chatbot';
import { toast } from 'react-toastify';
import logoutIcon from '../images/user-logout.png';

const UserPage = ({ justLoggedIn, setJustLoggedIn, setIsUserLogged, setLoadSpinner }) => {
  const [changeProfileBtn, setChangeProfileBtn] = useState(false);
  const [isProfileSet, setIsProfileSet] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [viewProfile, setViewProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const token = localStorage.getItem('token'); // Correct location

  const showWelcomeToast = (userName) => {
    toast.dismiss();
    toast.info(
      <div>
        <strong>Welcome {userName}!</strong>
        <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
          Explore Tamil Nadu’s rich heritage right here...
        </div>
      </div>,
      {
        position: "bottom-left",
        autoClose: 4000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        icon: false,
        style: {
            backgroundColor: "#0056b3",
            color: "#ebf4fe",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: "500",
        },
      }
    );
  };

  const logOutSuccessToast = () => {
      toast.dismiss();
      toast.success(
      <div>
        <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
          Logged Out Successfully!
        </div>
      </div>,
      {
        position: "top-right",
        autoClose: 2500,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          backgroundColor: "#d1fae5",
          color: "#065f46",
          borderRadius: "16px",
          fontSize: "1rem",
          fontWeight: "500",
        },
        containerId: "below-header",
      }
    );
  };

  const handleDashboardClick = () => {
    setDashboardOpen(true);
    setIsProfileSet(false);
    setViewProfile(false);
    setIsNavOpen(false);
    setIsChatOpen(false);
  };

  const handleSetProfileClick = () => {
    setChangeProfileBtn(true);
    setIsProfileSet(true);
    setDashboardOpen(false);
    setViewProfile(false);
    setIsNavOpen(false);
    setIsChatOpen(false);
  };

  const handleViewProfileClick = () => {
    setViewProfile(true);
    setIsChatOpen(false);
    setDashboardOpen(false);
    setIsProfileSet(false);
    setIsNavOpen(false);
  };

  const handleLogoutClick = () => {
    localStorage.removeItem('token');
    setIsUserLogged(false);
    logOutSuccessToast();
  }

  const handleChatClick = () => {
    setIsChatOpen(true);
    setIsProfileSet(false);
    setViewProfile(false);
    setIsNavOpen(false);
    setDashboardOpen(false);
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/api/users/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);

            if (justLoggedIn) {
              showWelcomeToast(data.firstName);
            }
          } else {
            localStorage.removeItem('token');
            setIsUserLogged(false);
            console.error('Failed to fetch user profile');
          }
        } catch (error) {
          console.error('Network error:', error);
          setIsUserLogged(false);
        }
      } else {
        setIsUserLogged(false);
      }
    };
    fetchUserProfile();

    if (justLoggedIn) {
      setJustLoggedIn(false);
    }
  }, [justLoggedIn, setIsUserLogged, token]);

  return (
    <div className="userpage">
      <button className="menu" onClick={() => setIsNavOpen(!isNavOpen)}>
        <img src={menu} alt="hamburger-menu" />
      </button>

      {isNavOpen && <div className="backdrop" onClick={() => setIsNavOpen(false)}></div>}

      <div className={`nav-board ${isNavOpen ? 'open' : ''}`}>
        <ul className="items">
          <li><button className="item-btn" onClick={handleDashboardClick}>Dashboard</button></li>
          {!changeProfileBtn ? (
            <li><button className="item-btn" onClick={handleSetProfileClick}>Set Your Profile</button></li>
          ) : (
            <li><button className="item-btn" onClick={handleViewProfileClick}>View Profile</button></li>
          )}
          <li><button className="item-btn" onClick={handleChatClick}>AI Assistant</button></li>
          <li><button className="item-btn">Nearby Places</button></li>
          <li><button className="item-btn">Wish List</button></li>
        </ul>
        <div className="logout-btn-icon">
          <button className="logout-btn item-btn" onClick={handleLogoutClick}>Log Out</button>
          <img src={logoutIcon} alt="logout-icon"/>
        </div>
      </div>

      <div className="user-page-main">

        {isProfileSet &&
          <SetProfile
            setProfileSet={setIsProfileSet}
            setViewProfile={setViewProfile}
            setProfileUpdated={setProfileUpdated}
            token={token}
          />
        }

        {dashboardOpen &&
          <UserDashBoard />
        }

        {viewProfile &&
          <ViewProfile
            setProfileSet={setIsProfileSet}
            setViewProfile={setViewProfile}
            profileUpdated={profileUpdated}
            setLoadSpinner={setLoadSpinner}
            token={token}
          />
        }
      </div>

      <div className="user-page-main-split">
        {/* Left: Chatbot */}
        {isChatOpen && (
          <div className="chatbot-left">
            <Chatbot />
          </div>
        )}

        {/* Right: Info Section */}
        {isChatOpen && (
          <div className="info-right">
            <h2>Info Section Placeholder</h2>
            <p>This section will display relevant information here.</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default UserPage;