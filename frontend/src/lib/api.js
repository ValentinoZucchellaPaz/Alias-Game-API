import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true, // importante para que se envíe la cookie HTTP-only
});

export default api;
