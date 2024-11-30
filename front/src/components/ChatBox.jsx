import { Form, Formik, Field } from "formik";
import { useContext } from "react";
import { MessagesContext, FriendContext } from "./Home/Home";
import * as yup from "yup";
import { HStack, Input, Button } from "@chakra-ui/react";
import socket from "../socket";
const ChatBox = () => {
  const { setMessages } = useContext(MessagesContext);
  const { friendList, friendIndex } = useContext(FriendContext);
  return (
    <Formik
      initialValues={{ message: "" }}
      validationSchema={yup.object({
        message: yup
          .string()
          .min(1)
          .max(255)
          .required("Please enter a message"),
      })}
      onSubmit={(values, actions) => {
        const message = {
          to: friendList[friendIndex].userid,
          from: null,
          content: values.message,
        };
        socket.emit("dm", message);
        setMessages((prev) => [message, ...prev]);
        actions.resetForm();
      }}
    >
      <HStack as={Form} w="100%">
        <Input
          as={Field}
          placeholder="Type message here"
          size="lg"
          px="1rem"
          py="1rem"
          name="message"
          autoComplete="off"
          mx="1rem"
          my="1rem"
        />
        <Button type="submit" size="lg" colorScheme="teal">
          Send
        </Button>
      </HStack>
    </Formik>
  );
};
export default ChatBox;
