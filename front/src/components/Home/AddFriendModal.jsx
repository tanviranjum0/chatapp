import {
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalBody,
  ModalContent,
  ModalCloseButton,
  Button,
  ModalFooter,
  Heading,
} from "@chakra-ui/react";
import TextField from "../login/TextField";
import * as yup from "yup";
import { FriendContext } from "./Home";
import socket from "../../socket";
import { Formik, Form } from "formik";
import { useCallback, useContext, useState } from "react";

const AddFriendModal = ({ onClose, isOpen }) => {
  const [error, setError] = useState("");
  const closeModal = useCallback(() => {
    onClose();
    setError("");
  }, [onClose]);
  const { setFriendList } = useContext(FriendContext);
  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Friend</ModalHeader>
        <ModalCloseButton />
        <Formik
          initialValues={{ friendName: "" }}
          validationSchema={yup.object({
            friendName: yup
              .string()
              .required("Friend's username is required")
              .max(28, "Invalid Username")
              .min(8, "Invalid Username"),
          })}
          onSubmit={(values, actions) => {
            socket.emit(
              "add_friend",
              values.friendName,
              ({ errorMgs, done, newFriend }) => {
                if (done) {
                  setFriendList((prevList) => [newFriend, ...prevList]);
                  closeModal();
                  return;
                }
                setError(errorMgs);
              }
            );
            // onClose();
            actions.resetForm();
          }}
        >
          <Form>
            <ModalBody>
              <Heading
                fontSize={"xl"}
                textAlign={"center"}
                as={"p"}
                color={"red.500"}
              >
                {error}
              </Heading>
              <TextField
                autoComplete="false"
                label="Add Friend"
                name="friendName"
                placeholder="Enter friend's username"
              />
            </ModalBody>
            <ModalFooter>
              <Button type="submit" colorScheme="blue">
                Submit
              </Button>
            </ModalFooter>
          </Form>
        </Formik>
      </ModalContent>
    </Modal>
  );
};
export default AddFriendModal;
