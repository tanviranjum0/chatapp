import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import { Field, useField } from "formik";

const TextField = ({ label, ...props }) => {
  const [field, meta] = useField(props);
  return (
    <div>
      <FormControl isInvalid={meta.touched && meta.error}>
        <FormLabel>{label}</FormLabel>
        <Input as={Field} {...field} {...props}></Input>
        <FormErrorMessage>{meta.error}</FormErrorMessage>
      </FormControl>
    </div>
  );
};

export default TextField;
