import React, { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext();

function readStoredUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.role !== 'string') {
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }){
  const [stateUser, setUser] = useState(readStoredUser());

  async function login(email, password){
    const res = await api.post('/auth/login', { email, password });
    const payloadUser = res.data.user || res.data.u || null;
    localStorage.setItem('token', res.data.token);
    if (payloadUser) {
      localStorage.setItem('user', JSON.stringify(payloadUser));
      setUser(payloadUser);
    } else {
      localStorage.removeItem('user');
      setUser(null);
    }
    return payloadUser;
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
