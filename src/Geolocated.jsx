import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGeolocated } from "react-geolocated";
import { insidePolygon, toLatLon } from 'geolocation-utils';
import data from './data.json';
import MapPage from './MapPage';
import { MapContainer } from './MapContainer';

function PleaseEnableGeo() {
  return <div>
    <span>Please enable geolocation to find your location in the city.</span>
  </div>
}

function CurrentNeighb({ neighb }) {
  return <div>
    <span>Current neighborhood {neighb}</span>
  </div>
}

function GeolocationIsNotEnabled() {
  return (<div>
    <span>Geolocation is not available.</span>
  </div>)
}

const Geolocated = (props) => {
  const { coords, isGeolocationAvailable, isGeolocationEnabled } =
    useGeolocated({
      positionOptions: {
        enableHighAccuracy: false,
      },
      userDecisionTimeout: 5000,
    });
  const { latitude: lat, longitude: lon, accuracy } = coords || {};
  const params = useParams();
  const isQuiz = params && params.quiz === 'quiz';
  const mapName = params && params.map ? params.map : 'map';
  const [userNeighb, setUserNeighb] = useState('');
  useEffect(
    () => {
      if (lat && lon) {
        const neighb = data.find((d) => insidePolygon(
          toLatLon({ lat, lon }),
          d['the_geom'].map(([lat, lon]) => ({ lat, lon })))
        );
        if (neighb) {
          setUserNeighb(neighb.name);
        }
      }
    },
    [lat, lon]
  );
  return (
    <div>
      {!isQuiz && (
        <>
          {!isGeolocationEnabled && <PleaseEnableGeo />}
          {!isGeolocationAvailable && <GeolocationIsNotEnabled />}
          {userNeighb && <CurrentNeighb neighb={userNeighb} />}
        </>
      )}
      <MapContainer mapName={mapName}>
        {(props) => <MapPage {...{ ...props, isQuiz, mapName, location: { lat, lon, accuracy }, userNeighb }} />}
      </MapContainer>
    </div>
  );
}

export default Geolocated;