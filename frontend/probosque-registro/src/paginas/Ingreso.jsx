import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CLAVE_DEMO, CUENTAS_DEMO, INICIO_DE_ROL, NOMBRE_ROL, ROLES } from "../datos/usuarios";
import { useSesion } from "../estado/Sesion";
import "./Ingreso.css";

// Inicio de sesión. Según el rol de la cuenta, la app muestra unas pantallas u otras.
// Las personas solicitantes crean su cuenta aquí mismo; el personal entra con cuentas ya dadas de alta.
export default function Ingreso() {
  const { usuario, ingresar, crearCuenta } = useSesion();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const volver = parametros.get("volver"); // pantalla que pidió iniciar sesión (por ejemplo el registro)

  const [modo, setModo] = useState("entrar"); // "entrar" | "crear"
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const destino = (u) => (volver && u.rol === ROLES.SOLICITANTE ? volver : INICIO_DE_ROL[u.rol]);

  // Con sesión abierta no tiene sentido ver el formulario
  if (usuario) return <Navigate to={destino(usuario)} replace />;

  const intentar = async (accion) => {
    setEnviando(true);
    setError("");
    try {
      navegar(destino(await accion()), { replace: true });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  const enviar = (e) => {
    e.preventDefault();
    intentar(() => (modo === "crear" ? crearCuenta({ nombre, correo, clave }) : ingresar(correo, clave)));
  };

  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setError("");
  };

  return (
    <div className="app-pagina ingreso">
      <section className="app-panel ingreso-formulario">
        <h1 className="app-titulo">{modo === "crear" ? "Crea tu cuenta" : "Inicia sesión"}</h1>
        <p className="app-entrada">
          {modo === "crear"
            ? "Con tu cuenta registras solicitudes y sigues su avance. Usa el correo donde quieres recibir las notificaciones."
            : volver
              ? "Para registrarte a una convocatoria primero entra con tu cuenta."
              : "Entra con tu cuenta para ver tus solicitudes o tu bandeja de trabajo."}
        </p>

        <form onSubmit={enviar}>
          {modo === "crear" && (
            <div className="app-campo">
              <label htmlFor="ingreso-nombre">Nombre completo</label>
              <input id="ingreso-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
            </div>
          )}
          <div className="app-campo">
            <label htmlFor="ingreso-correo">Correo electrónico</label>
            <input
              id="ingreso-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="app-campo">
            <label htmlFor="ingreso-clave">Contraseña</label>
            <input
              id="ingreso-clave"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              minLength={modo === "crear" ? 8 : undefined}
              autoComplete={modo === "crear" ? "new-password" : "current-password"}
            />
            {modo === "crear" && <small>Mínimo 8 caracteres.</small>}
          </div>

          {error && <p className="ingreso-error" role="alert">{error}</p>}

          <button type="submit" className="app-boton app-boton--primario" disabled={enviando}>
            {enviando ? "Entrando..." : modo === "crear" ? "Crear cuenta y entrar" : "Entrar"}
          </button>
        </form>

        <p className="ingreso-cambio">
          {modo === "crear" ? "¿Ya tienes cuenta? " : "¿Eres solicitante y no tienes cuenta? "}
          <button type="button" className="app-enlace" onClick={() => cambiarModo(modo === "crear" ? "entrar" : "crear")}>
            {modo === "crear" ? "Inicia sesión" : "Crea tu cuenta"}
          </button>
        </p>
      </section>

      <aside className="ingreso-demo" aria-labelledby="ingreso-demo-titulo">
        <h2 id="ingreso-demo-titulo">Cuentas de demostración</h2>
        <p>
          Personal de PROBOSQUE. Todas usan la contraseña <code>{CLAVE_DEMO}</code>. Cada cuenta abre solo las
          pantallas de su rol.
        </p>
        <ul>
          {CUENTAS_DEMO.map((cuenta) => (
            <li key={cuenta.correo}>
              <div>
                <strong>{cuenta.delegacion ? `Delegación ${cuenta.delegacion}` : NOMBRE_ROL[cuenta.rol]}</strong>
                <span>{cuenta.correo}</span>
              </div>
              <button
                type="button"
                className="app-boton ingreso-demo-boton"
                disabled={enviando}
                onClick={() => intentar(() => ingresar(cuenta.correo, CLAVE_DEMO))}
              >
                Entrar
              </button>
            </li>
          ))}
        </ul>
        <p className="ingreso-nota">
          Prototipo: el backend todavía no tiene autenticación, así que estas cuentas y las de solicitantes se
          validan en el navegador.
        </p>
      </aside>
    </div>
  );
}
