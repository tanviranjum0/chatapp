import { VStack, ButtonGroup, Button, Heading, Text } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import TextField from "./TextField";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { useContext, useState } from "react";
import { AccountContext } from "../../AccountContext";
const SignUp = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setUser } = useContext(AccountContext);
  return (
    <Formik
      initialValues={{
        username: "",
        password: "",
      }}
      validationSchema={yup.object({
        username: yup
          .string("Enter a valid username")
          .min(2, "Username must be at least 6 characters long")
          .required("Username is required"),
        password: yup
          .string("Enter a valid password")
          .min(8, "Password must be at least 8 characters long")
          .required("Password is required"),
      })}
      onSubmit={(values, actions) => {
        const vals = { ...values };
        actions.resetForm();
        fetch(`${import.meta.env.VITE_SERVER_URL}/auth/register`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(vals),
        })
          .catch(() => {
            return;
          })
          .then((res) => {
            if (!res || !res.ok || res.status >= 400) {
              return;
            } else {
              res.json();
            }
          })
          .then((data) => {
            if (!data) {
              return;
            }
            setUser({ ...data });
            if (data.status) {
              setError(data.status);
            } else if (data.loggedIn) {
              navigate("/home");
            }
          });
      }}
    >
      {(formik) => (
        <VStack
          onSubmit={formik.handleSubmit}
          w={{ base: "90%", md: "500px" }}
          m={"auto"}
          justify={"center"}
          h={"100vh"}
          spacing={"1rem"}
          as={Form}
        >
          <Heading>Log In</Heading>
          <Text as={"p"} color={"red.500"}>
            {error}
          </Text>
          <TextField
            name="username"
            placeContent={"Enter Username"}
            label={"Username"}
          ></TextField>
          <TextField
            name="password"
            label={"Password"}
            placeContent={"Enter password"}
          ></TextField>

          <ButtonGroup>
            <Button colorScheme="teal" type="submit">
              Create Account
            </Button>
            <Button onClick={() => navigate("/")} leftIcon={<ArrowBackIcon />}>
              Back
            </Button>
          </ButtonGroup>
        </VStack>
      )}
    </Formik>
  );
};

export default SignUp;
