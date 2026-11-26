import { createContext, useContext, useState } from "react";
import { CLAVE_DEMO, CUENTAS_DEMO, ROLES } from "../datos/usuarios";

// Sesión del usuario: quién entró y con qué rol.
// Es el ÚNICO archivo que sabe cómo se valida un usuario. Hoy lo hace en el navegador
// (el backend no tiene autenticación); cuando exista /api/login/ se cambian ingresar()
// y crearCuenta() por llamadas a la API y el resto de la app no se entera.

const LLAVE_SESION = "probosque.sesion";
const LLAVE_CUENTAS = "probosque.cuentas"; // cuentas de solicitantes creadas en este navegador

const leer = (llave, porOmision) => {
  try {
    return JSON.parse(localStorage.getItem(llave)) ?? porOmision;
  } catch {
    return porOmision;
  }
};

const mismoCorreo = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// La contraseña no se guarda tal cual: se guarda su huella SHA-256
async function huella(texto) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

const Contexto = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(() => leer(LLAVE_SESION, null));

  const abrir = (cuenta) => {
    // En la sesión solo va lo que las pantallas necesitan, nunca la contraseña
    const sesion = { correo: cuenta.correo, nombre: cuenta.nombre, rol: cuenta.rol, delegacion: cuenta.delegacion };
    localStorage.setItem(LLAVE_SESION, JSON.stringify(sesion));
    setUsuario(sesion);
    return sesion;
  };

  const acciones = {
    // Devuelve el usuario o lanza un Error con el mensaje para la pantalla
    async ingresar(correo, clave) {
      const demo = CUENTAS_DEMO.find((c) => mismoCorreo(c.correo, correo));
      if (demo) {
        if (clave !== CLAVE_DEMO) throw new Error("Contraseña incorrecta.");
        return abrir(demo);
      }
      const cuenta = leer(LLAVE_CUENTAS, []).find((c) => mismoCorreo(c.correo, correo));
      if (!cuenta) throw new Error("No hay una cuenta con ese correo. Revisa el correo o crea tu cuenta.");
      if (cuenta.clave !== (await huella(clave))) throw new Error("Contraseña incorrecta.");
      return abrir({ ...cuenta, rol: ROLES.SOLICITANTE });
    },

    // Solo las personas solicitantes crean su cuenta; el personal usa cuentas ya dadas de alta
    async crearCuenta({ nombre, correo, clave }) {
      const cuentas = leer(LLAVE_CUENTAS, []);
      const ocupado =
        cuentas.some((c) => mismoCorreo(c.correo, correo)) || CUENTAS_DEMO.some((c) => mismoCorreo(c.correo, correo));
      if (ocupado) throw new Error("Ya existe una cuenta con ese correo. Inicia sesión.");
      if (clave.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
      const cuenta = { nombre: nombre.trim(), correo: correo.trim().toLowerCase(), clave: await huella(clave) };
      localStorage.setItem(LLAVE_CUENTAS, JSON.stringify([...cuentas, cuenta]));
      return abrir({ ...cuenta, rol: ROLES.SOLICITANTE });
    },

    salir() {
      localStorage.removeItem(LLAVE_SESION);
      setUsuario(null);
    },
  };

  return <Contexto.Provider value={{ usuario, ...acciones }}>{children}</Contexto.Provider>;
}

export const useSesion = () => useContext(Contexto);
