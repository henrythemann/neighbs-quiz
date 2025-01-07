import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RedirectComponent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/sf/location");
  }, []);

  return (
    <></>
  );
}

export default RedirectComponent;