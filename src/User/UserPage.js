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
  // State to manage profile navigation, dashboard, chat, and user info
  const [changeProfileBtn, setChangeProfileBtn] = useState(false);
  const [isProfileSet, setIsProfileSet] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [viewProfile, setViewProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [aiData, setAiData] = useState('');

  const token = localStorage.getItem('token'); // JWT token for API calls

  // Show welcome toast on first login
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

  // Show toast for successful logout
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

  // Navigation handlers
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
    localStorage.removeItem('token'); // Clear token on logout
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

  // Fetch user profile on component mount or token change
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

      {/* Hamburger menu button */}
      <button className="menu" onClick={() => setIsNavOpen(!isNavOpen)}>
        <img src={menu} alt="hamburger-menu" />
      </button>

      {/* Backdrop when nav is open */}
      {isNavOpen && <div className="backdrop" onClick={() => setIsNavOpen(false)}></div>}

      {/* Side navigation panel */}
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

        {/* Logout button */}
        <div className="logout-btn-icon">
          <button className="logout-btn item-btn" onClick={handleLogoutClick}>Log Out</button>
          <img src={logoutIcon} alt="logout-icon"/>
        </div>
      </div>

      {/* Main content area */}
      <div className="user-page-main">

        {/* Render profile setup form */}
        {isProfileSet &&
          <SetProfile
            setProfileSet={setIsProfileSet}
            setViewProfile={setViewProfile}
            setProfileUpdated={setProfileUpdated}
            token={token}
          />
        }

        {/* Render user dashboard */}
        {dashboardOpen &&
          <UserDashBoard />
        }

        {/* Render view profile */}
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

      {/* Split section for chatbot and info */}
      <div className="user-page-main-split">
        {/* Left: Chatbot */}
        {isChatOpen && (
          <div className="chatbot-left">
            <Chatbot setAiData={setAiData} />
          </div>
        )}

        {/* Right: Info Section */}
        <div className="info-right">
          {/* Top curtain image */}
          <div className="info-bg">
            <img 
              src={require('../images/curtain2.jpg')} 
              alt="Curtain Background" 
              className="info-bg-img" 
            />
          </div>

          {/* AI content below the curtain */}
          <div className="info-content">
            {aiData ? (
              <div>
                <h2>{aiData.place}</h2>

                {aiData.overviewContent && <p>{aiData.overviewContent}</p>}

                {aiData.history && (
                  <ul>
                    {aiData.history.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}

                {aiData.festivals && (
                  <ul>
                    {aiData.festivals.map((f, index) => (
                      <li key={index}>
                        <strong>{f.name}</strong> ({f.period}): {f.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p>Ask about Overview, History, or Festivals to see details here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;