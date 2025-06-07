import { useState } from "react";
import Input from "./Input";
import { useForm } from "../hook/useForm";

const LoginForm = () => {
  const { form, changed } = useForm();

  const loginUser = async (e) => {
    e.preventDefault();
    let userToLogin = form;
    console.log(loginUser);
    console.log(form); 


    // console.log(userToLogin);


    // const request = await fetch("http://localhost:3000/api/guard/login", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(userToLogin),
    // });
    // const data = await request.json();
    // console.log(data);

  
    
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-2xl border-4 border-[#00594e]">
      <h2 className="text-2xl font-bold text-center text-[#00594e]">
        Iniciar sesión
      </h2>
      <form className="space-y-4" onSubmit={loginUser}>
        <Input
          type="email"
          
          onChange={changed}
          placeholder="Correo Electrónico"
        />
        <Input
          type="password"
          
          onChange={changed}
          placeholder="Contraseña"
        />
        <button
          type="submit"
          className="w-full p-3 font-bold text-white bg-[#00594e] rounded-lg hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] shadow-lg"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
