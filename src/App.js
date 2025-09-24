import React, { useState, useEffect } from 'react';
import Login from './LoginSignUp/Login';
import SignUp from './LoginSignUp/SignUp';
import Dashboard from './Initial/Dashboard';
import UserPage from './User/UserPage';
import logo from './images/logo2.jpg';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Spinner from './Essentials/Spinner';

function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLogInClicked, setIsLogInClicked] = useState(false);
  const [isUserLogged, setIsUserLogged] = useState(false);

  const [loadSpinner, setLoadSpinner] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  // const [userLoginDetails, setUserLoginDetails] = useState([]);

  useEffect(() => {
      const token = localStorage.getItem("token");
      if (token) {
        setIsUserLogged(true);
      }
  }, []);

  const handleSignUp = () => {
    setIsSignUp(true);
  };

  return (
    <div className="App">
      <div className="header">
        <div className="brand">
          <img className="logo-img" src={logo} alt="logo" />
          <h1 className="header-text">AI-Powered Heritage Guide</h1>
        </div>

        {!isLogInClicked && !isUserLogged &&(
          <button onClick={() => setIsLogInClicked(true)}>Log In</button>
        )}
      </div>

      <ToastContainer
        enableMultiContainer
        containerId="below-header"
        position="top-right"
        toastContainerClassName="below-header-toast"
        style={{ top: "120px", right: "1.5rem" }}
      />

      <div className="app-main-content">
        {!isLogInClicked && !isSignUp && !isUserLogged &&
        <Dashboard />
        }

        {isUserLogged &&
          <UserPage
            justLoggedIn={justLoggedIn}
            setLoadSpinner={setLoadSpinner}
            setJustLoggedIn={setJustLoggedIn}
            setIsUserLogged={setIsUserLogged}
          />
        }
      </div>

      <div className="login-signup">
        {isLogInClicked && !isSignUp && !isUserLogged &&
          <Login
            handleSignUp={handleSignUp}
            setLoadSpinner={setLoadSpinner}
            setJustLoggedIn={setJustLoggedIn}
            setIsUserLogged={setIsUserLogged}
            setIsLogInClicked={setIsLogInClicked}
          />
        }

        {isLogInClicked && isSignUp && !isUserLogged &&
          <SignUp
            setIsSignUp={setIsSignUp}
          />
        }
      </div>
      <ToastContainer />
      {loadSpinner && (
        <Spinner />
      )}
      {!isUserLogged &&
        <div className="logged-out-footer">
          <div className="logo-brand-git">
            <div className="brand-logo">
              <i class="fa-solid fa-gopuram"></i>
              <p>Thamizh Thadam</p>
            </div>
          <a href="https://github.com/nareshjo001/touristGuide"><i className="fa-brands fa-github"></i></a>
          </div>
          <p>THAMIZH THADAM Copyright &copy; {new Date().getFullYear()} Thamizh Thadam - All rights reserved.</p>
        </div>
      }
    </div>
  );
}

export default App;
