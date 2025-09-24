import React from 'react';

const Placecard = ({place}) => {
    return (
        <div className="place-card">
            {/* Front side box with image and short name */}
            <div className="Box">
                <img src={place.imageUrl} alt="place-image"/>
                <p className="front-place-name">{place.name}</p>
            </div>
             {/* Other side showing full info */}
            <div className= "details">
                <h3 className="place-name">{place.name}</h3>
                <h4 className="place-loc">{place.location}</h4>
                <p className="place-description">{place.description}</p>
            </div>
        </div>
    )
}

export default Placecard;