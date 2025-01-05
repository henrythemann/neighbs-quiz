import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { geolocated, GeolocatedProps } from 'react-geolocated';
import { insidePolygon, toLatLon } from 'geolocation-utils';
import data from '../data.json';
import MapPage from '../MapPage';
import { MapContainer } from '../MapContainer';

function PleaseEnableGeo() {
  return <div>
    <span>Please enable geolocation to find your location in the city.</span>
  </div>
}

function CurrentNeighb({ neighb }: { neighb: string }) {
  return <div>
    <span>Current neighborhood {neighb}</span>
  </div>
}

function GeolocationIsNotEnabled() {
  return (<div>
    <span>Geolocation is not available.</span>
  </div>)
}

function Geolocated(props: any) {
  const params: any = useParams();
  const isQuiz = params && params.quiz === 'quiz';
  const mapName = params && params.map ? params.map : 'map';
  const [userNeighb, setUserNeighb] = useState<string>();
  const { latitude: lat, longitude: lon, accuracy } = props.coords || {};
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
  const { isGeolocationEnabled, isGeolocationAvailable } = props;
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
        {(props: any) => <MapPage {...{ ...props, isQuiz, mapName, location: { lat, lon, accuracy }, userNeighb }} />}
      </MapContainer>
    </div>
  );
}


const Geo = geolocated({
  positionOptions: {
    enableHighAccuracy: true,
  },
  watchPosition: true,
  userDecisionTimeout: 5000,
})(Geolocated);


export default Geo
