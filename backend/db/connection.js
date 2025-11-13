import mysql from "mysql2";

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",        // ⚠️ cambia por tu usuario de MySQL
  password: "",        // ⚠️ agrega tu contraseña si tiene
  database: "prestamos_db",
});

connection.connect((err) => {
  if (err) {
    console.error("Error al conectar con MySQL:", err);
    return;
  }
  console.log(" Conectado a MySQL correctamente.");
});

export default connection;
