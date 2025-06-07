import React from "react";
import Input from "../components/Input";
import { useForm } from "../hook/useForm";
import { Global } from "../helpers/Global";

const RegisterGuard = () => {
  const { form, changed } = useForm({});
  //onst [saved, setSaved] = useState({});

  const saveUser = async (e) => {
    // no Atualizar la recarga de pantalla
    e.preventDefault();
    let newUser = form;
    console.log(newUser);

    const request = await fetch(Global.url + "guard/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    });
    const data = await request.json();
    console.log(data);

    // if (data.status === "success") {
    //   setSaved("saved");
    //   console.log("Usuario guardado correctamente", data.user);
    // } else {
    //   setSaved("error");
    //   console.log("Error al guardar el usuario", data.message);
    // }


  };

  return (
    <>
      <div className="w-full md:container md:mx-auto p-8 space-y-6 bg-white rounded-2xl shadow-2xl border-4 border-[#00594e]">
        <h2 className="text-lg font-bold text-center text-[#00594e]">
          Registro de Celador
        </h2>
        <form className="space-y-4" onSubmit={saveUser}>
          <div className="container">
            <Input type="text" placeholder="Nombre" onChange={changed} name="name"/>
          </div>
          <div>
            <Input
              type="email"
              placeholder="Correo Electrónico"
              onChange={changed}
              name="email"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Contraseña"
              onChange={changed}
              name="password"
            />
          </div>
          <input
            type="submit"
            value="Registrar"
            className="w-full p-3 font-bold text-white bg-[#00594e] rounded-lg hover:bg-[#004037] focus:outline-none focus:ring-2 focus:ring-[#00594e] shadow-lg hover:shadow-xl"
          />
        </form>
      </div>
    </>
  );
};

export default RegisterGuard;
