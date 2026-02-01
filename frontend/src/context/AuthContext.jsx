import React, { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext();

export function AuthProvider({ children }){
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(localStorage.getItem('user')) : null;
  const [stateUser, setUser] = useState(user);

  async function login(email, password){
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user: stateUser, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(){
  return useContext(AuthContext);
}

export default AuthContext;
