import { Route, Routes } from "react-router-dom";
import Login from "./login/Login";
import Signup from "./login/Signup";
import { Text } from "@chakra-ui/react";
import PrivateRoutes from "./PrivateRoutes";
import { useContext } from "react";
import { AccountContext } from "../AccountContext";
import Home from "./Home/Home";

const Views = () => {
  const { user } = useContext(AccountContext);

  return user.loggedIn === null ? (
    <Text>Loading...</Text>
  ) : (
    <Routes>
      <Route path="/" element={<Login />}></Route>
      <Route path="/register" element={<Signup />}></Route>
      <Route path="*" element={<Login />}></Route>
      <Route element={<PrivateRoutes />}>
        <Route path="/home" element={<Home></Home>}></Route>
      </Route>
    </Routes>
  );
};

export default Views;
