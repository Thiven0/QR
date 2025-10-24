import { useState } from 'react';

export const useForm = (initialValues = {}) => {
  const [form, setForm] = useState(initialValues);

  const handleChange = ({ target }) => {
    const { name, value } = target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const reset = (nextValues = initialValues) => {
    setForm(nextValues);
  };

  return { form, setForm, handleChange, reset };
};
