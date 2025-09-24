import React from 'react';
import banner from '../images/heritage4.jpg';
import RecentlyVisited from './RecentlyVisited';
import heritagePlaces from '../Essentials/HeritagePlaces';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const UserDashBoard = () => {

    // Settings for react-slick carousel
    const settings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 4,
        arrows: true,
        };

    return (
        <div className="user-dashboard">

            {/* Hero banner section with site slogan and info */}
            <div className="hero-section">
                <img src={banner} alt="site-banner" />
                <p className="slogan">Uncover the history behind every stone.</p>
                <div className="site-info">
                    <p>Browse 100+ heritage places, plan visits, and get AI-powered recommendations.</p>
                    <p>Know the history of heritage places in and around you</p>
                    <p>Save your favorite places, see nearby attractions, and never miss a festival!</p>
                </div>
            </div>

            {/* Recently Visited section */}
            <h3>Recently Visited</h3>
            <p className="swipe-hint">← Swipe to see more →</p>
            <div className="user-dashboard-main">
                <Slider {...settings}>
                    {heritagePlaces.map((place, index) => (
                        <RecentlyVisited key={index} place={place} />
                    ))}
                </Slider>
            </div>
        </div>
    )
}

export default UserDashBoard;