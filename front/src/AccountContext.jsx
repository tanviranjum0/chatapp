import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AccountContext = createContext();
const USerContext = ({ children }) => {
  const [user, setUser] = useState({ loggedIn: false });
  const navigate = useNavigate();
  useEffect(() => {
    fetch(`${import.meta.env.VITE_SERVER_URL}/auth/login`, {
      method: "GET",
      credentials: "include",
    })
      .catch((err) => console.log(err))
      .then((res) => {
        if (!res || !res.ok || res.status > 400) {
          setUser({ loggedIn: false });

          return;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) {
          setUser({ loggedIn: false });
        }
        navigate("/home");

        setUser({ ...data });
      });
  }, []);
  return (
    <AccountContext.Provider value={{ user, setUser }}>
      {children}
    </AccountContext.Provider>
  );
};

export default USerContext;
