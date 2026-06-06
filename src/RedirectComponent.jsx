import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RedirectComponent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/sf/location");
  }, [navigate]);

  return (
    <></>
  );
}

export default RedirectComponent;
